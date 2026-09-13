import { describe, it, expect } from 'vitest';
import { validateProfile } from './profileValidation';
const form = { name: ' Adam ', age: '28', weight: '75,5', height: '178', steps: '0' };
describe('profile validation', () => {
  it('accepts French decimals and zero steps', () => expect(validateProfile(form, true)).toEqual({ display_name: 'Adam', age: 28, weight_kg: 75.5, height_cm: 178, daily_steps: 0 }));
  it('requires every metric during onboarding', () => expect(() => validateProfile({ ...form, height: '' }, true)).toThrow('Taille'));
  it('rejects fractional age instead of silently rounding', () => expect(() => validateProfile({ ...form, age: '28.5' })).toThrow('entier'));
  it('rejects zero body dimensions', () => expect(() => validateProfile({ ...form, weight: '0' })).toThrow('Poids'));
});
