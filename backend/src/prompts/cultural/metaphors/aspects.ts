/**
 * 相位比喻库
 *
 * 用通俗比喻解释行星相位的含义
 */

import type { AspectMetaphor } from '../../core/types';

export const ASPECT_METAPHORS: Record<string, AspectMetaphor> = {
  conjunction: {
    name: '合相',
    symbol: '☌',
    zhCN: "两种能量'住在一起'，分不开",
    feeling: '像左手和右手，同时动',
    nature: 'neutral',
  },

  opposition: {
    name: '对冲',
    symbol: '☍',
    zhCN: "两种能量'隔桌相望'，需要平衡",
    feeling: '像翘翘板，这边高那边低',
    nature: 'challenging',
  },

  square: {
    name: '刑相',
    symbol: '□',
    zhCN: "两种能量'互相别扭'，但能逼出行动",
    feeling: '像堵车，烦但最终会动',
    nature: 'challenging',
  },

  trine: {
    name: '三分相',
    symbol: '△',
    zhCN: "两种能量'天然合拍'，顺其自然",
    feeling: '像顺风走路，不费力',
    nature: 'harmonious',
  },

  sextile: {
    name: '六分相',
    symbol: '⚹',
    zhCN: "两种能量'愿意配合'，抓住机会就顺",
    feeling: '像有人给你递了个梯子',
    nature: 'harmonious',
  },

  quincunx: {
    name: '梅花相',
    symbol: '⚻',
    zhCN: "两种能量'鸡同鸭讲'，需要调整",
    feeling: '像穿了不合脚的鞋，得磨合',
    nature: 'challenging',
  },

  semisquare: {
    name: '半刑',
    symbol: '∠',
    zhCN: "轻微的摩擦感",
    feeling: '像小石子硌脚，不严重但烦',
    nature: 'challenging',
  },

  sesquiquadrate: {
    name: '补八分相',
    symbol: '⚼',
    zhCN: "持续的紧张感",
    feeling: '像背景噪音，一直在但不剧烈',
    nature: 'challenging',
  },
};

/** 获取相位比喻 */
export function getAspectMetaphor(aspect: string): AspectMetaphor | undefined {
  return ASPECT_METAPHORS[aspect.toLowerCase()];
}

/** 获取所有相位比喻 */
export function getAllAspectMetaphors(): Record<string, AspectMetaphor> {
  return ASPECT_METAPHORS;
}

/** 判断相位性质 */
export function getAspectNature(aspect: string): 'neutral' | 'harmonious' | 'challenging' {
  return ASPECT_METAPHORS[aspect.toLowerCase()]?.nature ?? 'neutral';
}
