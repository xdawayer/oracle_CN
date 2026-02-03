/**
 * 人生领域深度解析 Prompt（v2.0 — 深度本地化版）
 *
 * 输出：指定人生领域的深度占星解析（用于本我页面点击人生维度卡片）
 * 注入：行星隐喻、宫位含义、荣格心理学、依恋理论、中国生活场景
 */

import type { PromptTemplate, PromptContext } from '../../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../../instructions/output-format';
import { PLANET_METAPHORS, HOUSE_METAPHORS } from '../../../cultural/metaphors';
import { JUNGIAN_CONCEPTS, ATTACHMENT_STYLES } from '../../../cultural/psychology';
import { registry } from '../../../core/registry';

/** 人生领域中文映射（与前端 DEEP_DOMAIN_LIST 保持一致） */
const DOMAIN_NAMES: Record<string, string> = {
  career: '事业发展', wealth: '财富金钱', love: '爱情婚姻',
  relations: '人际关系', health: '健康养生', growth: '自我成长',
};

/** 各领域文化素材与场景指引 */
const DOMAIN_CULTURAL_CONTEXT: Record<string, string> = {
  career: `## 本土场景指引（事业发展）
- 职场语境：996/内卷/35岁焦虑/考公考编/体制内外选择/跳槽转行/向上管理/职场站队
- 五行对应职业方向：火行→创业/销售/自媒体、土行→金融/房产/行政、金行→技术/法律/管理、水行→艺术/心理/教育、木行→教育/医疗/公益
- 中国职场文化：人情世故/关系网/面子工程/酒桌文化/微信工作群/年终述职

## 相关行星参考
- ${PLANET_METAPHORS.sun.name}（${PLANET_METAPHORS.sun.zhCN}）：职业身份认同
- ${PLANET_METAPHORS.saturn.name}（${PLANET_METAPHORS.saturn.zhCN}）：职业责任与成熟度
- ${PLANET_METAPHORS.mars.name}（${PLANET_METAPHORS.mars.zhCN}）：工作驱动力与竞争方式
- ${PLANET_METAPHORS.jupiter.name}（${PLANET_METAPHORS.jupiter.zhCN}）：职业机遇与发展方向

## 宫位参考
- 10宫（官禄宫）：${HOUSE_METAPHORS[10].zhCN}——${HOUSE_METAPHORS[10].description}，社会成就与事业方向
- 6宫（奴仆宫）：${HOUSE_METAPHORS[6].zhCN}——${HOUSE_METAPHORS[6].description}，日常工作与服务态度
- 2宫（财帛宫）：${HOUSE_METAPHORS[2].zhCN}——${HOUSE_METAPHORS[2].description}，通过工作获得的物质回报`,

  wealth: `## 本土场景指引（财富金钱）
- 消费场景：花呗/信用卡分期/直播购物/双十一囤货/奶茶自由/车厘子自由
- 理财场景：基金定投/余额宝/数字货币/炒股/副业/摆摊
- 金钱观冲突：消费主义vs存钱/月光族vs理财达人/家庭经济分配/彩礼/房贷压力/父母赞助买房
- 五行财运参考：火行→来得快去得快/土行→稳扎稳打/金行→善于精打细算/水行→财来财去不执着/木行→贵人带财

## 相关行星参考
- ${PLANET_METAPHORS.venus.name}（${PLANET_METAPHORS.venus.zhCN}）：价值观与消费偏好
- ${PLANET_METAPHORS.jupiter.name}（${PLANET_METAPHORS.jupiter.zhCN}）：财运与扩张
- ${PLANET_METAPHORS.saturn.name}（${PLANET_METAPHORS.saturn.zhCN}）：理财纪律与延迟满足

## 宫位参考
- 2宫（财帛宫）：${HOUSE_METAPHORS[2].zhCN}——${HOUSE_METAPHORS[2].description}，个人财务与价值观
- 8宫（疾厄宫）：${HOUSE_METAPHORS[8].zhCN}——${HOUSE_METAPHORS[8].description}，共享资源与投资`,

  love: `## 本土场景指引（爱情婚姻）
- 恋爱场景：相亲/催婚/异地恋/见家长/彩礼/门当户对/搭伙过日子
- 关系挑战：冷战/情绪勒索/"你到底爱不爱我"/手机要不要给对方看/前任问题/暧昧边界
- 婚恋观：灵魂伴侣vs门当户对/"嫁人要嫁对"/AA制vs共同账户/婆媳关系/生育压力
- 中国式表达："嘴上说不要心里很想要"/用行动表达爱/给你削水果就是"我爱你"

## 心理学参考——依恋理论
- ${ATTACHMENT_STYLES.secure.zhCN}：${ATTACHMENT_STYLES.secure.description}
- ${ATTACHMENT_STYLES.anxious.zhCN}：${ATTACHMENT_STYLES.anxious.description}
- ${ATTACHMENT_STYLES.avoidant.zhCN}：${ATTACHMENT_STYLES.avoidant.description}
根据星盘配置判断依恋倾向，描述行为模式而非贴标签。

## 相关行星参考
- ${PLANET_METAPHORS.venus.name}（${PLANET_METAPHORS.venus.zhCN}）：爱的方式与吸引模式
- ${PLANET_METAPHORS.moon.name}（${PLANET_METAPHORS.moon.zhCN}）：情感需求与安全感
- ${PLANET_METAPHORS.mars.name}（${PLANET_METAPHORS.mars.zhCN}）：追求与性吸引力

## 宫位参考
- 7宫（夫妻宫）：${HOUSE_METAPHORS[7].zhCN}——${HOUSE_METAPHORS[7].description}，一对一亲密关系
- 5宫（子女宫）：${HOUSE_METAPHORS[5].zhCN}——${HOUSE_METAPHORS[5].description}，恋爱与浪漫
- 8宫（疾厄宫）：${HOUSE_METAPHORS[8].zhCN}——${HOUSE_METAPHORS[8].description}，深层亲密与信任`,

  relations: `## 本土场景指引（人际关系）
- 社交文化：人情世故/面子/随份子/请客吃饭/微信社交礼仪/朋友圈经营/社交降级
- 职场关系：办公室政治/站队/向上管理/同事竞争/团建压力/工作群回复"收到"
- 家族关系：家族聚餐/亲戚盘问/过年社交/熊孩子/代际冲突/家长里短
- 边界议题：不好意思拒绝/被道德绑架/社交内耗/讨好型人格

## 心理学参考——社交面具
- ${JUNGIAN_CONCEPTS.persona.zhCN}：${JUNGIAN_CONCEPTS.persona.explanation}
在人际关系解读中，探讨不同场合的"面具"切换及其心理代价。

## 相关行星参考
- ${PLANET_METAPHORS.mercury.name}（${PLANET_METAPHORS.mercury.zhCN}）：沟通风格
- ${PLANET_METAPHORS.venus.name}（${PLANET_METAPHORS.venus.zhCN}）：社交偏好与审美
- ${PLANET_METAPHORS.saturn.name}（${PLANET_METAPHORS.saturn.zhCN}）：社交边界与责任感

## 宫位参考
- 3宫（兄弟宫）：${HOUSE_METAPHORS[3].zhCN}——${HOUSE_METAPHORS[3].description}，日常社交与沟通
- 7宫（夫妻宫）：${HOUSE_METAPHORS[7].zhCN}——${HOUSE_METAPHORS[7].description}，一对一关系模式
- 11宫（福德宫）：${HOUSE_METAPHORS[11].zhCN}——${HOUSE_METAPHORS[11].description}，社群与归属`,

  health: `## 本土场景指引（健康养生）
- 中医体质：气虚体质/阳虚体质/阴虚体质/痰湿体质/湿热体质/血瘀体质/气郁体质/特禀体质/平和体质
- 养生文化：泡脚/艾灸/食疗/节气养生/经络按摩/"多喝热水"/枸杞保温杯/早睡早起
- 中医七情：喜伤心/怒伤肝/忧伤肺/思伤脾/恐伤肾——情志与脏腑的对应
- 现代健康困境：久坐/熬夜/外卖饮食/运动不足/体检焦虑/亚健康/颈椎腰椎问题
- 五行与脏腑：火→心/土→脾胃/金→肺/水→肾/木→肝

## 相关行星参考
- ${PLANET_METAPHORS.moon.name}（${PLANET_METAPHORS.moon.zhCN}）：情绪健康与饮食习惯
- ${PLANET_METAPHORS.mars.name}（${PLANET_METAPHORS.mars.zhCN}）：体能与炎症倾向
- ${PLANET_METAPHORS.saturn.name}（${PLANET_METAPHORS.saturn.zhCN}）：慢性压力与骨骼关节

## 宫位参考
- 6宫（奴仆宫）：${HOUSE_METAPHORS[6].zhCN}——${HOUSE_METAPHORS[6].description}，日常健康管理
- 1宫（命宫）：${HOUSE_METAPHORS[1].zhCN}——${HOUSE_METAPHORS[1].description}，体质与外在状态
- 12宫（玄秘宫）：${HOUSE_METAPHORS[12].zhCN}——${HOUSE_METAPHORS[12].description}，潜意识健康模式`,

  growth: `## 本土场景指引（自我成长）
- 成长困境：不知道自己想要什么/总在意别人看法/完美主义/拖延/内耗/讨好型人格
- 中国哲学参考：知行合一/格物致知/中庸之道/"吾日三省吾身"/道法自然/"不破不立"
- 现代成长场景：心理咨询/冥想/写日记/读书/独处/gap year/慢生活/断舍离

## 心理学参考——荣格个体化
- ${JUNGIAN_CONCEPTS.individuation.zhCN}：${JUNGIAN_CONCEPTS.individuation.explanation}
- ${JUNGIAN_CONCEPTS.shadow.zhCN}：${JUNGIAN_CONCEPTS.shadow.explanation}
- ${JUNGIAN_CONCEPTS.inner_child.zhCN}：${JUNGIAN_CONCEPTS.inner_child.explanation}
- ${JUNGIAN_CONCEPTS.inner_critic.zhCN}：${JUNGIAN_CONCEPTS.inner_critic.explanation}
成长解读的核心框架：觉察阴影→接纳内在小孩→安抚内在批评家→活出自己。

## 相关行星参考
- ${PLANET_METAPHORS.sun.name}（${PLANET_METAPHORS.sun.zhCN}）：核心自我与人生方向
- ${PLANET_METAPHORS.pluto.name}（${PLANET_METAPHORS.pluto.zhCN}）：深层转化与重生
- ${PLANET_METAPHORS.saturn.name}（${PLANET_METAPHORS.saturn.zhCN}）：成熟与责任

## 宫位参考
- 1宫（命宫）：${HOUSE_METAPHORS[1].zhCN}——${HOUSE_METAPHORS[1].description}，自我认知起点
- 9宫（迁移宫）：${HOUSE_METAPHORS[9].zhCN}——${HOUSE_METAPHORS[9].description}，信念与远方
- 12宫（玄秘宫）：${HOUSE_METAPHORS[12].zhCN}——${HOUSE_METAPHORS[12].description}，潜意识整合`,
};

export const detailDeepNatalPrompt: PromptTemplate = {
  meta: {
    id: 'detail-deep-natal',
    version: '2.1',
    module: 'natal',
    priority: 'P1',
    description: '人生领域深度解析（深度本地化版）',
    lastUpdated: '2026-02-01',
  },

  system: (ctx: PromptContext) => {
    const chartData = ctx.chartData as Record<string, unknown> | undefined;
    const domainKey = (chartData?.domainKey as string) || 'career';
    const domainName = DOMAIN_NAMES[domainKey] || domainKey;
    const culturalCtx = DOMAIN_CULTURAL_CONTEXT[domainKey] || '';

    const healthDisclaimer = domainKey === 'health'
      ? '\n- summary 必须以"【重要提醒】本解读基于占星学，仅供健康管理参考，不能替代专业医疗诊断和建议。"开头'
      : '';

    return `## 任务
根据用户星盘数据，对「${domainName}」领域进行深度占星解析，揭示核心模式与成长方向。
解读面向中国大陆 18-35 岁年轻人，内容必须贴合本土文化与生活经验。

${culturalCtx}

## 输出格式 (JSON)
{
  "domain_key": "领域标识",
  "title": "一句话标题（8-15字，有记忆点，直白好懂）",
  "summary": "80-120字，该领域的核心命题概述，直接说结论，用日常场景让人秒懂",
  "key_patterns": [
    {
      "title": "模式名称（4-8字）",
      "description": "80-100字，该模式的具体表现与心理机制，用中国年轻人熟悉的场景举例",
      "astro_basis": "相关星象依据（行星、宫位、相位），使用中文名称"
    }
  ],
  "strengths": ["天赋优势1", "天赋优势2", "天赋优势3"],
  "challenges": ["成长挑战1", "成长挑战2"],
  "growth_path": {
    "direction": "50-80字，成长方向",
    "actions": ["今天就能开始的行动1", "本周可以尝试的行动2", "长期培养的习惯3"]
  },
  "reflection_question": "引导自我反思的问题（一句话，触及深层）",
  "confidence": "high|med|low"
}

## 本地化规则（强制）
1. 所有文本使用简体中文，星座/行星名使用中文（如"水瓶座""土星"，禁止出现 Aquarius/Saturn 等英文）
2. 解读面向中国大陆 18-35 岁年轻人，场景必须贴合本土生活
3. 比喻用日常生活的（奶茶、外卖、刷手机、上班通勤），不要用文学性的（水晶、星河、宇宙）
4. 心理学概念用通俗中文表达，不使用英文术语
5. growth_path.actions 要具体到中国年轻人的日常场景${healthDisclaimer}

## 规则
1. key_patterns 提供 2-3 个核心模式，每个要有占星依据
2. strengths 和 challenges 要具体，不要泛泛而谈，语言年轻化（"搞钱能力拉满"✓ "财务管理能力强"✗）
3. growth_path.actions 必须具体可执行，用年轻人能代入的场景（如"这周末找家安静的咖啡馆独处两小时""下次赶DDL前先列个优先级清单"）
4. 用日常场景说明星象在生活中的具体表现
5. 禁用词：命中注定、一定会、肯定、宇宙能量、频率、振动、灵魂契约、前世、业力

## 写作风格
- 说人话，短句为主。禁止古风文艺腔、比喻堆砌。一段话最多一个比喻。
- 语气像懂心理学的闺蜜/好哥们聊天，善用网感词汇（"拉满""上头""破防""精神内耗""被内卷到"等）
- 先结论后解释，用"比如..."举例，场景用中国年轻人秒懂的（赶DDL、刷小红书、被同事cue到、点外卖、相亲局等）
- 指出模式也指出转化方法
- 输出纯文本，所有字段不要使用 Markdown

${JSON_OUTPUT_INSTRUCTION}`;
  },

  user: (ctx: PromptContext) => {
    const chartData = ctx.chartData as Record<string, unknown> | undefined;
    const domainKey = (chartData?.domainKey as string) || 'career';
    const domainName = DOMAIN_NAMES[domainKey] || domainKey;
    return `本命盘数据：${JSON.stringify(chartData)}

请深度分析人生领域：${domainKey}（${domainName}）`;
  },
};

// 注册
registry.register(detailDeepNatalPrompt);
