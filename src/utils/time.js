// src/utils/time.js
// 时间处理辅助函数

/**
 * 获取当前 Unix 时间戳（秒）
 */
export function getCurrentTimestamp() {
	return Math.floor(Date.now() / 1000);
}

/**
 * Unix 时间戳转 ISO 8601 字符串
 */
export function unixToISO(unixTimestamp) {
	return new Date(unixTimestamp * 1000).toISOString();
}

/**
 * ISO 8601 字符串转 Unix 时间戳
 */
export function isoToUnix(isoString) {
	return Math.floor(new Date(isoString).getTime() / 1000);
}

/**
 * 解析时间字符串 (HH:MM)
 */
export function parseTime(timeString) {
	const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
	if (!match) {
		throw new Error(`Invalid time format: ${timeString}, expected HH:MM`);
	}

	const hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);

	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
		throw new Error(`Invalid time value: ${timeString}`);
	}

	return { hours, minutes };
}

/**
 * 获取时区偏移量（秒）
 * 注意：Cloudflare Workers 支持有限的时区功能
 * 这里使用简化映射，生产环境建议使用完整的时区库
 */
export function getTimezoneOffset(timezone) {
	// 常见时区偏移量映射（UTC偏移，单位：秒）
	const timezoneOffsets = {
		'UTC': 0,
		'Asia/Singapore': 8 * 3600,
		'Asia/Shanghai': 8 * 3600,
		'Asia/Hong_Kong': 8 * 3600,
		'Asia/Tokyo': 9 * 3600,
		'America/New_York': -5 * 3600,
		'America/Los_Angeles': -8 * 3600,
		'Europe/London': 0,
		'Europe/Paris': 1 * 3600,
	};

	return timezoneOffsets[timezone] || 0;
}

/**
 * 格式化持续时间（秒 -> 人类可读）
 */
export function formatDuration(seconds) {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	const parts = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);

	return parts.join(' ') || '0m';
}
