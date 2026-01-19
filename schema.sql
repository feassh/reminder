-- schema.sql
-- Cloudflare D1 (SQLite) Schema for Reminder System

-- Users table (简单 token 映射)
CREATE TABLE IF NOT EXISTS users (
									 id INTEGER PRIMARY KEY AUTOINCREMENT,
									 user_id TEXT NOT NULL UNIQUE,
									 api_token TEXT NOT NULL UNIQUE,
									 created_at INTEGER NOT NULL
);

CREATE INDEX idx_users_token ON users(api_token);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
										 id INTEGER PRIMARY KEY AUTOINCREMENT,
										 user_id TEXT NOT NULL,
										 chat_id TEXT NULL,              -- Telegram chat id (optional if webhook)
										 content TEXT NOT NULL,
										 schedule_type TEXT NOT NULL,    -- 'once' | 'daily' | 'weekly' | 'lunar'
										 schedule_config TEXT NOT NULL,  -- JSON string
										 next_trigger_at INTEGER NOT NULL, -- unix seconds (UTC)
										 status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'paused'
										 timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai', -- IANA timezone
										 version INTEGER NOT NULL DEFAULT 0, -- 乐观锁版本号
										 attempts INTEGER NOT NULL DEFAULT 0, -- 发送尝试次数
										 last_error TEXT NULL,           -- 最后一次错误信息
										 last_triggered_at INTEGER NULL, -- 上次触发时间
										 created_at INTEGER NOT NULL,
										 updated_at INTEGER NOT NULL,
										 FOREIGN KEY (user_id) REFERENCES users(user_id)
	);

CREATE INDEX idx_next_trigger ON reminders(next_trigger_at, status);
CREATE INDEX idx_status ON reminders(status);
CREATE INDEX idx_user_id ON reminders(user_id);

-- Idempotency keys table (24小时过期)
CREATE TABLE IF NOT EXISTS idempotency_keys (
												key TEXT PRIMARY KEY,
												response TEXT NOT NULL, -- JSON response
												created_at INTEGER NOT NULL
);

CREATE INDEX idx_idempotency_created ON idempotency_keys(created_at);

-- Webhooks table (可选功能)
CREATE TABLE IF NOT EXISTS webhooks (
										id INTEGER PRIMARY KEY AUTOINCREMENT,
										user_id TEXT NOT NULL,
										url TEXT NOT NULL,
										secret TEXT NOT NULL, -- HMAC secret
										events TEXT NOT NULL, -- JSON array: ['reminder.triggered']
										status TEXT NOT NULL DEFAULT 'active',
										created_at INTEGER NOT NULL,
										FOREIGN KEY (user_id) REFERENCES users(user_id)
	);
