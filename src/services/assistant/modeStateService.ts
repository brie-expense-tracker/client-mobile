// Mode state management service for the AI assistant
// Tracks mode changes, stability, and transition history

export interface ModeTransition {
	from: string;
	to: string;
	timestamp: number;
	reason?: string;
	duration?: number; // Time spent in previous mode
}

export interface ModeState {
	current: string;
	isStable: boolean;
	history: ModeTransition[];
	lastTransitionTime: number;
	consecutiveErrors: number;
}

export interface ModeAnalytics {
	totalTimeInMode: Record<string, number>;
	averageModeDuration: Record<string, number>;
	transitionFrequency: Record<string, number>;
	errorRate: number;
	recoveryCount: number;
}

type ModeStateListener = (state: ModeState) => void;

class ModeStateService {
	private state: ModeState = {
		current: 'idle',
		isStable: true,
		history: [],
		lastTransitionTime: Date.now(),
		consecutiveErrors: 0,
	};

	private listeners: Set<ModeStateListener> = new Set();
	private recoveryAttempts: number = 0;
	private maxRecoveryAttempts: number = 3;
	private persistenceKey: string = 'modeStateService_state';

	// Available modes
	static readonly MODES = {
		IDLE: 'idle',
		THINKING: 'thinking',
		STREAMING: 'streaming',
		COLLECTING_INFO: 'collecting_info',
		PROCESSING: 'processing',
		ERROR: 'error',
		FALLBACK: 'fallback',
	} as const;

	// Mode stability rules
	private static readonly STABLE_MODES = new Set([
		ModeStateService.MODES.IDLE,
		ModeStateService.MODES.ERROR,
		ModeStateService.MODES.FALLBACK,
	]);

	private static readonly TRANSITION_RULES = {
		[ModeStateService.MODES.IDLE]: [
			ModeStateService.MODES.THINKING,
			ModeStateService.MODES.COLLECTING_INFO,
			ModeStateService.MODES.ERROR,
		],
		[ModeStateService.MODES.THINKING]: [
			ModeStateService.MODES.STREAMING,
			ModeStateService.MODES.COLLECTING_INFO,
			ModeStateService.MODES.ERROR,
		],
		[ModeStateService.MODES.STREAMING]: [
			ModeStateService.MODES.IDLE,
			ModeStateService.MODES.ERROR,
		],
		[ModeStateService.MODES.COLLECTING_INFO]: [
			ModeStateService.MODES.PROCESSING,
			ModeStateService.MODES.IDLE,
			ModeStateService.MODES.ERROR,
		],
		[ModeStateService.MODES.PROCESSING]: [
			ModeStateService.MODES.STREAMING,
			ModeStateService.MODES.IDLE,
			ModeStateService.MODES.ERROR,
		],
		[ModeStateService.MODES.ERROR]: [
			ModeStateService.MODES.IDLE,
			ModeStateService.MODES.FALLBACK,
		],
		[ModeStateService.MODES.FALLBACK]: [
			ModeStateService.MODES.IDLE,
			ModeStateService.MODES.ERROR,
		],
	};

	// Subscribe to state changes
	subscribe(listener: ModeStateListener): () => void {
		this.listeners.add(listener);
		// Immediately call with current state
		listener(this.state);

		// Return unsubscribe function
		return () => {
			this.listeners.delete(listener);
		};
	}

	// Get current state
	getState(): ModeState {
		return { ...this.state };
	}

	// Transition to a new mode
	transitionTo(newMode: string, reason?: string): boolean {
		const currentMode = this.state.current;
		const now = Date.now();
		const timeInCurrentMode = now - this.state.lastTransitionTime;

		// Validate transition
		if (!this.isValidTransition(currentMode, newMode)) {
			console.warn(
				`[ModeState] Invalid transition from ${currentMode} to ${newMode}`
			);
			return false;
		}

		// Don't transition if already in the target mode
		if (currentMode === newMode) {
			return true;
		}

		// Create transition record with duration
		const transition: ModeTransition = {
			from: currentMode,
			to: newMode,
			timestamp: now,
			reason,
			duration: timeInCurrentMode,
		};

		// Update state
		const isError = newMode === ModeStateService.MODES.ERROR;
		this.state = {
			current: newMode,
			isStable: ModeStateService.STABLE_MODES.has(newMode as any),
			history: [...this.state.history, transition],
			lastTransitionTime: now,
			consecutiveErrors: isError ? this.state.consecutiveErrors + 1 : 0,
		};

		// Log transition
		console.log(
			`[ModeState] ${currentMode} → ${newMode}${
				reason ? ` (${reason})` : ''
			} (${Math.round(timeInCurrentMode / 1000)}s)`
		);

		// Notify listeners
		this.notifyListeners();

		// Auto-transition from unstable modes after timeout
		if (!this.state.isStable) {
			this.scheduleAutoTransition(newMode);
		}

		// Check for recovery needs
		if (this.state.consecutiveErrors >= 3) {
			this.attemptRecovery();
		}

		// Save state after transition
		this.saveState();

		return true;
	}

	// Check if a transition is valid
	private isValidTransition(from: string, to: string): boolean {
		const allowedTransitions =
			ModeStateService.TRANSITION_RULES[
				from as keyof typeof ModeStateService.TRANSITION_RULES
			];
		return allowedTransitions
			? (allowedTransitions as string[]).includes(to)
			: false;
	}

	// Schedule auto-transition for unstable modes
	private scheduleAutoTransition(mode: string): void {
		const timeouts: Record<string, number> = {
			[ModeStateService.MODES.THINKING]: 10000, // 10 seconds
			[ModeStateService.MODES.STREAMING]: 30000, // 30 seconds
			[ModeStateService.MODES.COLLECTING_INFO]: 60000, // 60 seconds
			[ModeStateService.MODES.PROCESSING]: 15000, // 15 seconds
		};

		const timeout = timeouts[mode];
		if (timeout) {
			setTimeout(() => {
				// Only auto-transition if still in the same mode
				if (this.state.current === mode) {
					console.warn(
						`[ModeState] Auto-transitioning from ${mode} due to timeout`
					);
					this.transitionTo(ModeStateService.MODES.ERROR, 'timeout');
				}
			}, timeout);
		}
	}

	// Notify all listeners
	private notifyListeners(): void {
		this.listeners.forEach((listener) => {
			try {
				listener(this.state);
			} catch (error) {
				console.error('[ModeState] Error in listener:', error);
			}
		});
	}

	// Reset to idle state
	reset(): void {
		this.transitionTo(ModeStateService.MODES.IDLE, 'reset');
		this.recoveryAttempts = 0;
		this.saveState();
	}

	// Clear history (useful for debugging)
	clearHistory(): void {
		this.state.history = [];
		this.notifyListeners();
	}

	// Get mode statistics
	getStats(): {
		totalTransitions: number;
		timeInCurrentMode: number;
		mostCommonMode: string;
		errorCount: number;
		consecutiveErrors: number;
		recoveryAttempts: number;
	} {
		const now = Date.now();
		const timeInCurrentMode = now - this.state.lastTransitionTime;

		// Count mode occurrences
		const modeCounts: Record<string, number> = {};
		this.state.history.forEach((transition) => {
			modeCounts[transition.to] = (modeCounts[transition.to] || 0) + 1;
		});

		const mostCommonMode = Object.entries(modeCounts).reduce(
			(max, [mode, count]) => (count > modeCounts[max] ? mode : max),
			'idle'
		);

		const errorCount = this.state.history.filter(
			(transition) => transition.to === ModeStateService.MODES.ERROR
		).length;

		return {
			totalTransitions: this.state.history.length,
			timeInCurrentMode,
			mostCommonMode,
			errorCount,
			consecutiveErrors: this.state.consecutiveErrors,
			recoveryAttempts: this.recoveryAttempts,
		};
	}

	// Get detailed analytics
	getAnalytics(): ModeAnalytics {
		const now = Date.now();
		const totalTimeInMode: Record<string, number> = {};
		const modeDurations: Record<string, number[]> = {};
		const transitionFrequency: Record<string, number> = {};

		// Initialize all modes
		Object.values(ModeStateService.MODES).forEach((mode) => {
			totalTimeInMode[mode] = 0;
			modeDurations[mode] = [];
			transitionFrequency[mode] = 0;
		});

		// Calculate time spent in each mode
		this.state.history.forEach((transition, index) => {
			if (transition.duration) {
				totalTimeInMode[transition.from] += transition.duration;
				modeDurations[transition.from].push(transition.duration);
			}
			transitionFrequency[transition.to]++;
		});

		// Add current mode time
		const currentModeTime = now - this.state.lastTransitionTime;
		totalTimeInMode[this.state.current] += currentModeTime;

		// Calculate averages
		const averageModeDuration: Record<string, number> = {};
		Object.entries(modeDurations).forEach(([mode, durations]) => {
			averageModeDuration[mode] =
				durations.length > 0
					? durations.reduce((sum, duration) => sum + duration, 0) /
					  durations.length
					: 0;
		});

		const totalTransitions = this.state.history.length;
		const errorCount = this.state.history.filter(
			(transition) => transition.to === ModeStateService.MODES.ERROR
		).length;

		return {
			totalTimeInMode,
			averageModeDuration,
			transitionFrequency,
			errorRate: totalTransitions > 0 ? errorCount / totalTransitions : 0,
			recoveryCount: this.recoveryAttempts,
		};
	}

	// Attempt recovery from stuck state
	private attemptRecovery(): void {
		if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
			console.error('[ModeState] Max recovery attempts reached, forcing reset');
			this.reset();
			return;
		}

		this.recoveryAttempts++;
		console.warn(`[ModeState] Attempting recovery #${this.recoveryAttempts}`);

		// Force transition to idle
		this.state = {
			...this.state,
			current: ModeStateService.MODES.IDLE,
			isStable: true,
			consecutiveErrors: 0,
			lastTransitionTime: Date.now(),
		};

		this.notifyListeners();
	}

	// Force recovery (public method)
	forceRecovery(): void {
		console.warn('[ModeState] Force recovery requested');
		this.attemptRecovery();
	}

	// Check if service is healthy
	isHealthy(): boolean {
		const now = Date.now();
		const timeInCurrentMode = now - this.state.lastTransitionTime;
		const maxStuckTime = 5 * 60 * 1000; // 5 minutes

		return (
			this.state.consecutiveErrors < 3 &&
			timeInCurrentMode < maxStuckTime &&
			this.recoveryAttempts < this.maxRecoveryAttempts
		);
	}

	// Get health status
	getHealthStatus(): {
		isHealthy: boolean;
		issues: string[];
		recommendations: string[];
	} {
		const issues: string[] = [];
		const recommendations: string[] = [];
		const now = Date.now();
		const timeInCurrentMode = now - this.state.lastTransitionTime;

		if (this.state.consecutiveErrors >= 3) {
			issues.push('High consecutive error count');
			recommendations.push('Consider resetting the service');
		}

		if (timeInCurrentMode > 5 * 60 * 1000) {
			issues.push('Stuck in current mode for too long');
			recommendations.push('Force recovery or reset');
		}

		if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
			issues.push('Max recovery attempts reached');
			recommendations.push('Service needs manual intervention');
		}

		return {
			isHealthy: issues.length === 0,
			issues,
			recommendations,
		};
	}

	// Save state to persistent storage
	private saveState(): void {
		try {
			const stateToSave = {
				...this.state,
				recoveryAttempts: this.recoveryAttempts,
			};
			// In a real implementation, this would use AsyncStorage or similar
			// For now, we'll just log it
		} catch (error) {
			console.error('[ModeState] Failed to save state:', error);
		}
	}

	// Load state from persistent storage
	private loadState(): void {
		try {
			// In a real implementation, this would load from AsyncStorage
			// For now, we'll just initialize with defaults
		} catch (error) {
			console.error('[ModeState] Failed to load state:', error);
		}
	}

	// Initialize with saved state
	initialize(): void {
		this.loadState();
	}

	// Export state for debugging
	exportState(): string {
		return JSON.stringify(
			{
				state: this.state,
				recoveryAttempts: this.recoveryAttempts,
				analytics: this.getAnalytics(),
				health: this.getHealthStatus(),
			},
			null,
			2
		);
	}

	// Import state from debugging
	importState(stateJson: string): boolean {
		try {
			const imported = JSON.parse(stateJson);
			if (imported.state) {
				this.state = imported.state;
				this.recoveryAttempts = imported.recoveryAttempts || 0;
				this.notifyListeners();
				return true;
			}
			return false;
		} catch (error) {
			console.error('[ModeState] Failed to import state:', error);
			return false;
		}
	}
}

// Export singleton instance
export const modeStateService = new ModeStateService();
export default modeStateService;
