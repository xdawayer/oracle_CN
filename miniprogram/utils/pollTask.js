const { request } = require('./request');
const logger = require('./logger');

/**
 * 轮询异步任务结果（通用工具，适用于 detail/ask/cbt 等异步任务模式）
 * @param {string} resultUrl - 轮询端点 base URL（不含 taskId）
 * @param {string} taskId - 任务 ID
 * @param {Object} [options]
 * @param {number} [options.maxAttempts=60] - 最多轮询次数
 * @param {number} [options.interval=2000] - 轮询间隔 ms
 * @param {Function} [options.shouldCancel] - 返回 true 时取消轮询
 * @returns {Promise<Object>} 已完成的任务结果
 */
async function pollTaskResult(resultUrl, taskId, options = {}) {
  const maxAttempts = options.maxAttempts || 60;
  const interval = options.interval || 2000;
  const shouldCancel = options.shouldCancel || (() => false);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, interval));
    if (shouldCancel()) throw new Error('cancelled');
    try {
      const res = await request({
        url: resultUrl + '/' + taskId,
        method: 'GET',
        timeout: 10000,
      });
      if (res && res.status === 'completed') return res;
      if (res && res.status === 'failed') {
        const err = new Error(res.error || 'Task failed');
        err.statusCode = res.statusCode || 500;
        throw err;
      }
      // status === 'pending' → continue polling
    } catch (pollErr) {
      // 任务级失败（有 statusCode）→ 直接抛出
      if (pollErr && pollErr.statusCode) throw pollErr;
      // 网络波动 → 继续重试
      logger.warn('[pollTask] network error (attempt ' + i + '):', pollErr && pollErr.message);
    }
  }
  throw new Error('timeout');
}

module.exports = { pollTaskResult };
