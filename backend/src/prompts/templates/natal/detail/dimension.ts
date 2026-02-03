/**
 * 维度详情解读 Prompt（v2.0 — 深度本地化版）
 *
 * 输出：指定心理维度的详细解读（用于本我页面点击维度卡片）
 * 注入：荣格心理学、依恋理论、中国文化映射
 */

import type { PromptTemplate, PromptContext } from '../../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../../instructions/output-format';
import { JUNGIAN_CONCEPTS, ATTACHMENT_STYLES } from '../../../cultural/psychology';
import { registry } from '../../../core/registry';

/** 维度中文映射 */
const DIMENSION_NAMES: Record<string, string> = {
  emotion: '情绪模式', boundary: '人际边界', security: '安全感来源',
  expression: '表达方式', decision: '决策模式', stress: '压力应对',
  love_language: '爱的语言', money: '金钱观', growth: '成长课题',
  creativity: '创造力源泉', intimacy: '亲密关系模式', role: '社会角色',
};

/** 各维度的心理学概念与中国文化映射 */
const DIMENSION_CULTURAL_CONTEXT: Record<string, string> = {
  emotion: `## 心理学与文化参考
- ${JUNGIAN_CONCEPTS.inner_child.zhCN}：${JUNGIAN_CONCEPTS.inner_child.explanation}
- 中医"七情"对应：喜伤心/怒伤肝/忧伤肺/思伤脾/悲伤肺/恐伤肾/惊伤心
- 中国情绪文化："忍字头上一把刀"/喜怒不形于色/"男儿有泪不轻弹"
- 本土场景：深夜emo/被父母一句话戳到/公开场合忍住眼泪/看综艺哭得稀里哗啦
- 解读要关注：情绪的觉察能力、表达方式、调节策略`,

  boundary: `## 心理学与文化参考
- ${JUNGIAN_CONCEPTS.persona.zhCN}：${JUNGIAN_CONCEPTS.persona.explanation}
- 中国面子文化：不好意思拒绝/怕得罪人/随份子/被道德绑架/"都是为你好"
- 人情世故：欠人情/还人情/关系远近/"自己人"vs"外人"
- 本土场景：被同事让帮忙不敢拒绝/亲戚借钱/被拉进不想待的群/被迫参加聚会
- 解读要关注：边界模糊的心理代价、如何温和而坚定地说"不"`,

  security: `## 心理学与文化参考
- ${JUNGIAN_CONCEPTS.inner_child.zhCN}：${JUNGIAN_CONCEPTS.inner_child.explanation}
- ${ATTACHMENT_STYLES.secure.zhCN}：${ATTACHMENT_STYLES.secure.description}
- ${ATTACHMENT_STYLES.anxious.zhCN}：${ATTACHMENT_STYLES.anxious.description}
- ${ATTACHMENT_STYLES.avoidant.zhCN}：${ATTACHMENT_STYLES.avoidant.description}
- 中国文化中的"安身立命"：有房有车/稳定工作/存款/"铁饭碗"心理/父母在不远游
- 本土场景：看银行卡余额的焦虑/租房的漂泊感/体制内外的安全感差异/原生家庭的安全基地
- 解读要关注：安全感的内在来源vs外在依赖，建立内在稳定性`,

  expression: `## 心理学与文化参考
- ${JUNGIAN_CONCEPTS.inner_critic.zhCN}：${JUNGIAN_CONCEPTS.inner_critic.explanation}
- 中国"含蓄"文化：话到嘴边留半句/言外之意/弦外之音/"你自己体会"
- 表达困境：想表达又怕被评判/讨好型人格/社交恐惧/微信聊天vs面对面反差
- 本土场景：开会不敢发言/想夸人但说不出口/吵架时"失语"/在朋友圈精心编辑文案
- 解读要关注：内在批评家如何阻碍真实表达，找到舒适的表达方式`,

  decision: `## 心理学与文化参考
- 阴阳思维：事物的两面性/"塞翁失马焉知非福"/辩证看问题
- 中庸之道vs"当断则断"：折中妥协vs果断选择的张力
- 决策困境：选择困难症/怕后悔/总想找"最优解"/被太多信息淹没
- 本土场景：毕业后去大城市还是回老家/考研还是工作/分手后要不要复合/跳槽时在offer间纠结
- 解读要关注：决策模式的优劣势、如何减少内耗提高行动力`,

  stress: `## 心理学与文化参考
- ${JUNGIAN_CONCEPTS.shadow.zhCN}：${JUNGIAN_CONCEPTS.shadow.explanation}
- 五行相克与压力源：木克土(计划被打乱)/火克金(冲动后悔)/土克水(限制创意)/金克木(过度自律)/水克火(情绪浇灭热情)
- 现代压力源：996/内卷/35岁焦虑/房贷车贷/社会时钟/被比较
- 本土解压方式：撸猫/追剧/吃火锅/逛淘宝/刷短视频/暴走/找朋友吐槽/周末躺尸
- 解读要关注：压力下的应激模式（战/逃/僵/讨好），找到适合自己的减压方式`,

  love_language: `## 心理学与文化参考
- ${ATTACHMENT_STYLES.anxious.zhCN}：${ATTACHMENT_STYLES.anxious.description}
- ${ATTACHMENT_STYLES.avoidant.zhCN}：${ATTACHMENT_STYLES.avoidant.description}
- 中国式表达爱：嘴上说"不要"心里很想要/用行动代替语言/给你削水果=我爱你/唠叨就是关心
- "多喝热水"现象：不善言辞但真心关心/用物质替代情感表达/爱你就给你做饭
- 本土场景：给爸妈买东西但不说"我爱你"/微信红包传情/帮对象带早餐/情人节的仪式感
- 解读要关注：识别自己和对方的爱的语言，减少因表达方式不同而产生的误解`,

  money: `## 心理学与文化参考
- "开源节流"传统智慧 vs 现代消费主义
- 中国金钱文化：面子消费/压岁钱/随份子/家庭共同财务/啃老与独立
- 代际观念差异：父母辈节俭vs年轻人消费升级/"穷养vs富养"
- 本土场景：月光vs存款焦虑/花呗账单/双十一后悔/和伴侣AA还是共同账户/给父母钱
- 解读要关注：金钱观背后的安全感需求与价值观，建立健康的财务关系`,

  growth: `## 心理学与文化参考
- ${JUNGIAN_CONCEPTS.individuation.zhCN}：${JUNGIAN_CONCEPTS.individuation.explanation}
- 中国哲学映射：知行合一/"格物致知"/"吾日三省吾身"/道法自然
- 成长阶段："三十而立"的期待与现实/从"听话的好孩子"到"活出自己"
- 本土场景：要不要gap year/读书vs考证/心理咨询/找到真正热爱的事/与原生家庭和解
- 解读要关注：个体化进程中的关键课题，如何从外在期待中找到内在方向`,

  creativity: `## 心理学与文化参考
- ${JUNGIAN_CONCEPTS.anima_animus.zhCN}：${JUNGIAN_CONCEPTS.anima_animus.explanation}
- 阴阳互生与创造力："功夫在诗外"/灵感来自跨界/"无用之用方为大用"
- 中国审美：留白/意境/"大音希声大象无形"/写意vs工笔
- 本土场景：下班后的创作时间/摄影手账/做饭的创意/工作中的巧思/副业探索
- 解读要关注：创造力的来源与阻碍，如何在日常中激活创意表达`,

  intimacy: `## 心理学与文化参考
- ${ATTACHMENT_STYLES.secure.zhCN}：${ATTACHMENT_STYLES.secure.description}
- ${JUNGIAN_CONCEPTS.shadow.zhCN}：${JUNGIAN_CONCEPTS.shadow.explanation}
- 中国式亲密：不善言辞但行动体贴/默契大于表达/"老夫老妻"模式/含蓄的深情
- 亲密恐惧：怕受伤所以不靠近/独立惯了不会依赖/把脆弱等同于软弱
- 本土场景：恋爱中不敢展露真实自我/亲密后想逃/对伴侣的期待说不出口/在亲密关系中重演原生家庭模式
- 解读要关注：亲密关系中的阴影投射，如何在安全的关系中练习打开自己`,

  role: `## 心理学与文化参考
- ${JUNGIAN_CONCEPTS.persona.zhCN}：${JUNGIAN_CONCEPTS.persona.explanation}
- 中国社会角色期待：孝顺的子女/上进的员工/体面的成年人/"懂事"/"争气"
- 角色冲突：好员工vs好伴侣/独立个体vs家族期待/真实自我vs社会人设
- 本土场景：在父母面前装轻松/在领导面前装积极/在朋友面前装洒脱/朋友圈的人设经营
- 解读要关注：哪些角色是真心认同的，哪些是被期待"演"的，如何减少角色消耗`,
};

export const detailDimensionNatalPrompt: PromptTemplate = {
  meta: {
    id: 'detail-dimension-natal',
    version: '2.1',
    module: 'natal',
    priority: 'P1',
    description: '维度详情解读（深度本地化版）',
    lastUpdated: '2026-02-01',
  },

  system: (ctx: PromptContext) => {
    const chartData = ctx.chartData as Record<string, unknown> | undefined;
    const dimensionKey = (chartData?.dimensionKey as string) || 'emotion';
    const dimName = DIMENSION_NAMES[dimensionKey] || dimensionKey;
    const culturalCtx = DIMENSION_CULTURAL_CONTEXT[dimensionKey] || '';

    return `## 任务
根据用户星盘数据，生成「${dimName}」维度的详细解读，融入荣格阴影整合视角。
解读面向中国大陆 18-35 岁年轻人，内容必须贴合本土文化与生活经验。

${culturalCtx}

## 输出格式 (JSON)
{
  "dimension_key": "维度标识",
  "title": "一句话标题（8-15字，有记忆点，直白好懂）",
  "pattern": "80-120字，核心模式描述，直接说结论，用日常场景让人秒懂",
  "root": "50-80字，模式根源（早期经历或内在需求），用通俗心理学解释",
  "when_triggered": "具体触发场景（用中国年轻人熟悉的情境）",
  "what_helps": ["可执行缓解行动1", "可执行缓解行动2", "可执行缓解行动3"],
  "shadow": "50-80字，需整合的阴影面（中性理解语气）",
  "practice": {
    "title": "练习名称",
    "steps": ["具体步骤1", "具体步骤2", "具体步骤3"]
  },
  "prompt_question": "引导自我反思的问题",
  "confidence": "high|med|low"
}

## 本地化规则（强制）
1. 所有文本使用简体中文，星座/行星名使用中文（如"水瓶座""土星"，禁止出现 Aquarius/Saturn 等英文）
2. 解读面向中国大陆 18-35 岁年轻人，场景必须贴合本土生活
3. 比喻用日常生活的（奶茶、外卖、刷手机、上班通勤），不要用文学性的（水晶、星河、宇宙）
4. 心理学概念用通俗中文表达，不使用英文术语
5. 行动建议具体到中国年轻人的日常场景

## 规则
1. what_helps 必须具体可执行，用年轻人能代入的场景（"下次开会被cue到紧张时，先做3次深呼吸"✓ "学会调节情绪"✗）
2. shadow 用理解语气（"可能会不自觉地..."✓ "你的问题是..."✗）
3. practice.steps 每步要明确做什么+怎么做，场景如刷小红书时、赶DDL时、被亲戚盘问时
4. prompt_question 引导探索而非评判（"什么时候你觉得..."）
5. pattern 描述用日常场景举例说明
6. 禁用词：命中注定、一定会、肯定、宇宙能量、频率、振动、灵魂契约、前世、业力

## 写作风格
- 说人话，短句为主。禁止古风文艺腔、比喻堆砌。一段话最多一个比喻。
- 语气像懂心理学的闺蜜/好哥们聊天，善用网感词汇（"emo""破防""上头""精神内耗""社恐实锤"等）
- 先结论后解释，用"比如..."举例
- 指出模式也指出转化方法
- 输出纯文本，所有字段不要使用 Markdown

${JSON_OUTPUT_INSTRUCTION}`;
  },

  user: (ctx: PromptContext) => {
    const chartData = ctx.chartData as Record<string, unknown> | undefined;
    const dimensionKey = (chartData?.dimensionKey as string) || 'emotion';
    const dimName = DIMENSION_NAMES[dimensionKey] || dimensionKey;
    return `本命盘数据：${JSON.stringify(chartData)}

请分析维度：${dimensionKey}（${dimName}）`;
  },
};

// 注册
registry.register(detailDimensionNatalPrompt);
