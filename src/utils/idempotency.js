// src/utils/idempotency.js
// 幂等性处理

import { getCurrentTimestamp } from './time.js';

/**
 * 检查幂等性键
 */
export async function checkIdempotency(db, key) {
	try {
		const result = await db.prepare(`
      SELECT response FROM idempotency_keys WHERE key = ?
    `).bind(key).first();

		return result || null;
	} catch (error) {
		console.error('Check idempotency error:', error);
		return null;
	}
}

/**
 * 保存幂等性记录
 */
export async function saveIdempotency(db, key, response) {
	const now = getCurrentTimestamp();

	try {
		await db.prepare(`
      INSERT OR REPLACE INTO idempotency_keys (key, response, created_at)
      VALUES (?, ?, ?)
    `).bind(key, response, now).run();
	} catch (error) {
		console.error('Save idempotency error:', error);
	}
}
