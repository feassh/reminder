// src/services/cron.service.js
// Cron 调度处理器

import { sendTelegramMessage } from './telegram.js';
import { calculateNextOccurrence } from './reminder.service.js';
import { getCurrentTimestamp } from '../utils/time.js';

/**
 * Cron 触发处理主函数
 */
export async function handleScheduledTrigger(env, scheduledTime) {
	const now = getCurrentTimestamp();
	const batchSize = 50; // 单次处理最多 50 条

	console.log(`Processing reminders at ${now}, scheduled time: ${scheduledTime}`);

	try {
		// 查询需要触发的提醒
		const { results } = await env.DB.prepare(`
      SELECT * FROM reminders
      WHERE status = 'active'
        AND next_trigger_at <= ?
      ORDER BY next_trigger_at ASC
      LIMIT ?
    `).bind(now, batchSize).all();

		console.log(`Found ${results.length} reminders to trigger`);

		// 处理每条提醒
		for (const reminder of results) {
			await processReminder(env, reminder, now);
		}

		// 清理过期的幂等性记录（24小时前）
		await cleanupIdempotencyKeys(env.DB, now - 86400);

	} catch (error) {
		console.error('Cron processing error:', error);
		// 不抛出异常，避免影响下次调度
	}
}

/**
 * 处理单条提醒
 */
async function processReminder(env, reminder, currentTime) {
	const { id, user_id, chat_id, content, schedule_type, schedule_config, timezone, version } = reminder;

	try {
		// 乐观锁：更新状态为 processing
		const lockResult = await env.DB.prepare(`
      UPDATE reminders
      SET version = version + 1, last_triggered_at = ?
      WHERE id = ? AND version = ? AND status = 'active'
    `).bind(currentTime, id, version).run();

		// 如果更新失败，说明被其他进程处理了（并发控制）
		if (lockResult.meta.changes === 0) {
			console.log(`Reminder ${id} already processed by another instance`);
			return;
		}

		// 发送通知
		let sendResult = { success: false, error: 'No notification channel' };

		if (chat_id && env.TELEGRAM_BOT_TOKEN) {
			sendResult = await sendTelegramMessage(
				env.TELEGRAM_BOT_TOKEN,
				chat_id,
				`🔔 提醒：\n${content}`
			);
		}

		// 根据发送结果和类型更新记录
		if (sendResult.success) {
			await handleSuccessfulTrigger(env.DB, reminder, currentTime);
		} else {
			await handleFailedTrigger(env.DB, id, sendResult.error);
		}

	} catch (error) {
		console.error(`Error processing reminder ${id}:`, error);
		await handleFailedTrigger(env.DB, id, error.message);
	}
}

/**
 * 处理成功的触发
 */
async function handleSuccessfulTrigger(db, reminder, currentTime) {
	const { id, schedule_type, schedule_config, timezone } = reminder;
	const config = JSON.parse(schedule_config);

	// 一次性提醒或农历一次性提醒
	if (schedule_type === 'once' || (schedule_type === 'lunar' && config.repeat === false)) {
		await db.prepare(`
			UPDATE reminders
			SET status = 'completed', updated_at = ?, attempts = 0, last_error = NULL
			WHERE id = ?
		`).bind(currentTime, id).run();

		console.log(`Reminder ${id} completed (${schedule_type})`);
	} else {
		// 重复提醒，计算下次触发时间
		const nextTrigger = calculateNextOccurrence(schedule_type, config, timezone, currentTime);

		if (nextTrigger && nextTrigger > 0) {
			await db.prepare(`
				UPDATE reminders
				SET next_trigger_at = ?, updated_at = ?, attempts = 0, last_error = NULL
				WHERE id = ?
			`).bind(nextTrigger, currentTime, id).run();

			console.log(`Reminder ${id} next trigger: ${nextTrigger}`);
		} else {
			// 没有下次触发（可能超过 end_date）
			await db.prepare(`
				UPDATE reminders
				SET status = 'completed', updated_at = ?
				WHERE id = ?
			`).bind(currentTime, id).run();

			console.log(`Reminder ${id} completed (no more occurrences)`);
		}
	}
}

/**
 * 处理失败的触发
 */
async function handleFailedTrigger(db, reminderId, errorMessage) {
	const now = getCurrentTimestamp();

	// 获取当前尝试次数
	const reminder = await db.prepare(`
    SELECT attempts FROM reminders WHERE id = ?
  `).bind(reminderId).first();

	const newAttempts = (reminder?.attempts || 0) + 1;
	const maxAttempts = 3;

	if (newAttempts >= maxAttempts) {
		// 失败次数过多，暂停提醒
		await db.prepare(`
      UPDATE reminders
      SET status = 'paused', attempts = ?, last_error = ?, updated_at = ?
      WHERE id = ?
    `).bind(newAttempts, errorMessage, now, reminderId).run();

		console.log(`Reminder ${reminderId} paused after ${newAttempts} failed attempts`);
	} else {
		// 记录错误，下次继续尝试
		await db.prepare(`
      UPDATE reminders
      SET attempts = ?, last_error = ?, updated_at = ?
      WHERE id = ?
    `).bind(newAttempts, errorMessage, now, reminderId).run();

		console.log(`Reminder ${reminderId} failed (attempt ${newAttempts}/${maxAttempts})`);
	}
}

/**
 * 清理过期的幂等性记录
 */
async function cleanupIdempotencyKeys(db, beforeTimestamp) {
	try {
		await db.prepare(`
      DELETE FROM idempotency_keys WHERE created_at < ?
    `).bind(beforeTimestamp).run();
	} catch (error) {
		console.error('Cleanup idempotency keys error:', error);
	}
}
