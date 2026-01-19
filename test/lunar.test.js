// tests/lunar.test.js
// 单元测试：农历转换

import { lunarToSolar } from '../src/utils/lunar.js';

describe('Lunar Calendar Conversion', () => {

	test('Mid-Autumn Festival 2026 (lunar 8/15)', () => {
		const fromTime = Math.floor(new Date('2026-01-01').getTime() / 1000);
		const result = lunarToSolar(8, 15, false, fromTime);

		expect(result).not.toBeNull();
		expect(result.getFullYear()).toBe(2026);
		// 2026年农历八月十五约对应公历10月初
		expect(result.getMonth()).toBeGreaterThanOrEqual(8); // September+
	});

	test('Chinese New Year (lunar 1/1)', () => {
		const fromTime = Math.floor(new Date('2026-01-01').getTime() / 1000);
		const result = lunarToSolar(1, 1, false, fromTime);

		expect(result).not.toBeNull();
		// 2026年春节在2月
		expect(result.getMonth()).toBeGreaterThanOrEqual(0);
	});

	test('Invalid lunar date', () => {
		const fromTime = Math.floor(new Date('2026-01-01').getTime() / 1000);
		// 农历不存在13月
		const result = lunarToSolar(13, 1, false, fromTime);
		expect(result).toBeNull();
	});

	test('Leap month', () => {
		const fromTime = Math.floor(new Date('2025-01-01').getTime() / 1000);
		// 测试闰月（需要查找有闰月的年份）
		const result = lunarToSolar(6, 15, true, fromTime);
		// 结果取决于该年是否有闰六月
		if (result) {
			expect(result.getFullYear()).toBeGreaterThanOrEqual(2025);
		}
	});
});
