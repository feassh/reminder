// src/utils/validator.js
// 输入校验

/**
 * 校验提醒创建输入
 */
export function validateReminderInput(data) {
	const errors = [];

	// 必填字段
	if (!data.content || typeof data.content !== 'string') {
		errors.push('content is required and must be a string');
	} else if (data.content.length > 1000) {
		errors.push('content must be less than 1000 characters');
	}

	if (!data.schedule_type || !['once', 'daily', 'weekly', 'monthly', 'lunar'].includes(data.schedule_type)) {
		errors.push('schedule_type must be one of: once, daily, weekly, monthly, lunar');
	}

	if (!data.schedule_config || typeof data.schedule_config !== 'object') {
		errors.push('schedule_config is required and must be an object');
	} else {
		// 根据类型验证配置
		const configErrors = validateScheduleConfig(data.schedule_type, data.schedule_config);
		errors.push(...configErrors);
	}

	// 可选字段验证
	if (data.timezone && !isValidTimezone(data.timezone)) {
		errors.push('timezone must be a valid IANA timezone');
	}

	if (data.chat_id && typeof data.chat_id !== 'string') {
		errors.push('chat_id must be a string');
	}

	if (errors.length > 0) {
		return { valid: false, error: errors.join('; ') };
	}

	return { valid: true };
}

/**
 * 校验更新输入
 */
export function validateUpdateInput(data) {
	const errors = [];

	if (data.content !== undefined) {
		if (typeof data.content !== 'string') {
			errors.push('content must be a string');
		} else if (data.content.length > 1000) {
			errors.push('content must be less than 1000 characters');
		}
	}

	if (data.schedule_type !== undefined) {
		if (!['once', 'daily', 'weekly', 'monthly', 'lunar'].includes(data.schedule_type)) {
			errors.push('schedule_type must be one of: once, daily, weekly, monthly, lunar');
		}
	}

	if (data.schedule_config !== undefined) {
		if (typeof data.schedule_config !== 'object') {
			errors.push('schedule_config must be an object');
		} else if (data.schedule_type) {
			const configErrors = validateScheduleConfig(data.schedule_type, data.schedule_config);
			errors.push(...configErrors);
		}
	}

	if (data.status !== undefined) {
		if (!['active', 'paused', 'completed'].includes(data.status)) {
			errors.push('status must be one of: active, paused, completed');
		}
	}

	if (data.timezone !== undefined && !isValidTimezone(data.timezone)) {
		errors.push('timezone must be a valid IANA timezone');
	}

	if (errors.length > 0) {
		return { valid: false, error: errors.join('; ') };
	}

	return { valid: true };
}

/**
 * 校验 schedule_config
 */
function validateScheduleConfig(type, config) {
	const errors = [];

	switch (type) {
		case 'once':
			if (!config.at && !config.at_unix) {
				errors.push('once schedule requires "at" (ISO 8601) or "at_unix" (Unix timestamp)');
			}
			if (config.at && !isValidISO8601(config.at)) {
				errors.push('at must be a valid ISO 8601 datetime');
			}
			break;

		case 'daily':
			if (!config.time || !isValidTime(config.time)) {
				errors.push('daily schedule requires "time" in HH:MM format');
			}
			if (config.every_n_days !== undefined && (!Number.isInteger(config.every_n_days) || config.every_n_days < 1)) {
				errors.push('every_n_days must be a positive integer');
			}
			if (config.end_date && !isValidDate(config.end_date)) {
				errors.push('end_date must be a valid ISO date (YYYY-MM-DD)');
			}
			break;

		case 'weekly':
			if (!config.time || !isValidTime(config.time)) {
				errors.push('weekly schedule requires "time" in HH:MM format');
			}
			if (!Array.isArray(config.weekdays) || config.weekdays.length === 0) {
				errors.push('weekly schedule requires "weekdays" array (0=Sunday..6=Saturday)');
			} else {
				for (const day of config.weekdays) {
					if (!Number.isInteger(day) || day < 0 || day > 6) {
						errors.push('weekdays must contain integers from 0 to 6');
						break;
					}
				}
			}
			if (config.every_n_weeks !== undefined && (!Number.isInteger(config.every_n_weeks) || config.every_n_weeks < 1)) {
				errors.push('every_n_weeks must be a positive integer');
			}
			break;

		case 'monthly':
			if (!config.time || !isValidTime(config.time)) {
				errors.push('monthly schedule requires "time" in HH:MM format');
			}
			if (!config.day_of_month || !Number.isInteger(config.day_of_month) || config.day_of_month < 1 || config.day_of_month > 31) {
				errors.push('monthly schedule requires "day_of_month" (1-31)');
			}
			if (config.every_n_months !== undefined && (!Number.isInteger(config.every_n_months) || config.every_n_months < 1)) {
				errors.push('every_n_months must be a positive integer');
			}
			if (config.end_date && !isValidDate(config.end_date)) {
				errors.push('end_date must be a valid ISO date (YYYY-MM-DD)');
			}
			break;

		case 'lunar':
			if (!config.lunarMonth || !Number.isInteger(config.lunarMonth) || config.lunarMonth < 1 || config.lunarMonth > 12) {
				errors.push('lunar schedule requires "lunarMonth" (1-12)');
			}
			if (!config.lunarDay || !Number.isInteger(config.lunarDay) || config.lunarDay < 1 || config.lunarDay > 30) {
				errors.push('lunar schedule requires "lunarDay" (1-30)');
			}
			if (!config.time || !isValidTime(config.time)) {
				errors.push('lunar schedule requires "time" in HH:MM format');
			}
			if (config.repeat !== undefined && typeof config.repeat !== 'boolean') {
				errors.push('repeat must be a boolean');
			}
			break;

		default:
			errors.push(`Unknown schedule type: ${type}`);
	}

	return errors;
}

/**
 * 验证时间格式 (HH:MM)
 */
function isValidTime(time) {
	return /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.test(time);
}

/**
 * 验证 ISO 8601 日期时间
 */
function isValidISO8601(dateString) {
	try {
		const date = new Date(dateString);
		return !isNaN(date.getTime());
	} catch {
		return false;
	}
}

/**
 * 验证日期格式 (YYYY-MM-DD)
 */
function isValidDate(dateString) {
	return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && isValidISO8601(dateString);
}

/**
 * 验证时区（简化版，仅检查常见时区）
 */
function isValidTimezone(timezone) {
	const validTimezones = [
		'UTC',
		'Asia/Singapore',
		'Asia/Shanghai',
		'Asia/Hong_Kong',
		'Asia/Tokyo',
		'Asia/Seoul',
		'Asia/Taipei',
		'America/New_York',
		'America/Los_Angeles',
		'America/Chicago',
		'Europe/London',
		'Europe/Paris',
		'Europe/Berlin',
		'Australia/Sydney',
	];
	return validTimezones.includes(timezone);
}
