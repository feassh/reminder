// src/utils/lunar.js
// 农历转公历算法（使用 lunar-javascript 重构）
import { Lunar, Solar } from 'lunar-javascript';

// =============================================================================
// Original Implementation (Commented Out)
// =============================================================================
// // 农历转公历算法（轻量实现，基于预计算数据）
// 
// /**
//  * 农历数据表 (2000-2100)
//  * 每个数字编码了该年的信息：
//  * - 闰月月份（0 表示无闰月，1-12 表示闰几月）
//  * - 12/13 个月的大小月标记（1=大月30天，0=小月29天）
//  */
// const LUNAR_DATA = [
// 	// 2000-2009
// 	0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
// 	// 2010-2019
// 	0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
// 	// 2020-2029
// 	0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
// 	// 2030-2039
// 	0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
// 	// 2040-2049
// 	0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
// 	// 2050-2059
// 	0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
// 	// 2060-2069
// 	0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
// 	// 2070-2079
// 	0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
// 	// 2080-2089
// 	0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
// 	// 2090-2099
// 	0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
// 	// 2100
// 	0x0c960,
// ];
// 
// const LUNAR_BASE_YEAR = 2000;
// const SOLAR_BASE_DATE = new Date('2000-01-01');
// 
// /**
//  * 获取农历年份信息
//  */
// function getLunarYearInfo(year) {
// 	const index = year - LUNAR_BASE_YEAR;
// 	if (index < 0 || index >= LUNAR_DATA.length) {
// 		return null;
// 	}
// 
// 	const data = LUNAR_DATA[index];
// 	const leapMonth = (data >> 13) & 0x0F; // 闰月月份
// 	const monthDays = [];
// 
// 	// 解析 12/13 个月的天数
// 	for (let i = 0; i < 12; i++) {
// 		const bit = (data >> i) & 0x01;
// 		monthDays.push(bit ? 30 : 29);
// 	}
// 
// 	// 如果有闰月，添加闰月天数
// 	if (leapMonth > 0) {
// 		const leapBit = (data >> 12) & 0x01;
// 		monthDays.splice(leapMonth, 0, leapBit ? 30 : 29);
// 	}
// 
// 	return { leapMonth, monthDays };
// }
// 
// /**
//  * 计算农历年的总天数
//  */
// function getLunarYearDays(year) {
// 	const info = getLunarYearInfo(year);
// 	if (!info) return 0;
// 	return info.monthDays.reduce((sum, days) => sum + days, 0);
// }
// 
// /**
//  * 农历转公历（计算指定农历日期在公历中的下一次出现）
//  * @param {number} lunarMonth - 农历月份 (1-12)
//  * @param {number} lunarDay - 农历日期 (1-30)
//  * @param {boolean} isLeapMonth - 是否闰月
//  * @param {number} fromTimestamp - 从什么时间开始查找（Unix秒）
//  * @returns {Date|null} 公历日期
//  */
// export function lunarToSolar(lunarMonth, lunarDay, isLeapMonth = false, fromTimestamp) {
// 	const fromDate = new Date(fromTimestamp * 1000);
// 	const currentYear = fromDate.getFullYear();
// 
// 	// 尝试当前年和后续 3 年
// 	for (let year = currentYear; year <= currentYear + 3; year++) {
// 		const solarDate = lunarToSolarInYear(year, lunarMonth, lunarDay, isLeapMonth);
// 
// 		if (solarDate && solarDate > fromDate) {
// 			return solarDate;
// 		}
// 	}
// 
// 	return null;
// }
// 
// /**
//  * 计算指定年份中农历日期对应的公历日期
//  */
// function lunarToSolarInYear(solarYear, lunarMonth, lunarDay, isLeapMonth) {
// 	// 农历年通常从公历年的 1-2 月开始，所以检查前一年和当前年
// 	for (let lunarYear = solarYear - 1; lunarYear <= solarYear; lunarYear++) {
// 		const info = getLunarYearInfo(lunarYear);
// 		if (!info) continue;
// 
// 		const { leapMonth, monthDays } = info;
// 
// 		// 检查月份是否有效
// 		let targetMonthIndex = lunarMonth - 1;
// 
// 		if (isLeapMonth) {
// 			if (leapMonth !== lunarMonth) {
// 				continue; // 该年没有这个闰月
// 			}
// 			targetMonthIndex = lunarMonth; // 闰月在正常月后面
// 		} else if (leapMonth > 0 && lunarMonth > leapMonth) {
// 			targetMonthIndex = lunarMonth; // 闰月后的月份索引需要 +1
// 		}
// 
// 		if (targetMonthIndex >= monthDays.length) {
// 			continue;
// 		}
// 
// 		// 检查日期是否有效
// 		if (lunarDay > monthDays[targetMonthIndex]) {
// 			continue; // 该月没有这一天
// 		}
// 
// 		// 计算从农历年初到目标日期的天数
// 		let dayOffset = 0;
// 		for (let i = 0; i < targetMonthIndex; i++) {
// 			dayOffset += monthDays[i];
// 		}
// 		dayOffset += lunarDay - 1;
// 
// 		// 计算农历年初对应的公历日期
// 		let lunarYearStartDays = 0;
// 		for (let y = LUNAR_BASE_YEAR; y < lunarYear; y++) {
// 			lunarYearStartDays += getLunarYearDays(y);
// 		}
// 
// 		// 从 2000-01-01 开始计算
// 		const solarDate = new Date(SOLAR_BASE_DATE);
// 		solarDate.setDate(solarDate.getDate() + lunarYearStartDays + dayOffset);
// 
// 		// 检查是否在目标公历年内或附近
// 		if (solarDate.getFullYear() >= solarYear - 1 && solarDate.getFullYear() <= solarYear + 1) {
// 			return solarDate;
// 		}
// 	}
// 
// 	return null;
// }
// 
// /**
//  * 公历转农历（用于显示，可选功能）
//  */
// export function solarToLunar(solarDate) {
// 	// 简化实现：仅返回近似农历信息
// 	// 完整实现需要反向计算，此处省略
// 	return {
// 		year: solarDate.getFullYear(),
// 		month: 1,
// 		day: 1,
// 		isLeapMonth: false,
// 	};
// }

// =============================================================================
// New Implementation using lunar-javascript
// =============================================================================

/**
 * 农历转公历（计算指定农历日期在公历中的下一次出现）
 * @param {number} lunarMonth - 农历月份 (1-12)
 * @param {number} lunarDay - 农历日期 (1-30)
 * @param {boolean} isLeapMonth - 是否闰月
 * @param {number} fromTimestamp - 从什么时间开始查找（Unix秒）
 * @returns {Date|null} 公历日期
 */
export function lunarToSolar(lunarMonth, lunarDay, isLeapMonth = false, fromTimestamp) {
	const fromDate = new Date(fromTimestamp * 1000);
	const startYear = fromDate.getFullYear() - 1;
	// Search enough years to find the next occurrence (current year + 4 to be safe)
	const endYear = startYear + 4;

	for (let year = startYear; year <= endYear; year++) {
		try {
			// lunar-javascript uses negative month number for leap months
			const monthParam = isLeapMonth ? -lunarMonth : lunarMonth;

			const l = Lunar.fromYmd(year, monthParam, lunarDay);
			const s = l.getSolar();

			// Solar.getMonth() is 1-based
			const solarDate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());

			// Check if this date is in the future relative to fromDate
			if (solarDate > fromDate) {
				return solarDate;
			}
		} catch (e) {
			// Ignore invalid dates for a specific year (e.g. leap month doesn't exist)
			continue;
		}
	}

	return null;
}

/**
 * 公历转农历
 * @param {Date} solarDate 
 */
export function solarToLunar(solarDate) {
	const s = Solar.fromYmd(solarDate.getFullYear(), solarDate.getMonth() + 1, solarDate.getDate());
	const l = s.getLunar();
	return {
		year: l.getYear(),
		month: Math.abs(l.getMonth()),
		day: l.getDay(),
		isLeapMonth: l.getMonth() < 0
	};
}
