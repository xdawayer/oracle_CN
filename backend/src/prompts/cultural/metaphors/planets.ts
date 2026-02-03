/**
 * 行星比喻库
 *
 * 用中国文化意象解释行星的心理学含义
 */

import type { PlanetMetaphor } from '../../core/types';

export const PLANET_METAPHORS: Record<string, PlanetMetaphor> = {
  sun: {
    name: '太阳',
    zhCN: "你的'主心骨'",
    description: '内心最想成为的那个人',
    metaphor: '就像一棵树的主干，决定了你向哪个方向生长',
    questions: [
      "当别人问'你是谁'时，你最想怎么介绍自己？",
      "做什么事情时你觉得'这才是我'？",
    ],
  },

  moon: {
    name: '月亮',
    zhCN: "你的'情绪底色'",
    description: '小时候形成的安全感模式',
    metaphor: '就像回到家脱下盔甲后的那个你',
    questions: [
      '压力大时你本能想做什么？（吃东西/找人聊/独处）',
      "什么样的环境让你觉得'安全'？",
    ],
  },

  mercury: {
    name: '水星',
    zhCN: "你的'脑回路'",
    description: '处理信息和表达的方式',
    metaphor: "决定了你是'先想再说'还是'边想边说'",
    questions: [
      '做决定时你是快还是慢？',
      '和别人解释事情时你的风格是什么？',
    ],
  },

  venus: {
    name: '金星',
    zhCN: "你的'爱的方式'",
    description: '什么让你感到被爱和值得',
    metaphor: "决定了你是'礼物型'还是'陪伴型'",
    questions: [
      "你觉得怎样才算'被爱'？",
      '你表达爱的方式是什么？',
    ],
  },

  mars: {
    name: '火星',
    zhCN: "你的'行动力开关'",
    description: '愤怒时和追求目标时的样子',
    metaphor: '像油门和刹车，决定你冲不冲',
    questions: [
      '生气时你是爆发型还是压抑型？',
      '追求想要的东西时有多主动？',
    ],
  },

  jupiter: {
    name: '木星',
    zhCN: "你的'贵人运'",
    description: '信念系统，觉得什么值得相信',
    metaphor: '像一扇容易打开的门，机会从这里来',
    questions: [
      '你觉得人生什么最重要？',
      '运气好的时候通常是什么领域？',
    ],
  },

  saturn: {
    name: '土星',
    zhCN: "你的'内在考官'",
    description: '那个对自己最严格的声音',
    metaphor: '就像一个严厉但最终为你好的长辈',
    questions: [
      '你最害怕在什么事上失败？',
      '你对自己最高的标准在哪里？',
    ],
  },

  uranus: {
    name: '天王星',
    zhCN: "你的'叛逆因子'",
    description: '不想随大流的那部分',
    metaphor: '像系统里的 bug，但有时 bug 是 feature',
    questions: [
      "你在哪些方面觉得自己'和别人不一样'？",
      '什么规则你觉得没必要遵守？',
    ],
  },

  neptune: {
    name: '海王星',
    zhCN: "你的'理想滤镜'",
    description: '看世界时自动美化的部分',
    metaphor: '像一层薄雾，让一切更浪漫也更模糊',
    questions: [
      "你容易在什么事上'想太美好'？",
      "什么时候容易'看不清现实'？",
    ],
  },

  pluto: {
    name: '冥王星',
    zhCN: "你的'重生密码'",
    description: '那些不破不立的人生主题',
    metaphor: '像凤凰涅槃，必须先烧掉旧的',
    questions: [
      "你人生中经历过什么'浴火重生'？",
      '什么事情让你有强烈的控制欲？',
    ],
  },
};

/** 获取行星比喻 */
export function getPlanetMetaphor(planet: string): PlanetMetaphor | undefined {
  return PLANET_METAPHORS[planet.toLowerCase()];
}

/** 获取所有行星比喻 */
export function getAllPlanetMetaphors(): Record<string, PlanetMetaphor> {
  return PLANET_METAPHORS;
}
