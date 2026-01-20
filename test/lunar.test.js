// tests/lunar.test.js
// 单元测试：农历转换 (Updated to use lunar-javascript)

import { lunarToSolar } from '../src/utils/lunar.js';
import { describe, test, expect } from 'vitest';

// =============================================================================
// Original Tests (Commented Out)
// =============================================================================
// describe('Lunar Calendar Conversion', () => {
//
// 	test('Mid-Autumn Festival 2026 (lunar 8/15)', () => {
// 		const fromTime = Math.floor(new Date('2026-01-01').getTime() / 1000);
// 		const result = lunarToSolar(8, 15, false, fromTime);
//
// 		expect(result).not.toBeNull();
// 		expect(result.getFullYear()).toBe(2026);
// 		// 2026年农历八月十五约对应公历10月初
// 		expect(result.getMonth()).toBeGreaterThanOrEqual(8); // September+
// 	});
//
// 	test('Chinese New Year (lunar 1/1)', () => {
// 		const fromTime = Math.floor(new Date('2026-01-01').getTime() / 1000);
// 		const result = lunarToSolar(1, 1, false, fromTime);
//
// 		expect(result).not.toBeNull();
// 		// 2026年春节在2月
// 		expect(result.getMonth()).toBeGreaterThanOrEqual(0);
// 	});
//
// 	test('Invalid lunar date', () => {
// 		const fromTime = Math.floor(new Date('2026-01-01').getTime() / 1000);
// 		// 农历不存在13月
// 		const result = lunarToSolar(13, 1, false, fromTime);
// 		expect(result).toBeNull();
// 	});
//
// 	test('Leap month', () => {
// 		const fromTime = Math.floor(new Date('2025-01-01').getTime() / 1000);
// 		// 测试闰月（需要查找有闰月的年份）
// 		const result = lunarToSolar(6, 15, true, fromTime);
// 		// 结果取决于该年是否有闰六月
// 		if (result) {
// 			expect(result.getFullYear()).toBeGreaterThanOrEqual(2025);
// 		}
// 	});
// });

// =============================================================================
// New Tests
// =============================================================================
describe('Lunar Calendar Conversion (New)', () => {

	test('Mid-Autumn Festival 2026 (lunar 8/15)', () => {
		const fromTime = Math.floor(new Date('2026-01-01').getTime() / 1000);
		const result = lunarToSolar(8, 15, false, fromTime);

		expect(result).not.toBeNull();
		expect(result.getFullYear()).toBe(2026);
		// 2026 Mid-Autumn is 2026-09-25
		// Month is 0-indexed in JS Date, so 8 is September.
		expect(result.getMonth()).toBe(8);
		expect(result.getDate()).toBe(25);
	});

	test('Chinese New Year 2026 (lunar 1/1)', () => {
		const fromTime = Math.floor(new Date('2026-01-01').getTime() / 1000);
		const result = lunarToSolar(1, 1, false, fromTime);

		expect(result).not.toBeNull();
		// 2026 Chinese New Year is Feb 17
		expect(result.getFullYear()).toBe(2026);
		expect(result.getMonth()).toBe(1); // February
		expect(result.getDate()).toBe(17);
	});

	test('Invalid lunar date (13th month)', () => {
		const fromTime = Math.floor(new Date('2026-01-01').getTime() / 1000);
		const result = lunarToSolar(13, 1, false, fromTime);
		expect(result).toBeNull();
	});

	test('Leap month (2025 Leap 6)', () => {
		const fromTime = Math.floor(new Date('2025-01-01').getTime() / 1000);
		// 2025 has leap 6th month.
		const result = lunarToSolar(6, 15, true, fromTime); // Leap 6

		expect(result).not.toBeNull();
		expect(result.getFullYear()).toBe(2025);
		// Leap 6 start is ~July 25, 2025. 15th day is ~Aug 8.
		expect(result.getMonth()).toBe(7); // August (index 7)
	});

	test('Non-existent leap month', () => {
		const fromTime = Math.floor(new Date('2026-01-01').getTime() / 1000);
		// 2026 has no leap month
		const result = lunarToSolar(4, 15, true, fromTime);
		expect(result).toBeNull();
	});
});
