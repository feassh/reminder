// tests/reminder.service.test.js
// 单元测试：调度计算

import { calculateNextTrigger, generatePreview } from '../src/services/reminder.service.js';
import { getCurrentTimestamp } from '../src/utils/time.js';

// Mock current time: 2026-01-02 10:00:00 UTC (Friday)
const MOCK_NOW = 1735815600;

describe('Reminder Service - calculateNextTrigger', () => {

	test('once - ISO format', () => {
		const config = {
			at: '2026-01-03T09:30:00+08:00'
		};
		const result = calculateNextTrigger('once', config, 'Asia/Shanghai');
		expect(result).toBeGreaterThan(MOCK_NOW);
	});

	test('once - Unix timestamp', () => {
		const config = {
			at_unix: MOCK_NOW + 3600 // 1 hour later
		};
		const result = calculateNextTrigger('once', config, 'Asia/Shanghai');
		expect(result).toBe(MOCK_NOW + 3600);
	});

	test('daily - today future time', () => {
		const config = {
			time: '15:00', // 3 PM
			every_n_days: 1
		};
		const result = calculateNextTrigger('daily', config, 'Asia/Shanghai', MOCK_NOW);
		expect(result).toBeGreaterThan(MOCK_NOW);
	});

	test('daily - today past time (should be tomorrow)', () => {
		const config = {
			time: '08:00', // 8 AM (before mock 10 AM)
			every_n_days: 1
		};
		const result = calculateNextTrigger('daily', config, 'Asia/Shanghai', MOCK_NOW);
		expect(result).toBeGreaterThan(MOCK_NOW + 3600); // at least 1 hour later
	});

	test('weekly - next occurrence', () => {
		const config = {
			time: '20:00',
			weekdays: [0, 6], // Sunday and Saturday
			every_n_weeks: 1
		};
		// Friday 10:00 -> next should be Saturday 20:00
		const result = calculateNextTrigger('weekly', config, 'Asia/Shanghai', MOCK_NOW);
		expect(result).toBeGreaterThan(MOCK_NOW);
	});

	test('weekly - with end_date', () => {
		const config = {
			time: '20:00',
			weekdays: [1, 2, 3],
			end_date: '2026-01-01' // Already passed
		};
		const result = calculateNextTrigger('weekly', config, 'Asia/Shanghai', MOCK_NOW);
		expect(result).toBeNull();
	});

	test('lunar - Mid-Autumn Festival', () => {
		const config = {
			lunarMonth: 8,
			lunarDay: 15,
			time: '20:00',
			leapMonth: false
		};
		const result = calculateNextTrigger('lunar', config, 'Asia/Shanghai', MOCK_NOW);
		expect(result).toBeGreaterThan(MOCK_NOW);
	});
});

describe('Reminder Service - generatePreview', () => {

	test('preview daily - 3 occurrences', () => {
		const config = {
			time: '09:00',
			every_n_days: 1
		};
		const preview = generatePreview('daily', config, 'Asia/Shanghai', 3);
		expect(preview.length).toBe(3);
		expect(preview[0].unix).toBeLessThan(preview[1].unix);
		expect(preview[0].iso).toBeTruthy();
	});

	test('preview once - single occurrence', () => {
		const config = {
			at: '2026-01-10T10:00:00Z'
		};
		const preview = generatePreview('once', config, 'UTC', 3);
		expect(preview.length).toBe(1);
	});

	test('preview weekly - multiple weeks', () => {
		const config = {
			time: '12:00',
			weekdays: [1, 3, 5],
			every_n_weeks: 1
		};
		const preview = generatePreview('weekly', config, 'Asia/Shanghai', 5);
		expect(preview.length).toBeGreaterThan(0);
		expect(preview.length).toBeLessThanOrEqual(5);
	});
});
