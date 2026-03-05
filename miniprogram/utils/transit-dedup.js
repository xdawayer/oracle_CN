/**
 * Transit 请求去重
 * 首页和今日页共享同一份 transit 缓存，避免重复请求
 */
const storage = require('./storage');
const { request } = require('./request');
const { API_ENDPOINTS } = require('../services/api');

// 全局 in-flight promise map
const inflightTransit = {};

/**
 * 统一 transit 缓存 key（首页+今日共享）
 */
const buildTransitCacheKey = (profile, dateStr) => {
  if (!profile || !profile.birthDate) return null;
  return `transit_shared_${profile.birthDate}_${profile.birthTime || ''}_${profile.birthCity || ''}_${dateStr}`;
};

/**
 * 去重 transit 请求
 * - 先查缓存，命中则直接返回
 * - 已有相同请求在飞则复用 promise
 * - 否则发起新请求
 */
const fetchTransitDedup = (profile, dateStr, query) => {
  const cacheKey = buildTransitCacheKey(profile, dateStr);
  if (!cacheKey) return Promise.reject(new Error('missing profile'));

  // 1. 查缓存
  const cached = storage.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  // 2. 复用 in-flight
  if (inflightTransit[cacheKey]) return inflightTransit[cacheKey];

  // 3. 发起新请求
  inflightTransit[cacheKey] = request({
    url: `${API_ENDPOINTS.DAILY_TRANSIT}?${query}`,
    method: 'GET',
    timeout: 15000,
  })
    .then(res => {
      if (res) storage.set(cacheKey, res);
      delete inflightTransit[cacheKey];
      return res;
    })
    .catch(err => {
      delete inflightTransit[cacheKey];
      throw err;
    });

  return inflightTransit[cacheKey];
};

module.exports = {
  buildTransitCacheKey,
  fetchTransitDedup,
};
