// ai/answer.ts - Finalize & emit (one function to rule them all)

import {
	CascadeResult,
	WriterOutput,
	CriticReport,
	ClarifyUI,
	EscalatedResponse,
	GuardFailure,
} from './types';
import { FactPack } from '../factPack';
import { MiniWriter } from './miniWriter';
import { MiniCritic } from './miniCritic';
import { ProImprover } from './proImprover';
import { decide, isHighStakesQuery } from './cascade';
import { guardNumbers, guardTimeStamp, guardClaims } from './guards';
import {
	toClarifyUI,
	createClarificationFromGuard,
	createClarificationFromCritic,
} from './ui/clarify';
import { MockApiService } from './mockApiService';

export interface AnswerWithCascadeArgs {
	userId: string;
	intent: string;
	userQuery: string;
	factPack: FactPack;
}

export class CascadeOrchestrator {
	private miniWriter: MiniWriter;
	private miniCritic: MiniCritic;
	private proImprover: ProImprover;
	private apiService: MockApiService;

	constructor(apiService?: MockApiService) {
		this.apiService = apiService || new MockApiService();
		this.miniWriter = new MiniWriter(this.apiService);
		this.miniCritic = new MiniCritic(this.apiService);
		this.proImprover = new ProImprover(this.apiService);
	}

	/**
	 * Execute the complete cascade: Writer → Checker → Improver
	 */
	async answerWithCascade(args: AnswerWithCascadeArgs): Promise<CascadeResult> {
		const startTime = Date.now();
		let writerTokens = 0;
		let criticTokens = 0;
		let improverTokens = 0;
		let guardFailures: GuardFailure[] = [];

		try {
			// Check if this should bypass the Writer and go straight to Pro
			if (isHighStakesQuery(args.userQuery)) {
				console.log(
					'🔍 [Cascade] High-stakes query detected, bypassing Writer'
				);
				return await this.handleHighStakesQuery(args);
			}

			// Step 1: Mini Writer
			console.log('🔍 [Cascade] Step 1: Mini Writer');
			const writer = await this.miniWriter.generateResponse(
				args.userQuery,
				args.factPack,
				args.intent
			);
			writerTokens = this.estimateTokens(writer.answer_text);

			// Step 2: Guards (before critic)
			console.log('🔍 [Cascade] Step 2: Running guards');
			const guards = [
				guardNumbers(writer, args.factPack),
				guardTimeStamp(writer, args.factPack),
				guardClaims(writer),
			];

			const failed = guards.filter((g) => !g.ok);
			guardFailures = failed.flatMap((g) => g.failures);

			if (guardFailures.length > 0) {
				console.log('🔍 [Cascade] Guards failed:', guardFailures);
			}

			// Step 3: Mini Critic (only if writer didn't already request clarification)
			let critic: CriticReport;
			if (writer.requires_clarification) {
				console.log(
					'🔍 [Cascade] Writer requested clarification, skipping critic'
				);
				critic = {
					ok: false,
					issues: [{ type: 'ambiguity', note: 'writer asked to clarify' }],
					risk: 'low',
					recommend_escalation: false,
				};
			} else {
				console.log('🔍 [Cascade] Step 3: Mini Critic');
				critic = await this.miniCritic.reviewResponse(
					writer,
					args.factPack,
					args.userQuery
				);
				criticTokens = this.estimateTokens(JSON.stringify(critic));
			}

			// Step 4: Decide
			console.log('🔍 [Cascade] Step 4: Decision logic');
			const decision = decide(writer, critic, args.factPack);
			console.log('🔍 [Cascade] Decision:', decision);

			// Step 5: Execute path
			if (decision.path === 'return') {
				return this.finalizeForUI(writer, args.factPack, {
					writerTokens,
					criticTokens,
					guardFailures,
					decision_path: 'return',
				});
			}

			if (decision.path === 'clarify') {
				return this.handleClarification(writer, critic, guardFailures, {
					writerTokens,
					criticTokens,
					decision_path: 'clarify',
					decision_reason: decision.reason,
				});
			}

			// Escalate to Pro Improver
			console.log('🔍 [Cascade] Step 5: Pro Improver escalation');
			const improved = await this.proImprover.improveResponse(
				writer,
				critic,
				args.factPack,
				args.userQuery
			);
			improverTokens = this.estimateTokens(improved.answer_text);

			// Re-run guards once more to be safe
			const postGuards = [
				guardNumbers(improved, args.factPack),
				guardClaims(improved),
			];

			if (postGuards.some((g) => !g.ok)) {
				console.log(
					'🔍 [Cascade] Post-improvement guards failed, using safe template'
				);
				return this.createSafeTemplate(args.factPack, args.intent, {
					writerTokens,
					criticTokens,
					improverTokens,
					guardFailures: postGuards.flatMap((g) => g.failures),
					decision_path: 'escalate_fallback',
					decision_reason: 'post_improvement_guards_failed',
				});
			}

			return this.finalizeForUI(improved, args.factPack, {
				writerTokens,
				criticTokens,
				improverTokens,
				guardFailures,
				decision_path: 'escalate',
				decision_reason: decision.reason,
			});
		} catch (error) {
			console.error('🔍 [Cascade] Cascade failed:', error);

			// Return safe fallback
			return this.createSafeTemplate(args.factPack, args.intent, {
				writerTokens,
				criticTokens,
				improverTokens,
				guardFailures,
				decision_path: 'error_fallback',
				decision_reason: 'cascade_error',
			});
		}
	}

	/**
	 * Handle high-stakes queries that bypass the Writer
	 */
	private async handleHighStakesQuery(
		args: AnswerWithCascadeArgs
	): Promise<CascadeResult> {
		console.log('🔍 [Cascade] Handling high-stakes query with Pro Improver');

		// Create a minimal writer output for the improver
		const minimalWriter: WriterOutput = {
			version: '1.0',
			answer_text: `I understand you're asking about ${args.intent
				.toLowerCase()
				.replace(/_/g, ' ')}. This requires careful analysis.`,
			used_fact_ids: [],
			numeric_mentions: [],
			requires_clarification: false,
			content_kind: 'strategy',
			uncertainty_notes: [
				'High-stakes query detected, escalating to Pro model',
			],
		};

		const critic: CriticReport = {
			ok: false,
			issues: [{ type: 'safety', note: 'High-stakes planning detected' }],
			risk: 'high',
			recommend_escalation: true,
		};

		const improved = await this.proImprover.improveResponse(
			minimalWriter,
			critic,
			args.factPack,
			args.userQuery
		);

		return {
			kind: 'escalated',
			data: {
				improved_answer: improved,
				escalation_reason: 'high_stakes_query',
				risk_level: 'high',
			},
			analytics: {
				writer_tokens: 0,
				critic_tokens: 0,
				improver_tokens: this.estimateTokens(improved.answer_text),
				guard_failures: [],
				decision_path: 'high_stakes_bypass',
				decision_reason: 'high_stakes_query',
			},
		};
	}

	/**
	 * Handle clarification requests
	 */
	private handleClarification(
		writer: WriterOutput,
		critic: CriticReport,
		guardFailures: GuardFailure[],
		analytics: any
	): CascadeResult {
		let clarifyUI: ClarifyUI;

		if (guardFailures.length > 0) {
			// Create clarification based on guard failures
			clarifyUI = createClarificationFromGuard(guardFailures, {});
		} else if (critic.issues.length > 0) {
			// Create clarification based on critic issues
			clarifyUI = createClarificationFromCritic(critic.issues, '');
		} else {
			// Use writer's clarification
			clarifyUI = toClarifyUI(writer);
		}

		return {
			kind: 'clarify',
			data: clarifyUI,
			analytics: {
				...analytics,
				decision_path: 'clarify',
				decision_reason: 'requires_clarification',
			},
		};
	}

	/**
	 * Finalize response for UI display
	 */
	private finalizeForUI(
		writer: WriterOutput,
		factPack: FactPack,
		analytics: any
	): CascadeResult {
		// Add time window pill and evidence to the answer
		const timeWindow = `${factPack.time_window.start}–${factPack.time_window.end} (${factPack.time_window.tz})`;
		const evidence = `Based on ${writer.used_fact_ids.length} data points from ${timeWindow}`;

		const finalizedAnswer: WriterOutput = {
			...writer,
			answer_text: `${writer.answer_text}\n\n${evidence}`,
		};

		return {
			kind: 'answer',
			data: finalizedAnswer,
			analytics,
		};
	}

	/**
	 * Create safe deterministic template when all else fails
	 */
	private createSafeTemplate(
		factPack: FactPack,
		intent: string,
		analytics: any
	): CascadeResult {
		const safeAnswer: WriterOutput = {
			version: '1.0',
			answer_text: `I'm experiencing technical difficulties. Please try asking your question again, or check back in a few minutes.`,
			used_fact_ids: [],
			numeric_mentions: [],
			requires_clarification: false,
			content_kind: 'status',
			uncertainty_notes: ['Safe template used due to cascade failure'],
		};

		return {
			kind: 'answer',
			data: safeAnswer,
			analytics,
		};
	}

	/**
	 * Estimate token count for analytics
	 */
	private estimateTokens(text: string): number {
		// Rough estimation: 1 token ≈ 4 characters
		return Math.ceil(text.length / 4);
	}
}

/**
 * Main function to execute the cascade
 */
export async function answerWithCascade(
	args: AnswerWithCascadeArgs
): Promise<CascadeResult> {
	const orchestrator = new CascadeOrchestrator();
	return orchestrator.answerWithCascade(args);
}
