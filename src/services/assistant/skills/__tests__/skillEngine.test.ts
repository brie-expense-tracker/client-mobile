// Tests for the Skill Engine

import { trySkills, getSkillEngineStats, testSkill } from '../engine';
import { skillRegistry } from '../registry';

describe('Skill Engine', () => {
  const mockContext = {
    budgets: [],
    goals: [],
    transactions: []
  };

  test('finds and executes HYSA skills', async () => {
    const result = await trySkills('What is a HYSA?', mockContext);
    
    expect(result).toBeTruthy();
    expect(result?.message).toMatch(/high[-\s]?yield\s+savings/i);
  });

  test('finds and executes CD skills', async () => {
    const result = await trySkills('What is a CD?', mockContext);
    
    expect(result).toBeTruthy();
    expect(result?.message).toMatch(/certificate of deposit/i);
  });

  test('handles HYSA interest calculations', async () => {
    const result = await trySkills('If I put $5000 in a HYSA, how much interest?', mockContext);
    
    expect(result).toBeTruthy();
    expect(result?.message).toMatch(/\$5,000/);
    expect(result?.message).toMatch(/APY/);
  });

  test('handles CD interest calculations', async () => {
    const result = await trySkills('If I put $10000 in a 12-month CD, how much interest?', mockContext);
    
    expect(result).toBeTruthy();
    expect(result?.message).toMatch(/\$10,000/);
    expect(result?.message).toMatch(/12-month/);
  });

  test('returns null for unrelated questions', async () => {
    const result = await trySkills('What is the weather like?', mockContext);
    
    expect(result).toBeNull();
  });

  test('skill registry works correctly', () => {
    const stats = skillRegistry.getStats();
    
    expect(stats.totalSkills).toBeGreaterThan(0);
    expect(stats.skillIds).toContain('HYSA');
    expect(stats.skillIds).toContain('CD');
  });

  test('getSkillEngineStats returns valid data', () => {
    const stats = getSkillEngineStats();
    
    expect(stats).toHaveProperty('totalSkills');
    expect(stats).toHaveProperty('engineVersion');
    expect(stats.engineVersion).toBe('1.0.0');
  });

  test('testSkill function works for specific skills', async () => {
    const result = await testSkill('HYSA', 'What is a HYSA?', mockContext);
    
    expect(result).toBeTruthy();
    expect(result?.skillId).toBe('HYSA');
    expect(result?.response).toBeTruthy();
  });

  test('skills are prioritized correctly', () => {
    const skills = skillRegistry.find('HYSA question');
    
    // HYSA should come first due to higher priority
    expect(skills[0]?.id).toBe('HYSA');
  });
});
