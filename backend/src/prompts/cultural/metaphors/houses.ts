/**
 * 宫位比喻库
 *
 * 用现代生活场景解释 12 宫的含义
 */

import type { HouseMetaphor } from '../../core/types';

export const HOUSE_METAPHORS: Record<number, HouseMetaphor> = {
  1: {
    name: '第一宫',
    zhCN: "你的'第一印象'和身体",
    description: '别人见到你的第一眼',
  },

  2: {
    name: '第二宫',
    zhCN: "你的'钱包'和安全感",
    description: "觉得什么东西是'我的'",
  },

  3: {
    name: '第三宫',
    zhCN: "你的'朋友圈'和日常沟通",
    description: '怎么和周围人聊天',
  },

  4: {
    name: '第四宫',
    zhCN: "你的'家'和内心根基",
    description: '关起门来的样子',
  },

  5: {
    name: '第五宫',
    zhCN: "你的'玩心'和创造力",
    description: '恋爱和兴趣爱好',
  },

  6: {
    name: '第六宫',
    zhCN: "你的'工作台'和健康",
    description: '日复一日的事',
  },

  7: {
    name: '第七宫',
    zhCN: "你的'镜子'和伴侣",
    description: '一对一关系中的你',
  },

  8: {
    name: '第八宫',
    zhCN: "你的'深水区'和亲密",
    description: '共享资源和心理深处',
  },

  9: {
    name: '第九宫',
    zhCN: "你的'远方'和信仰",
    description: '想探索的大世界',
  },

  10: {
    name: '第十宫',
    zhCN: "你的'名片'和事业",
    description: '社会上的你',
  },

  11: {
    name: '第十一宫',
    zhCN: "你的'圈子'和理想",
    description: '朋友群和归属感',
  },

  12: {
    name: '第十二宫',
    zhCN: "你的'后台'和潜意识",
    description: '自己都不太看得见的部分',
  },
};

/** 获取宫位比喻 */
export function getHouseMetaphor(house: number): HouseMetaphor | undefined {
  return HOUSE_METAPHORS[house];
}

/** 获取所有宫位比喻 */
export function getAllHouseMetaphors(): Record<number, HouseMetaphor> {
  return HOUSE_METAPHORS;
}

/** 宫位分组 */
export const HOUSE_GROUPS = {
  /** 角宫（行动力） */
  angular: [1, 4, 7, 10],
  /** 续宫（稳定性） */
  succedent: [2, 5, 8, 11],
  /** 果宫（适应性） */
  cadent: [3, 6, 9, 12],

  /** 个人宫位 */
  personal: [1, 2, 3, 4, 5, 6],
  /** 社会宫位 */
  social: [7, 8, 9, 10, 11, 12],

  /** 火象宫（自我表达） */
  fire: [1, 5, 9],
  /** 土象宫（物质安全） */
  earth: [2, 6, 10],
  /** 风象宫（关系沟通） */
  air: [3, 7, 11],
  /** 水象宫（情感深度） */
  water: [4, 8, 12],
};
