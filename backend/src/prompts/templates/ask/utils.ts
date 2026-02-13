/**
 * 问答模块共享格式化工具
 *
 * 供 ask-answer 和 oracle-answer 模板共用
 */

/** 将 NatalChart positions 转为紧凑文本 */
export function formatChartPositions(chart: any): string {
  if (!chart?.positions?.length) return '无星盘数据';
  const lines: string[] = [];
  for (const p of chart.positions) {
    const name = p.name || p.planet || '';
    const sign = p.sign || '';
    const house = p.house ?? '';
    const deg = typeof p.degree === 'number' ? `${p.degree.toFixed(1)}°` : '';
    lines.push(`${name} ${sign} ${house ? house + '宫' : ''} ${deg}`.trim());
  }
  if (chart.aspects?.length) {
    const topAspects = chart.aspects.slice(0, 8);
    for (const a of topAspects) {
      lines.push(`${a.planet1 || a.body1 || ''} ${a.aspect || a.type || ''} ${a.planet2 || a.body2 || ''} (${typeof a.orb === 'number' ? a.orb.toFixed(1) : a.orb}°)`);
    }
  }
  return lines.join('\n');
}

/** 将紧凑星盘摘要转为文本 */
export function formatChartSummary(summary: any): string {
  if (!summary) return '';
  const lines: string[] = [];
  const big3 = summary.big3 || {};
  const sun = big3.sun;
  const moon = big3.moon;
  const rising = big3.rising;
  if (sun) lines.push(`太阳 ${sun.sign || ''} ${sun.house ? sun.house + '宫' : ''}`.trim());
  if (moon) lines.push(`月亮 ${moon.sign || ''} ${moon.house ? moon.house + '宫' : ''}`.trim());
  if (rising) lines.push(`上升 ${rising.sign || ''} ${rising.house ? rising.house + '宫' : ''}`.trim());
  if (summary.personal_planets?.length) {
    for (const p of summary.personal_planets) {
      lines.push(`${p.name || ''} ${p.sign || ''} ${p.house ? p.house + '宫' : ''}`.trim());
    }
  }
  if (summary.top_aspects?.length) {
    const top = summary.top_aspects.slice(0, 8);
    for (const a of top) {
      lines.push(`${a.planet1 || ''} ${a.type || a.aspect || ''} ${a.planet2 || ''} (${typeof a.orb === 'number' ? a.orb.toFixed(1) : a.orb}°)`);
    }
  }
  return lines.join('\n');
}

/** 将行运摘要转为紧凑文本 */
export function formatTransitSummary(summary: any): string {
  if (!summary) return '';
  const lines: string[] = [];
  if (summary.key_transits?.length) {
    for (const p of summary.key_transits) {
      lines.push(`行运${p.name || ''} ${p.sign || ''} ${p.house ? p.house + '宫' : ''}`.trim());
    }
  }
  if (summary.top_aspects?.length) {
    for (const a of summary.top_aspects.slice(0, 6)) {
      lines.push(`行运${a.planet1 || ''} ${a.type || a.aspect || ''} 本命${a.planet2 || ''}`);
    }
  }
  if (summary.moon_phase) {
    lines.push(`月相：${summary.moon_phase}`);
  }
  return lines.join('\n');
}

/** 将行运数据转为紧凑文本 */
export function formatTransits(transits: any): string {
  if (!transits) return '';
  if (transits.positions?.length) {
    const lines: string[] = [];
    for (const p of transits.positions) {
      lines.push(`行运${p.name || ''} ${p.sign || ''} ${p.house ? p.house + '宫' : ''}`);
    }
    if (transits.aspects?.length) {
      for (const a of transits.aspects.slice(0, 6)) {
        lines.push(`行运${a.transit || a.planet1 || ''} ${a.aspect || a.type || ''} 本命${a.natal || a.planet2 || ''}`);
      }
    }
    return lines.join('\n');
  }
  return JSON.stringify(transits).slice(0, 500);
}
