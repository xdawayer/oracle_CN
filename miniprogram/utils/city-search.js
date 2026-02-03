/**
 * 城市搜索工具
 * 支持汉字、拼音、拼音首字母、英文搜索
 */

const { cities } = require('../data/cities');

/**
 * 搜索城市
 * @param {string} query 搜索关键词
 * @param {number} limit 返回结果数量限制，默认5
 * @returns {Array} 匹配的城市列表
 */
function searchCities(query, limit = 5) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const keyword = query.trim().toLowerCase();
  if (!keyword) {
    return [];
  }

  const results = [];

  for (const city of cities) {
    const score = calculateScore(city, keyword);
    if (score > 0) {
      results.push({ ...city, score });
    }
  }

  // 按分数降序排序
  results.sort((a, b) => b.score - a.score);

  // 返回限制数量的结果
  return results.slice(0, limit).map(({ score, ...city }) => city);
}

/**
 * 计算城市与关键词的匹配分数
 * @param {Object} city 城市对象
 * @param {string} keyword 搜索关键词（已转小写）
 * @returns {number} 匹配分数，0表示不匹配
 */
function calculateScore(city, keyword) {
  let score = 0;

  // 城市名完全匹配 (100分)
  if (city.name === keyword) {
    return 100;
  }

  // 城市名前缀匹配 (80分)
  if (city.name.startsWith(keyword)) {
    score = Math.max(score, 80);
  }

  // 城市名包含匹配 (30分)
  if (city.name.includes(keyword)) {
    score = Math.max(score, 30);
  }

  // 拼音完全匹配 (70分)
  if (city.pinyin === keyword) {
    score = Math.max(score, 70);
  }

  // 拼音前缀匹配 (60分)
  if (city.pinyin && city.pinyin.startsWith(keyword)) {
    score = Math.max(score, 60);
  }

  // 拼音包含匹配 (25分)
  if (city.pinyin && city.pinyin.includes(keyword)) {
    score = Math.max(score, 25);
  }

  // 拼音首字母完全匹配 (50分)
  if (city.pinyinAbbr === keyword) {
    score = Math.max(score, 50);
  }

  // 拼音首字母前缀匹配 (45分)
  if (city.pinyinAbbr && city.pinyinAbbr.startsWith(keyword)) {
    score = Math.max(score, 45);
  }

  // 英文名匹配
  if (city.enName) {
    const enNameLower = city.enName.toLowerCase();
    // 英文名完全匹配 (70分)
    if (enNameLower === keyword) {
      score = Math.max(score, 70);
    }
    // 英文名前缀匹配 (55分)
    if (enNameLower.startsWith(keyword)) {
      score = Math.max(score, 55);
    }
    // 英文名包含匹配 (20分)
    if (enNameLower.includes(keyword)) {
      score = Math.max(score, 20);
    }
  }

  // 省份名匹配 (20分)
  if (city.province && city.province.includes(keyword)) {
    score = Math.max(score, 20);
  }

  return score;
}

/**
 * 格式化城市显示文本
 * @param {Object} city 城市对象
 * @returns {string} 格式化后的显示文本，如 "北京, 北京, 中国"
 */
function formatCityDisplay(city) {
  if (!city) return '';

  const parts = [city.name];
  if (city.province && city.province !== city.name) {
    parts.push(city.province);
  }
  if (city.country) {
    parts.push(city.country);
  }

  return parts.join(', ');
}

/**
 * 标准化逗号（将中文逗号转换为英文逗号）
 * @param {string} str 输入字符串
 * @returns {string} 标准化后的字符串
 */
function normalizeCommas(str) {
  if (!str) return '';
  return str.replace(/，/g, ',').replace(/\s*,\s*/g, ', ');
}

/**
 * 解析城市字符串，尝试匹配标准城市
 * @param {string} input 用户输入的城市字符串
 * @returns {Object|null} 匹配到的城市对象，或null
 */
function parseCityString(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const normalized = normalizeCommas(input.trim());

  // 尝试按逗号分割
  const parts = normalized.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  // 提取城市名（第一部分）
  const cityName = parts[0];

  // 首先尝试精确匹配城市名
  let match = cities.find(c => c.name === cityName);
  if (match) {
    return match;
  }

  // 尝试匹配英文名
  match = cities.find(c => c.enName && c.enName.toLowerCase() === cityName.toLowerCase());
  if (match) {
    return match;
  }

  // 尝试匹配拼音
  match = cities.find(c => c.pinyin === cityName.toLowerCase());
  if (match) {
    return match;
  }

  // 如果有省份信息，尝试组合匹配
  if (parts.length >= 2) {
    const province = parts[1];
    match = cities.find(c =>
      c.name === cityName &&
      (c.province === province || c.province.includes(province) || province.includes(c.province))
    );
    if (match) {
      return match;
    }
  }

  // 使用模糊搜索返回最匹配的结果
  const searchResults = searchCities(cityName, 1);
  if (searchResults.length > 0) {
    return searchResults[0];
  }

  return null;
}

/**
 * 尝试自动匹配城市并返回标准化格式
 * @param {string} input 用户输入
 * @returns {Object} { city: 城市对象或null, displayText: 显示文本 }
 */
function autoMatchCity(input) {
  if (!input || typeof input !== 'string' || !input.trim()) {
    return { city: null, displayText: '' };
  }

  const city = parseCityString(input);

  if (city) {
    return {
      city,
      displayText: formatCityDisplay(city)
    };
  }

  // 无法匹配时返回原始输入（标准化逗号）
  return {
    city: null,
    displayText: normalizeCommas(input.trim())
  };
}

/**
 * 根据城市获取经纬度和时区信息
 * @param {Object} city 城市对象
 * @returns {Object} { lat, lon, timezone }
 */
function getCityCoordinates(city) {
  if (!city) {
    return { lat: null, lon: null, timezone: null };
  }

  // 简单时区计算：基于经度
  // 东经每15度为1个时区
  let timezone = 8; // 默认东八区（中国）
  if (city.lon !== undefined) {
    timezone = Math.round(city.lon / 15);
  }

  return {
    lat: city.lat,
    lon: city.lon,
    timezone: timezone.toString()
  };
}

module.exports = {
  searchCities,
  formatCityDisplay,
  normalizeCommas,
  parseCityString,
  autoMatchCity,
  getCityCoordinates
};
