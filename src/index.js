// src/index.js
// Worker 入口：处理 HTTP 请求和 Cron 触发

import { handleAPIRequest } from './api.router.js';
import { handleScheduledTrigger } from './services/cron.service.js';

export default {
	/**
	 * HTTP 请求处理器
	 */
	async fetch(request, env, ctx) {
		try {
			// CORS 处理
			if (request.method === 'OPTIONS') {
				return new Response(null, {
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
						'Access-Control-Max-Age': '86400',
					},
				});
			}

			const response = await handleAPIRequest(request, env, ctx);

			// 添加 CORS 头
			response.headers.set('Access-Control-Allow-Origin', '*');
			return response;
		} catch (error) {
			console.error('Unhandled error:', error);
			return new Response(JSON.stringify({
				success: false,
				error: {
					code: 'SERVER_ERROR',
					message: 'Internal server error',
				},
			}), {
				status: 500,
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}
	},

	/**
	 * Cron 定时任务处理器
	 */
	async scheduled(event, env, ctx) {
		try {
			console.log('Cron triggered at:', new Date(event.scheduledTime).toISOString());

			// 使用 waitUntil 确保异步任务完成
			ctx.waitUntil(handleScheduledTrigger(env, event.scheduledTime));
		} catch (error) {
			console.error('Cron handler error:', error);
			// 不抛出异常，避免影响下次调度
		}
	},
};
