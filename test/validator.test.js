// tests/validator.test.js
// 单元测试：输入验证

import { validateReminderInput, validateUpdateInput } from '../src/utils/validator.js';

describe('Validator - Reminder Input', () => {

	test('valid daily reminder', () => {
		const input = {
			content: '测试提醒',
			schedule_type: 'daily',
			schedule_config: {
				time: '09:30',
				every_n_days: 1
			},
			timezone: 'Asia/Singapore'
		};
		const result = validateReminderInput(input);
		expect(result.valid).toBe(true);
	});

	test('missing content', () => {
		const input = {
			schedule_type: 'daily',
			schedule_config: { time: '09:30' }
		};
		const result = validateReminderInput(input);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('content');
	});

	test('invalid schedule_type', () => {
		const input = {
			content: 'Test',
			schedule_type: 'invalid_type',
			schedule_config: {}
		};
		const result = validateReminderInput(input);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('schedule_type');
	});

	test('invalid time format', () => {
		const input = {
			content: 'Test',
			schedule_type: 'daily',
			schedule_config: {
				time: '25:00' // invalid hour
			}
		};
		const result = validateReminderInput(input);
		expect(result.valid).toBe(false);
	});

	test('weekly without weekdays', () => {
		const input = {
			content: 'Test',
			schedule_type: 'weekly',
			schedule_config: {
				time: '09:00'
				// missing weekdays
			}
		};
		const result = validateReminderInput(input);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('weekdays');
	});

	test('lunar with valid config', () => {
		const input = {
			content: 'Test',
			schedule_type: 'lunar',
			schedule_config: {
				lunarMonth: 8,
				lunarDay: 15,
				time: '20:00'
			}
		};
		const result = validateReminderInput(input);
		expect(result.valid).toBe(true);
	});
});

describe('Validator - Update Input', () => {

	test('valid partial update', () => {
		const input = {
			content: '更新后的内容',
			status: 'paused'
		};
		const result = validateUpdateInput(input);
		expect(result.valid).toBe(true);
	});

	test('invalid status', () => {
		const input = {
			status: 'invalid_status'
		};
		const result = validateUpdateInput(input);
		expect(result.valid).toBe(false);
	});
});
