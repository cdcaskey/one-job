import { describe, expect, it } from 'vitest';
import { faker } from '@faker-js/faker';
import { formatEstimate, fromMinutes, toMinutes, type EstimateUnit } from './estimate.js';

describe('toMinutes / fromMinutes', () => {
  it('converts hours and days to minutes', () => {
    expect(toMinutes(2, 'hours')).toBe(120);
    expect(toMinutes(1, 'days')).toBe(480);
    expect(toMinutes(45, 'minutes')).toBe(45);
  });

  it('round-trips whole-minute values for a random unit', () => {
    const unit = faker.helpers.arrayElement<EstimateUnit>(['minutes', 'hours', 'days']);
    const value = faker.number.int({ min: 1, max: 20 });
    const minutes = toMinutes(value, unit);
    expect(fromMinutes(minutes, unit)).toBe(value);
  });
});

describe('formatEstimate', () => {
  it.each([
    [0, '0m'],
    [59, '59m'],
    [60, '1h'],
    [90, '1h 30m'],
    [480, '1d'],
    [500, '1d'],
    [1440, '3d'],
    [1920, '4d'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatEstimate(minutes)).toBe(expected);
  });
});
