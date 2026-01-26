// INPUT: Geo API 路由（含多语言查询参数）。
// OUTPUT: 导出 geo 路由（支持多语言与结构化位置搜索）。
// POS: Geo 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { searchCities } from '../services/geocoding.js';

export const geoRouter = Router();

// GET /api/geo/search - 城市模糊搜索
geoRouter.get('/search', async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(Number(req.query.limit) || 5, 10);

    if (!query) {
      return res.json({ cities: [] });
    }

    const langParam = typeof req.query.lang === 'string' ? req.query.lang : undefined;
    const language = langParam === 'zh' || langParam === 'en' ? langParam : undefined;
    const cities = await searchCities(query, limit, { language });
    res.json({ cities });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
