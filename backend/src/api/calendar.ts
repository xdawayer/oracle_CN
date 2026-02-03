// INPUT: 农历日期
// OUTPUT: 对应的公历日期
// POS: 农历转公历 API；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router, Request, Response } from 'express';
import { Lunar, Solar } from 'lunar-javascript';

export const calendarRouter = Router();

interface LunarToSolarRequest {
  year: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
}

interface LunarToSolarResponse {
  success: boolean;
  solarDate?: string;
  lunarDate?: string;
  error?: string;
}

/**
 * 验证农历日期的合法性
 */
function validateLunarDate(year: number, month: number, day: number, isLeapMonth: boolean): string | null {
  // 年份范围验证（lunar-javascript 支持 1900-2100）
  if (year < 1900 || year > 2100) {
    return '年份超出范围，请输入 1900-2100 年间的日期';
  }

  // 月份验证
  if (month < 1 || month > 12) {
    return '无效的农历月份';
  }

  // 日期验证
  if (day < 1 || day > 30) {
    return '无效的农历日期';
  }

  // 检查闰月是否存在
  if (isLeapMonth) {
    try {
      const lunar = Lunar.fromYmd(year, month, day);
      const lunarYear = lunar.getYear();
      // 获取该年的闰月
      const leapMonth = Lunar.fromYmd(year, 1, 1).getYear() === lunarYear
        ? getLunarLeapMonth(year)
        : 0;

      if (leapMonth !== month) {
        return `${year}年没有闰${month}月`;
      }
    } catch {
      return '无效的农历日期';
    }
  }

  // 尝试创建农历日期，验证日期是否存在
  try {
    if (isLeapMonth) {
      // 闰月日期
      Lunar.fromYmd(year, -month, day);
    } else {
      Lunar.fromYmd(year, month, day);
    }
  } catch {
    return '该农历日期不存在，请检查';
  }

  return null;
}

/**
 * 获取农历年的闰月（0 表示无闰月）
 */
function getLunarLeapMonth(year: number): number {
  try {
    // 通过遍历月份找出闰月
    for (let m = 1; m <= 12; m++) {
      try {
        const lunar = Lunar.fromYmd(year, -m, 1);
        if (lunar) return m;
      } catch {
        // 不是闰月，继续
      }
    }
  } catch {
    // 忽略错误
  }
  return 0;
}

/**
 * POST /api/calendar/lunar-to-solar
 * 将农历日期转换为公历日期
 */
calendarRouter.post('/lunar-to-solar', (req: Request, res: Response) => {
  try {
    const { year, month, day, isLeapMonth = false } = req.body as LunarToSolarRequest;

    // 参数类型验证
    if (typeof year !== 'number' || typeof month !== 'number' || typeof day !== 'number') {
      const response: LunarToSolarResponse = {
        success: false,
        error: '请提供有效的年、月、日数值'
      };
      return res.status(400).json(response);
    }

    // 农历日期验证
    const validationError = validateLunarDate(year, month, day, isLeapMonth);
    if (validationError) {
      const response: LunarToSolarResponse = {
        success: false,
        error: validationError
      };
      return res.status(400).json(response);
    }

    // 转换农历到公历
    let lunar: any;
    if (isLeapMonth) {
      // 闰月使用负数月份
      lunar = Lunar.fromYmd(year, -month, day);
    } else {
      lunar = Lunar.fromYmd(year, month, day);
    }

    const solar: Solar = lunar.getSolar();

    // 格式化公历日期
    const solarYear = solar.getYear();
    const solarMonth = String(solar.getMonth()).padStart(2, '0');
    const solarDay = String(solar.getDay()).padStart(2, '0');
    const solarDate = `${solarYear}-${solarMonth}-${solarDay}`;

    // 格式化农历日期用于返回
    const lunarMonthStr = isLeapMonth ? `闰${month}` : String(month);
    const lunarDate = `农历${year}年${lunarMonthStr}月${day}日`;

    const response: LunarToSolarResponse = {
      success: true,
      solarDate,
      lunarDate
    };

    return res.json(response);
  } catch (error) {
    console.error('Lunar to solar conversion error:', error);
    const response: LunarToSolarResponse = {
      success: false,
      error: '日期转换失败，请检查输入的农历日期是否正确'
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/calendar/leap-month/:year
 * 获取指定年份的闰月信息
 */
calendarRouter.get('/leap-month/:year', (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year, 10);

    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({
        success: false,
        error: '请提供 1900-2100 年间的有效年份'
      });
    }

    const leapMonth = getLunarLeapMonth(year);

    return res.json({
      success: true,
      year,
      leapMonth,
      hasLeapMonth: leapMonth > 0
    });
  } catch (error) {
    console.error('Get leap month error:', error);
    return res.status(500).json({
      success: false,
      error: '获取闰月信息失败'
    });
  }
});
