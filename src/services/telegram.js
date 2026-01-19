// src/services/telegram.js
// Telegram 发送封装

/**
 * 发送 Telegram 消息
 * @param {string} botToken - Telegram Bot Token
 * @param {string} chatId - Chat ID
 * @param {string} text - 消息文本
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTelegramMessage(botToken, chatId, text) {
	if (!botToken) {
		return { success: false, error: 'Telegram bot token not configured' };
	}

	if (!chatId) {
		return { success: false, error: 'Chat ID not provided' };
	}

	const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				chat_id: chatId,
				text: text,
				parse_mode: 'HTML',
			}),
		});

		const data = await response.json();

		if (data.ok) {
			return { success: true };
		} else {
			return {
				success: false,
				error: data.description || 'Telegram API error'
			};
		}
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * 验证 Telegram Chat ID 是否有效
 */
export async function validateChatId(botToken, chatId) {
	if (!botToken || !chatId) {
		return false;
	}

	try {
		const url = `https://api.telegram.org/bot${botToken}/getChat`;
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ chat_id: chatId }),
		});

		const data = await response.json();
		return data.ok === true;
	} catch (error) {
		console.error('Validate chat ID error:', error);
		return false;
	}
}
