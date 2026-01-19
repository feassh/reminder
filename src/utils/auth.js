// src/utils/auth.js
// 身份认证

/**
 * 验证 API 请求
 */
export async function authenticate(request, env) {
	const authHeader = request.headers.get('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return { success: false, error: 'Missing or invalid Authorization header' };
	}

	const token = authHeader.substring(7);

	try {
		// 从数据库查询 token
		const user = await env.DB.prepare(`
      SELECT user_id FROM users WHERE api_token = ?
    `).bind(token).first();

		if (!user) {
			return { success: false, error: 'Invalid API token' };
		}

		return { success: true, userId: user.user_id };
	} catch (error) {
		console.error('Auth error:', error);
		return { success: false, error: 'Authentication failed' };
	}
}

/**
 * 生成 API Token（用于用户注册）
 */
export function generateToken() {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
