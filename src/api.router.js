// src/api.router.js
// HTTP API 路由与请求分派

import * as RemindersController from './controllers/reminders.js';
import { authenticate } from './utils/auth.js';
import { ErrorResponse } from './utils/response.js';

/**
 * 路由处理主函数
 */
export async function handleAPIRequest(request, env, ctx) {
	const url = new URL(request.url);
	const path = url.pathname;
	const method = request.method;

	// 健康检查
	if (path === '/health' || path === '/') {
		return new Response(JSON.stringify({
			success: true,
			data: { status: 'healthy', service: 'reminder-system' },
		}), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// API 路由匹配
	const apiMatch = path.match(/^\/api\/reminders(\/([^\/]+))?(\/(.+))?$/);

	if (!apiMatch) {
		return ErrorResponse('NOT_FOUND', 'Endpoint not found', 404);
	}

	// 身份验证（除了 OPTIONS）
	const authResult = await authenticate(request, env);
	if (!authResult.success) {
		return ErrorResponse('UNAUTHORIZED', authResult.error, 401);
	}

	const userId = authResult.userId;
	const [, , id, , action] = apiMatch;

	// 路由分发
	try {
		// POST /api/reminders - 创建提醒
		if (method === 'POST' && !id) {
			return await RemindersController.createReminder(request, env, userId);
		}

		// GET /api/reminders - 列表
		if (method === 'GET' && !id) {
			return await RemindersController.listReminders(request, env, userId);
		}

		// GET /api/reminders/:id - 获取单个
		if (method === 'GET' && id && !action) {
			return await RemindersController.getReminder(request, env, userId, id);
		}

		// PUT /api/reminders/:id - 更新
		if (method === 'PUT' && id && !action) {
			return await RemindersController.updateReminder(request, env, userId, id);
		}

		// DELETE /api/reminders/:id - 删除
		if (method === 'DELETE' && id && !action) {
			return await RemindersController.deleteReminder(request, env, userId, id);
		}

		// POST /api/reminders/:id/test-trigger - 测试触发
		if (method === 'POST' && id && action === 'test-trigger') {
			return await RemindersController.testTrigger(request, env, userId, id);
		}

		// POST /api/reminders/bulk - 批量创建
		if (method === 'POST' && id === 'bulk') {
			return await RemindersController.bulkCreate(request, env, userId);
		}

		return ErrorResponse('NOT_FOUND', 'Endpoint not found', 404);
	} catch (error) {
		console.error('Route handler error:', error);
		return ErrorResponse('SERVER_ERROR', error.message, 500);
	}
}
