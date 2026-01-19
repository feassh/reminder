// src/utils/db.js
// D1 封装辅助函数

/**
 * 执行查询并返回单行
 */
export async function queryFirst(db, sql, params = []) {
	const stmt = db.prepare(sql);
	return await stmt.bind(...params).first();
}

/**
 * 执行查询并返回所有行
 */
export async function queryAll(db, sql, params = []) {
	const stmt = db.prepare(sql);
	const { results } = await stmt.bind(...params).all();
	return results;
}

/**
 * 执行写操作
 */
export async function execute(db, sql, params = []) {
	const stmt = db.prepare(sql);
	return await stmt.bind(...params).run();
}

/**
 * 事务批处理
 */
export async function batchExecute(db, statements) {
	return await db.batch(statements);
}
