// src/utils/response.js
// 统一响应格式

/**
 * 成功响应
 */
export function SuccessResponse(data, status = 200) {
	return JSON.stringify({
		success: true,
		data: data,
	});
}

/**
 * 错误响应
 */
export function ErrorResponse(code, message, status = 400) {
	return new Response(JSON.stringify({
		success: false,
		error: {
			code: code,
			message: message,
		},
	}), {
		status: status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
		},
	});
}
