// Skill Registry - Central registry for all finance topic skills
// Makes it easy to add new topics by just importing and registering them

import { Skill } from './types';
import { HYSA_SKILL } from './packs/hysa';
import { CD_SKILL } from './packs/cd';
// Import other skill packs as they're created...

const SKILLS: Skill[] = [
  HYSA_SKILL,
  CD_SKILL,
  // Add more skills here as they're created
];

export const skillRegistry = {
  /**
   * Find all skills that match the given question
   */
  find(q: string): Skill[] {
    const lower = q.toLowerCase();
    const matchingSkills = SKILLS.filter(skill => skill.matches(lower));
    
    // Sort by priority (higher priority first)
    return matchingSkills.sort((a, b) => (b.config?.priority ?? 0) - (a.config?.priority ?? 0));
  },

  /**
   * Get a specific skill by ID
   */
  getById(id: string): Skill | undefined {
    return SKILLS.find(skill => skill.id === id);
  },

  /**
   * Get all registered skills
   */
  getAll(): Skill[] {
    return [...SKILLS];
  },

  /**
   * Get skill statistics
   */
  getStats() {
    return {
      totalSkills: SKILLS.length,
      skillsByPriority: SKILLS.reduce((acc, skill) => {
        const priority = skill.config?.priority ?? 0;
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
      skillIds: SKILLS.map(s => s.id)
    };
  },

  /**
   * Register a new skill (for dynamic skill loading)
   */
  register(skill: Skill): void {
    if (SKILLS.find(s => s.id === skill.id)) {
      console.warn(`[SkillRegistry] Skill ${skill.id} already registered, skipping`);
      return;
    }
    SKILLS.push(skill);
    console.log(`[SkillRegistry] Registered skill: ${skill.id}`);
  },

  /**
   * Unregister a skill
   */
  unregister(skillId: string): boolean {
    const index = SKILLS.findIndex(s => s.id === skillId);
    if (index === -1) return false;
    
    SKILLS.splice(index, 1);
    console.log(`[SkillRegistry] Unregistered skill: ${skillId}`);
    return true;
  }
};
