// src/services/reminder.service.js
// 调度计算、next_trigger_at 计算

import { parseTime, getCurrentTimestamp, getTimezoneOffset, unixToISO } from '../utils/time.js';
import { lunarToSolar } from '../utils/lunar.js';

/**
 * 计算下次触发时间
 * @returns {number} Unix timestamp (seconds) or null
 */
export function calculateNextTrigger(scheduleType, config, timezone = 'Asia/Shanghai') {
	const now = getCurrentTimestamp();

	switch (scheduleType) {
		case 'once':
			return calculateOnce(config, timezone);
		case 'daily':
			return calculateDaily(config, timezone, now);
		case 'weekly':
			return calculateWeekly(config, timezone, now);
		case 'monthly':
			return calculateMonthly(config, timezone, now);
		case 'yearly':
			return calculateYearly(config, timezone, now);
		case 'lunar':
			return calculateLunar(config, timezone, now);
		default:
			throw new Error(`Unknown schedule type: ${scheduleType}`);
	}
}

/**
 * 一次性提醒
 */
function calculateOnce(config, timezone) {
	if (config.at) {
		// ISO 8601 格式
		const date = new Date(config.at);
		return Math.floor(date.getTime() / 1000);
	} else if (config.at_unix) {
		return config.at_unix;
	}
	throw new Error('once schedule requires "at" or "at_unix"');
}

/**
 * 每日提醒
 */
function calculateDaily(config, timezone, fromTime) {
	const { time, every_n_days = 1, end_date } = config;

	if (!time) {
		throw new Error('daily schedule requires "time" (HH:MM)');
	}

	const { hours, minutes } = parseTime(time);
	const tzOffset = getTimezoneOffset(timezone);

	// 从今天开始计算
	let current = new Date((fromTime + tzOffset) * 1000);
	current.setUTCHours(hours, minutes, 0, 0);

	let triggerTime = Math.floor(current.getTime() / 1000) - tzOffset;

	// 如果今天的时间已过，推到明天
	if (triggerTime <= fromTime) {
		triggerTime += 86400 * every_n_days;
	}

	// 检查结束日期
	if (end_date) {
		const endTimestamp = Math.floor(new Date(end_date).getTime() / 1000);
		if (triggerTime > endTimestamp) {
			return null; // 已超过结束日期
		}
	}

	return triggerTime;
}

/**
 * 每周提醒
 */
function calculateWeekly(config, timezone, fromTime) {
	const { time, weekdays = [], every_n_weeks = 1, end_date } = config;

	if (!time || weekdays.length === 0) {
		throw new Error('weekly schedule requires "time" and "weekdays"');
	}

	const { hours, minutes } = parseTime(time);
	const tzOffset = getTimezoneOffset(timezone);

	// 当前时间（按时区）
	const currentLocal = new Date((fromTime + tzOffset) * 1000);
	const currentWeekday = currentLocal.getUTCDay(); // 0=Sunday, 6=Saturday

	// 排序 weekdays
	const sortedWeekdays = [...weekdays].sort((a, b) => a - b);

	// 寻找下一个匹配的星期
	let nextWeekday = null;
	let daysToAdd = 0;

	for (const wd of sortedWeekdays) {
		if (wd > currentWeekday) {
			nextWeekday = wd;
			daysToAdd = wd - currentWeekday;
			break;
		} else if (wd === currentWeekday) {
			// 检查今天时间是否已过
			const todayTrigger = new Date(currentLocal);
			todayTrigger.setUTCHours(hours, minutes, 0, 0);
			const todayTriggerUnix = Math.floor(todayTrigger.getTime() / 1000) - tzOffset;

			if (todayTriggerUnix > fromTime) {
				nextWeekday = wd;
				daysToAdd = 0;
				break;
			}
		}
	}

	// 如果本周没有找到，取下周第一个
	if (nextWeekday === null) {
		nextWeekday = sortedWeekdays[0];
		daysToAdd = 7 - currentWeekday + nextWeekday;
	}

	// 计算触发时间
	const nextLocal = new Date(currentLocal);
	nextLocal.setUTCDate(nextLocal.getUTCDate() + daysToAdd);
	nextLocal.setUTCHours(hours, minutes, 0, 0);

	let triggerTime = Math.floor(nextLocal.getTime() / 1000) - tzOffset;

	// 检查结束日期
	if (end_date) {
		const endTimestamp = Math.floor(new Date(end_date).getTime() / 1000);
		if (triggerTime > endTimestamp) {
			return null;
		}
	}

	return triggerTime;
}

/**
 * 每月提醒
 */
function calculateMonthly(config, timezone, fromTime) {
	const { time, day_of_month, every_n_months = 1, end_date } = config;

	if (!time || !day_of_month) {
		throw new Error('monthly schedule requires "time" and "day_of_month"');
	}

	if (day_of_month < 1 || day_of_month > 31) {
		throw new Error('day_of_month must be between 1 and 31');
	}

	const { hours, minutes } = parseTime(time);
	const tzOffset = getTimezoneOffset(timezone);

	// 从当前时间开始
	let current = new Date((fromTime + tzOffset) * 1000);
	current.setUTCDate(day_of_month);
	current.setUTCHours(hours, minutes, 0, 0);

	let triggerTime = Math.floor(current.getTime() / 1000) - tzOffset;

	// 如果这个月的日期已过，推到下个月
	if (triggerTime <= fromTime) {
		current.setUTCMonth(current.getUTCMonth() + every_n_months);
		// 处理月份日期不存在的情况（如2月30日）
		if (current.getUTCDate() !== day_of_month) {
			// 设置为该月最后一天
			current.setUTCDate(0);
		}
		triggerTime = Math.floor(current.getTime() / 1000) - tzOffset;
	}

	// 检查结束日期
	if (end_date) {
		const endTimestamp = Math.floor(new Date(end_date).getTime() / 1000);
		if (triggerTime > endTimestamp) {
			return null;
		}
	}

	return triggerTime;
}

/**
 * 每年提醒
 */
function calculateYearly(config, timezone, fromTime) {
	const { time, month, day, every_n_years = 1, end_date } = config;

	if (!time || !month || !day) {
		throw new Error('yearly schedule requires "time", "month" (1-12), and "day" (1-31)');
	}

	if (month < 1 || month > 12) {
		throw new Error('month must be between 1 and 12');
	}

	if (day < 1 || day > 31) {
		throw new Error('day must be between 1 and 31');
	}

	const { hours, minutes } = parseTime(time);
	const tzOffset = getTimezoneOffset(timezone);

	// 从当前时间开始
	let current = new Date((fromTime + tzOffset) * 1000);
	const currentYear = current.getUTCFullYear();

	// 设置为今年的目标日期
	current.setUTCFullYear(currentYear);
	current.setUTCMonth(month - 1); // month is 1-based, setUTCMonth is 0-based
	current.setUTCDate(day);
	current.setUTCHours(hours, minutes, 0, 0);

	// 处理日期不存在的情况（如2月30日）
	if (current.getUTCMonth() !== month - 1) {
		// 设置为该月最后一天
		current.setUTCMonth(month);
		current.setUTCDate(0);
		current.setUTCHours(hours, minutes, 0, 0);
	}

	let triggerTime = Math.floor(current.getTime() / 1000) - tzOffset;

	// 如果今年的日期已过，推到明年
	if (triggerTime <= fromTime) {
		current.setUTCFullYear(currentYear + every_n_years);
		// 再次处理日期不存在的情况（闰年问题）
		if (current.getUTCMonth() !== month - 1) {
			current.setUTCMonth(month);
			current.setUTCDate(0);
			current.setUTCHours(hours, minutes, 0, 0);
		}
		triggerTime = Math.floor(current.getTime() / 1000) - tzOffset;
	}

	// 检查结束日期
	if (end_date) {
		const endTimestamp = Math.floor(new Date(end_date).getTime() / 1000);
		if (triggerTime > endTimestamp) {
			return null;
		}
	}

	return triggerTime;
}

/**
 * 农历提醒
 */
function calculateLunar(config, timezone, fromTime) {
	const { lunarMonth, lunarDay, time, leapMonth = false, repeat = true } = config;

	if (!lunarMonth || !lunarDay || !time) {
		throw new Error('lunar schedule requires "lunarMonth", "lunarDay", and "time"');
	}

	const { hours, minutes } = parseTime(time);

	// 转换农历到公历
	const solarDate = lunarToSolar(lunarMonth, lunarDay, leapMonth, fromTime);

	if (!solarDate) {
		throw new Error('Cannot convert lunar date to solar');
	}

	// 应用时间和时区
	const tzOffset = getTimezoneOffset(timezone);
	const triggerDate = new Date(solarDate);
	triggerDate.setUTCHours(hours, minutes, 0, 0);

	const triggerTime = Math.floor(triggerDate.getTime() / 1000) - tzOffset;

	// 如果是一次性提醒且时间已过，返回 null
	if (!repeat && triggerTime <= fromTime) {
		return null;
	}

	return triggerTime > fromTime ? triggerTime : null;
}

/**
 * 生成预览（接下来 N 次触发时间）
 */
export function generatePreview(scheduleType, config, timezone, count = 3) {
	const preview = [];
	let currentTime = getCurrentTimestamp();

	// 对于 once 类型，只有一次
	if (scheduleType === 'once') {
		const triggerTime = calculateNextTrigger(scheduleType, config, timezone);
		if (triggerTime) {
			preview.push({
				unix: triggerTime,
				iso: unixToISO(triggerTime),
			});
		}
		return preview;
	}

	// 对于农历一次性提醒，只有一次
	if (scheduleType === 'lunar' && config.repeat === false) {
		const triggerTime = calculateNextTrigger(scheduleType, config, timezone);
		if (triggerTime) {
			preview.push({
				unix: triggerTime,
				iso: unixToISO(triggerTime),
			});
		}
		return preview;
	}

	// 对于重复类型，计算多次
	for (let i = 0; i < count && i < 100; i++) {
		const nextTrigger = calculateNextTrigger(scheduleType, config, timezone, currentTime);

		if (!nextTrigger || nextTrigger <= 0) {
			break;
		}

		preview.push({
			unix: nextTrigger,
			iso: unixToISO(nextTrigger),
		});

		// 移动到下一次计算的起点
		currentTime = nextTrigger + 60; // +1分钟避免重复
	}

	return preview;
}

/**
 * 计算重复提醒的下一次触发时间（用于 Cron 更新）
 */
export function calculateNextOccurrence(scheduleType, config, timezone, lastTriggerAt) {
	// 从上次触发时间后 1 分钟开始计算
	const fromTime = lastTriggerAt + 60;

	switch (scheduleType) {
		case 'once':
			return null; // 一次性提醒没有下次
		case 'daily':
			return calculateDaily(config, timezone, fromTime);
		case 'weekly':
			return calculateWeekly(config, timezone, fromTime);
		case 'monthly':
			return calculateMonthly(config, timezone, fromTime);
		case 'yearly':
			return calculateYearly(config, timezone, fromTime);
		case 'lunar':
			return calculateLunar(config, timezone, fromTime);
		default:
			return null;
	}
}
