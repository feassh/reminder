// src/controllers/reminders.js
// API 控制器实现

import { validateReminderInput, validateUpdateInput } from '../utils/validator.js';
import { SuccessResponse, ErrorResponse } from '../utils/response.js';
import { calculateNextTrigger, generatePreview } from '../services/reminder.service.js';
import { checkIdempotency, saveIdempotency } from '../utils/idempotency.js';
import { sendTelegramMessage } from '../services/telegram.js';
import { getCurrentTimestamp, unixToISO } from '../utils/time.js';

/**
 * 创建提醒
 */
export async function createReminder(request, env, userId) {
	const idempotencyKey = request.headers.get('Idempotency-Key');

	// 检查幂等性
	if (idempotencyKey) {
		const cached = await checkIdempotency(env.DB, idempotencyKey);
		if (cached) {
			return new Response(cached.response, {
				status: 200,
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
			});
		}
	}

	const body = await request.json();

	// 验证输入
	const validation = validateReminderInput(body);
	if (!validation.valid) {
		return ErrorResponse('BAD_REQUEST', validation.error, 400);
	}

	const { content, schedule_type, schedule_config, timezone, chat_id, preview } = body;

	try {
		// 计算下次触发时间
		const nextTrigger = calculateNextTrigger(schedule_type, schedule_config, timezone);

		if (!nextTrigger || nextTrigger <= 0) {
			return ErrorResponse('INVALID_SCHEDULE', 'Cannot calculate next trigger time', 400);
		}

		const now = getCurrentTimestamp();

		// 插入数据库
		const result = await env.DB.prepare(`
      INSERT INTO reminders (user_id, chat_id, content, schedule_type, schedule_config,
                             next_trigger_at, timezone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
			userId,
			chat_id || null,
			content,
			schedule_type,
			JSON.stringify(schedule_config),
			nextTrigger,
			timezone || 'Asia/Shanghai',
			now,
			now
		).run();

		const reminderId = result.meta.last_row_id;

		// 生成预览
		let previewData = null;
		if (preview && preview > 0) {
			previewData = generatePreview(schedule_type, schedule_config, timezone, preview);
		}

		const responseData = {
			id: reminderId,
			next_trigger_at: nextTrigger,
			next_trigger_at_iso: unixToISO(nextTrigger),
			preview: previewData,
		};

		const response = SuccessResponse(responseData, 201);

		// 保存幂等性记录
		if (idempotencyKey) {
			await saveIdempotency(env.DB, idempotencyKey, response);
		}

		return new Response(response, {
			status: 201,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (error) {
		console.error('Create reminder error:', error);
		return ErrorResponse('SERVER_ERROR', error.message, 500);
	}
}

/**
 * 获取提醒列表
 */
export async function listReminders(request, env, userId) {
	const url = new URL(request.url);
	const status = url.searchParams.get('status') || 'active';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
	const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1);
	const offset = (page - 1) * limit;

	try {
		// 查询总数
		const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM reminders WHERE user_id = ? AND status = ?
    `).bind(userId, status).first();

		// 查询列表
		const { results } = await env.DB.prepare(`
      SELECT * FROM reminders
      WHERE user_id = ? AND status = ?
      ORDER BY next_trigger_at ASC
      LIMIT ? OFFSET ?
    `).bind(userId, status, limit, offset).all();

		const items = results.map(row => ({
			id: row.id,
			content: row.content,
			schedule_type: row.schedule_type,
			schedule_config: JSON.parse(row.schedule_config),
			next_trigger_at: row.next_trigger_at,
			next_trigger_at_iso: unixToISO(row.next_trigger_at),
			status: row.status,
			timezone: row.timezone,
			created_at: row.created_at,
			updated_at: row.updated_at,
		}));

		return new Response(SuccessResponse({
			items,
			meta: {
				page,
				limit,
				total: countResult.total,
				total_pages: Math.ceil(countResult.total / limit),
			},
		}), {
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (error) {
		console.error('List reminders error:', error);
		return ErrorResponse('SERVER_ERROR', error.message, 500);
	}
}

/**
 * 获取单个提醒
 */
export async function getReminder(request, env, userId, reminderId) {
	try {
		const reminder = await env.DB.prepare(`
      SELECT * FROM reminders WHERE id = ? AND user_id = ?
    `).bind(reminderId, userId).first();

		if (!reminder) {
			return ErrorResponse('NOT_FOUND', 'Reminder not found', 404);
		}

		return new Response(SuccessResponse({
			id: reminder.id,
			content: reminder.content,
			chat_id: reminder.chat_id,
			schedule_type: reminder.schedule_type,
			schedule_config: JSON.parse(reminder.schedule_config),
			next_trigger_at: reminder.next_trigger_at,
			next_trigger_at_iso: unixToISO(reminder.next_trigger_at),
			status: reminder.status,
			timezone: reminder.timezone,
			attempts: reminder.attempts,
			last_error: reminder.last_error,
			last_triggered_at: reminder.last_triggered_at,
			created_at: reminder.created_at,
			updated_at: reminder.updated_at,
		}), {
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (error) {
		console.error('Get reminder error:', error);
		return ErrorResponse('SERVER_ERROR', error.message, 500);
	}
}

/**
 * 更新提醒
 */
export async function updateReminder(request, env, userId, reminderId) {
	const body = await request.json();

	const validation = validateUpdateInput(body);
	if (!validation.valid) {
		return ErrorResponse('BAD_REQUEST', validation.error, 400);
	}

	try {
		// 获取现有记录
		const existing = await env.DB.prepare(`
      SELECT * FROM reminders WHERE id = ? AND user_id = ?
    `).bind(reminderId, userId).first();

		if (!existing) {
			return ErrorResponse('NOT_FOUND', 'Reminder not found', 404);
		}

		// 合并更新字段
		const updates = {
			content: body.content ?? existing.content,
			chat_id: body.chat_id ?? existing.chat_id,
			schedule_type: body.schedule_type ?? existing.schedule_type,
			schedule_config: body.schedule_config ?? JSON.parse(existing.schedule_config),
			timezone: body.timezone ?? existing.timezone,
			status: body.status ?? existing.status,
		};

		// 重新计算 next_trigger_at（如果调度配置改变）
		let nextTrigger = existing.next_trigger_at;
		if (body.schedule_type || body.schedule_config || body.timezone) {
			nextTrigger = calculateNextTrigger(
				updates.schedule_type,
				updates.schedule_config,
				updates.timezone
			);
		}

		const now = getCurrentTimestamp();

		// 更新数据库
		await env.DB.prepare(`
      UPDATE reminders
      SET content = ?, chat_id = ?, schedule_type = ?, schedule_config = ?,
          timezone = ?, status = ?, next_trigger_at = ?, updated_at = ?, version = version + 1
      WHERE id = ? AND user_id = ?
    `).bind(
			updates.content,
			updates.chat_id,
			updates.schedule_type,
			JSON.stringify(updates.schedule_config),
			updates.timezone,
			updates.status,
			nextTrigger,
			now,
			reminderId,
			userId
		).run();

		// 生成预览
		let previewData = null;
		if (body.preview && body.preview > 0) {
			previewData = generatePreview(
				updates.schedule_type,
				updates.schedule_config,
				updates.timezone,
				body.preview
			);
		}

		return new Response(SuccessResponse({
			id: parseInt(reminderId),
			next_trigger_at: nextTrigger,
			next_trigger_at_iso: unixToISO(nextTrigger),
			preview: previewData,
		}), {
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (error) {
		console.error('Update reminder error:', error);
		return ErrorResponse('SERVER_ERROR', error.message, 500);
	}
}

/**
 * 删除提醒
 */
export async function deleteReminder(request, env, userId, reminderId) {
	try {
		const result = await env.DB.prepare(`
      DELETE FROM reminders WHERE id = ? AND user_id = ?
    `).bind(reminderId, userId).run();

		if (result.meta.changes === 0) {
			return ErrorResponse('NOT_FOUND', 'Reminder not found', 404);
		}

		return new Response(SuccessResponse({ deleted: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (error) {
		console.error('Delete reminder error:', error);
		return ErrorResponse('SERVER_ERROR', error.message, 500);
	}
}

/**
 * 测试触发
 */
export async function testTrigger(request, env, userId, reminderId) {
	try {
		const reminder = await env.DB.prepare(`
      SELECT * FROM reminders WHERE id = ? AND user_id = ?
    `).bind(reminderId, userId).first();

		if (!reminder) {
			return ErrorResponse('NOT_FOUND', 'Reminder not found', 404);
		}

		// 尝试发送 Telegram 消息
		let result = { success: false, message: 'No notification channel configured' };

		if (reminder.chat_id && env.TELEGRAM_BOT_TOKEN) {
			result = await sendTelegramMessage(
				env.TELEGRAM_BOT_TOKEN,
				reminder.chat_id,
				`🔔 Test Reminder:\n${reminder.content}`
			);
		}

		return new Response(SuccessResponse({
			reminder_id: reminder.id,
			test_result: result,
		}), {
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (error) {
		console.error('Test trigger error:', error);
		return ErrorResponse('SERVER_ERROR', error.message, 500);
	}
}

/**
 * 批量创建
 */
export async function bulkCreate(request, env, userId) {
	const body = await request.json();

	if (!Array.isArray(body.reminders) || body.reminders.length === 0) {
		return ErrorResponse('BAD_REQUEST', 'reminders array is required', 400);
	}

	if (body.reminders.length > 50) {
		return ErrorResponse('BAD_REQUEST', 'Maximum 50 reminders per batch', 400);
	}

	const results = [];
	const now = getCurrentTimestamp();

	try {
		for (const reminderData of body.reminders) {
			try {
				const validation = validateReminderInput(reminderData);
				if (!validation.valid) {
					results.push({ success: false, error: validation.error, data: reminderData });
					continue;
				}

				const { content, schedule_type, schedule_config, timezone, chat_id } = reminderData;
				const nextTrigger = calculateNextTrigger(schedule_type, schedule_config, timezone);

				if (!nextTrigger || nextTrigger <= 0) {
					results.push({ success: false, error: 'Invalid schedule', data: reminderData });
					continue;
				}

				const result = await env.DB.prepare(`
          INSERT INTO reminders (user_id, chat_id, content, schedule_type, schedule_config,
                                 next_trigger_at, timezone, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
					userId,
					chat_id || null,
					content,
					schedule_type,
					JSON.stringify(schedule_config),
					nextTrigger,
					timezone || 'Asia/Singapore',
					now,
					now
				).run();

				results.push({
					success: true,
					id: result.meta.last_row_id,
					next_trigger_at: nextTrigger
				});
			} catch (error) {
				results.push({ success: false, error: error.message, data: reminderData });
			}
		}

		return new Response(SuccessResponse({ results }), {
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (error) {
		console.error('Bulk create error:', error);
		return ErrorResponse('SERVER_ERROR', error.message, 500);
	}
}
