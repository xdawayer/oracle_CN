/**
 * 人生K线页面
 * 展示人生100年的K线图及年度运势分析
 */
const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');
const storage = require('../../utils/storage');

// 天干地支
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 星座数据（使用 PNG 图片路径，避免 Unicode 符号在微信小程序中显示为彩色 emoji）
const ZODIAC_SIGNS = [
  { name: '白羊座', icon: '/images/astro-symbols/aries.png', element: 'fire' },
  { name: '金牛座', icon: '/images/astro-symbols/taurus.png', element: 'earth' },
  { name: '双子座', icon: '/images/astro-symbols/gemini.png', element: 'air' },
  { name: '巨蟹座', icon: '/images/astro-symbols/cancer.png', element: 'water' },
  { name: '狮子座', icon: '/images/astro-symbols/leo.png', element: 'fire' },
  { name: '处女座', icon: '/images/astro-symbols/virgo.png', element: 'earth' },
  { name: '天秤座', icon: '/images/astro-symbols/libra.png', element: 'air' },
  { name: '天蝎座', icon: '/images/astro-symbols/scorpio.png', element: 'water' },
  { name: '射手座', icon: '/images/astro-symbols/sagittarius.png', element: 'fire' },
  { name: '摩羯座', icon: '/images/astro-symbols/capricorn.png', element: 'earth' },
  { name: '水瓶座', icon: '/images/astro-symbols/aquarius.png', element: 'air' },
  { name: '双鱼座', icon: '/images/astro-symbols/pisces.png', element: 'water' },
];

Page({
  data: {
    // 用户信息
    userInfo: null,
    birthData: {
      year: 1990,
      month: 6,
      day: 15,
      hour: 12
    },

    // K线数据
    klineData: [],
    visibleData: [],
    natalChart: null,
    isDataFromServer: false,

    // 视图状态
    viewMode: 'chart', // 'chart' | 'report'
    viewRange: { start: 0, end: 50, label: '1-50岁' },
    loading: false,

    // 当前年份数据
    currentYearData: null,

    // 年度详情弹窗
    showYearDetail: false,
    selectedYear: null,
    selectedYearReport: null,
    activeTab: 'overview',

    // 报告章节展开状态（对象形式，WXML 不支持 Array.includes）
    expandedSections: { overview: true },

    // 重要节点列表
    milestones: [],

    // 付费状态
    isUnlocked: false,
    isSubscriber: false,

    // 开发模式 - 生产环境务必设为 false
    devMode: false,

    // 报告内容
    reportContent: {
      overview: '',
      past: '',
      present: '',
      future: '',
      milestone: '',
      letter: ''
    },

    // Tab 配置
    detailTabs: [
      { id: 'overview', label: '概览' },
      { id: 'career', label: '事业' },
      { id: 'wealth', label: '财运' },
      { id: 'love', label: '感情' },
      { id: 'health', label: '健康' },
      { id: 'monthly', label: '月度' }
    ],

    // 范围选项
    rangeOptions: [
      { label: '1-50岁', start: 0, end: 50 },
      { label: '51-100岁', start: 50, end: 100 },
      { label: '全部', start: 0, end: 100 }
    ]
  },

  onLoad() {
    const userInfo = storage.get('user_profile');
    if (userInfo) {
      const birthDate = userInfo.birthDate || '';
      const parts = birthDate.split('-');
      const birthData = {
        year: parseInt(parts[0]) || 1990,
        month: parseInt(parts[1]) || 6,
        day: parseInt(parts[2]) || 15,
        hour: this.parseTimeToHour(userInfo.birthTime)
      };

      this.setData({ userInfo, birthData }, () => {
        this.generateLocalKLineData();
        this.fetchKLineData();
      });
    } else {
      // 使用默认数据生成预览
      this.generateLocalKLineData();
    }
  },

  onShow() {
    // 页面显示时重绘 Canvas
    if (!this.data.showYearDetail && this.data.klineData.length > 0) {
      this.redrawChart();
    }
  },

  /**
   * 解析时间字符串为小时数
   */
  parseTimeToHour(timeStr) {
    if (!timeStr) return 12;
    const match = timeStr.match(/^(\d{1,2}):/);
    return match ? parseInt(match[1]) : 12;
  },

  /**
   * 本地生成K线数据（快速预览）
   */
  generateLocalKLineData() {
    const { year, month, day } = this.data.birthData;
    const currentYear = new Date().getFullYear();
    const data = [];
    let prevClose = 50;
    const baseSeed = year * 10000 + month * 100 + day;

    // 伪随机函数
    const seededRandom = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let age = 1; age <= 100; age++) {
      const yr = year + age - 1;
      let score = 50;

      // 土星周期 (29.5年)
      const saturnPhase = (age % 29.5) / 29.5;
      if (Math.abs(saturnPhase) < 0.05 || Math.abs(saturnPhase - 1) < 0.05) {
        score -= 12;
      } else if (Math.abs(saturnPhase - 0.5) < 0.05) {
        score -= 8;
      }

      // 木星周期 (12年)
      const jupiterPhase = (age % 12) / 12;
      if (Math.abs(jupiterPhase) < 0.08 || Math.abs(jupiterPhase - 1) < 0.08) {
        score += 15;
      }

      // 天王星对分 (42岁)
      if (age >= 40 && age <= 44) score -= 8;

      // 波动
      const seed = baseSeed + yr * 7 + age * 13;
      score += (seededRandom(seed) - 0.5) * 25;
      score = Math.max(15, Math.min(90, score));

      // K线数据
      const volatility = 8 + seededRandom(seed + 1000) * 10;
      const open = prevClose;
      const close = score + (seededRandom(seed + 2000) - 0.5) * 10;
      const high = Math.max(score, open, close) + seededRandom(seed + 3000) * volatility;
      const low = Math.min(score, open, close) - seededRandom(seed + 4000) * volatility;

      const isSaturnReturn = Math.abs(age - 29) <= 1 || Math.abs(age - 59) <= 1;
      const isJupiterReturn = age % 12 <= 1 || age % 12 >= 11;
      const isUranusOpposition = age >= 40 && age <= 44;

      data.push({
        year: yr,
        age,
        ganzhi: this.getYearGanZhi(yr),
        open: Math.round(Math.max(10, Math.min(95, open))),
        close: Math.round(Math.max(10, Math.min(95, close))),
        high: Math.round(Math.max(15, Math.min(100, high))),
        low: Math.round(Math.max(5, Math.min(90, low))),
        score: Math.round(score),
        trend: close >= open ? 'bull' : 'bear',
        isCurrentYear: yr === currentYear,
        isSaturnReturn,
        isJupiterReturn,
        isUranusOpposition
      });

      prevClose = close;
    }

    const currentYearData = data.find(d => d.year === currentYear);
    const milestones = data.filter(d => d.isSaturnReturn || d.isUranusOpposition).slice(0, 5);
    const visibleData = data.slice(this.data.viewRange.start, this.data.viewRange.end);

    // 计算本命盘
    const natalChart = this.calculateNatalChart(year, month, day, this.data.birthData.hour);

    // 生成报告内容
    const reportContent = this.generateReportContent(natalChart, currentYearData);

    this.setData({
      klineData: data,
      visibleData,
      currentYearData,
      milestones,
      natalChart,
      reportContent
    });
  },

  /**
   * 计算本命盘
   */
  calculateNatalChart(year, month, day, hour) {
    // 太阳星座
    const sunDates = [[20,19],[19,18],[21,20],[20,20],[21,21],[21,22],[23,22],[23,22],[23,22],[23,21],[22,21],[22,19]];
    let sunIdx = month - 1;
    if (day < sunDates[sunIdx][0]) sunIdx = (sunIdx + 11) % 12;
    const sunSign = ZODIAC_SIGNS[sunIdx];

    // 月亮星座（简化）
    const moonIdx = (year * 7 + month * 3 + day) % 12;
    const moonSign = ZODIAC_SIGNS[moonIdx];

    // 上升星座（简化）
    const ascIdx = Math.floor(hour / 2) % 12;
    const ascendant = ZODIAC_SIGNS[ascIdx];

    return { sunSign, moonSign, ascendant };
  },

  /**
   * 获取干支
   */
  getYearGanZhi(year) {
    return {
      stem: STEMS[(year - 4) % 10],
      branch: BRANCHES[(year - 4) % 12],
      full: STEMS[(year - 4) % 10] + BRANCHES[(year - 4) % 12]
    };
  },

  /**
   * 生成报告内容
   */
  generateReportContent(natalChart, currentYearData) {
    if (!natalChart) return { overview: '', past: '', present: '', future: '', milestone: '', letter: '' };

    const elementTraits = {
      fire: '热情与行动力',
      earth: '务实与稳定',
      air: '思维敏捷与善于沟通',
      water: '敏感与直觉力'
    };

    const elementDetails = {
      fire: '火象星座的能量让你天生具有开拓精神和领导力。你做事果断、充满激情，喜欢挑战和冒险。在团队中你往往是那个率先行动的人，你的热情能感染周围每一个人。不过也要注意，有时候过于急躁可能让你错过一些需要耐心等待的机会。',
      earth: '土象星座的能量赋予你踏实可靠的特质。你做事有条理、重视结果，善于把想法变成现实。在别人眼中你是一个值得信赖的人，无论是工作还是生活，你的稳定性都是你最大的优势。不过也要记得偶尔放松一下，不要总是给自己太大压力。',
      air: '风象星座的能量让你思维活跃、善于交际。你对新事物充满好奇，学习能力强，总能在不同领域之间建立有趣的联系。在社交场合你如鱼得水，善于用语言表达自己的想法。不过也要注意，有时候想得太多做得太少可能会让你错过最佳行动时机。',
      water: '水象星座的能量赋予你敏锐的直觉和深厚的情感。你能敏感地捕捉到他人的情绪和需求，在人际关系中展现出独特的共情能力。你的内心世界丰富而深邃，这让你在艺术、心理学等领域有天然的优势。不过也要学会保护自己的情感边界，不要过度吸收他人的负面情绪。'
    };

    const moonTraits = {
      water: '你的月亮落在水象星座，这意味着你在情感上追求深度连接。你渴望被真正理解，表面的社交可能让你觉得疲惫。在亲密关系中，你需要的是灵魂层面的共鸣，而不仅仅是陪伴。',
      fire: '你的月亮落在火象星座，这让你的情感表达直接而热烈。你不太擅长隐藏自己的感受——开心就笑、难过就说。这种真实让你在关系中很有感染力，但有时也需要学会给对方留一些空间。',
      earth: '你的月亮落在土象星座，这让你在情感上追求安全感和稳定性。你不太喜欢突如其来的变化，更偏爱可预期的、温暖的日常。在关系中你是一个可靠的伴侣，但也要注意不要因为追求稳定而压抑了自己的真实感受。',
      air: '你的月亮落在风象星座，这让你在处理情感时带有一定的理性色彩。你习惯用思考来消化感受，而不是完全沉浸在情绪中。这让你在面对困难时更加冷静，但有时候也需要允许自己"不讲道理"地大哭一场。'
    };

    const overview = `你的本命盘呈现出独特的生命蓝图——就像一份专属于你的"人生说明书"。

【太阳星座：${natalChart.sunSign.name}】
太阳代表你的核心自我，是你人生的主旋律。太阳落在${natalChart.sunSign.name}，赋予你${elementTraits[natalChart.sunSign.element]}的核心特质。${elementDetails[natalChart.sunSign.element]}

【月亮星座：${natalChart.moonSign.name}】
月亮掌管你的内心世界和情感模式，是"别人看不到的你"。${moonTraits[natalChart.moonSign.element]}

【上升星座：${natalChart.ascendant.name}】
上升星座是你的"社交面具"，是你展现给世界的第一印象。上升${natalChart.ascendant.name}让你在初次见面时给人留下${natalChart.ascendant.element === 'fire' ? '热情开朗、充满活力' : natalChart.ascendant.element === 'earth' ? '稳重可靠、值得信赖' : natalChart.ascendant.element === 'air' ? '聪明机智、善于沟通' : '温和亲切、富有同理心'}的印象。

纵观你的人生K线图，整体呈现波动中上升的趋势。就像股市一样，短期的涨跌不重要，重要的是长期的走势。你的人生中有几个特别关键的转折期：

• 28-30岁：第一次"人生结构调整期"——重新定义什么是真正重要的
• 40-44岁："中年觉醒期"——找到内心深处真正的自己
• 58-60岁："智慧收获期"——把一生的经验转化为智慧

每个周期都有它的意义和功课。理解这些节奏，不是为了预知未来，而是为了在变化到来时能更从容地应对。`;

    const past = `【0-12岁：童年印记——人格的种子期】
这一阶段是你建立核心自我认同的重要时期，就像一棵树的根基在这时候默默扎下。根据你的本命配置，童年时期你可能展现出${natalChart.sunSign.element === 'fire' ? '活泼好动、喜欢冒险' : natalChart.sunSign.element === 'earth' ? '沉稳踏实、做事认真' : natalChart.sunSign.element === 'air' ? '好奇心强、爱问为什么' : '敏感细腻、容易共情'}的特质。

这个阶段你与父母、家庭的关系对你影响深远。${natalChart.moonSign.element === 'water' ? '你可能是一个容易"想太多"的孩子，对家庭的情感氛围特别敏感' : natalChart.moonSign.element === 'fire' ? '你可能是个闲不住的孩子，总是精力充沛、到处探索' : natalChart.moonSign.element === 'earth' ? '你可能是个让大人省心的孩子，从小就懂得遵守规则' : '你可能是个爱思考的孩子，总有问不完的问题'}。这些早期的体验塑造了你看待世界的基本方式，也埋下了你未来性格的种子。

【12-18岁：自我觉醒——与世界碰撞的开始】
青春期是你人格形成的关键阶段。大约在14-15岁的时候，你第一次真正感受到了"限制"和"规则"的力量——可能是来自学业的压力、父母的期望或者社交中的困惑。这是你第一次需要在"我想要"和"我应该"之间做选择。

这个时期你开始形成自己的价值观和审美取向。${natalChart.sunSign.element === 'fire' || natalChart.sunSign.element === 'air' ? '你可能是那个不太愿意"随大流"的人，有自己的想法和坚持。虽然这有时让你显得"叛逆"，但其实是你独立人格在觉醒的表现' : '你可能在这个阶段更多地选择了观察和适应，在心里默默构建着对世界的理解。表面的顺从下面，是一个正在慢慢成熟的独立灵魂'}。

【18-25岁：方向探索——试错中找到自己】
这一阶段是你社会化和方向探索的黄金期。你离开了家庭的保护伞，第一次独立面对社会的复杂性。大学、第一份工作、第一段认真的感情……每一个"第一次"都在帮你拼凑出更完整的自我画像。

你可能尝试了多种可能性——换过方向、走过弯路、也收获过惊喜。这些看似"不确定"的经历其实都有价值：它们帮你排除了不适合的选项，让你越来越清楚自己真正想要什么。${natalChart.sunSign.element === 'fire' ? '作为火象能量主导的你，这段时期可能格外精彩和"折腾"，但每一次尝试都在锤炼你的行动力' : natalChart.sunSign.element === 'earth' ? '作为土象能量主导的你，你可能比同龄人更早地确定了方向，但也要警惕过早地给自己设限' : natalChart.sunSign.element === 'air' ? '作为风象能量主导的你，你可能接触了很多不同的领域和人群，这种广泛的探索会在未来某天突然串联起来' : '作为水象能量主导的你，你可能在这段时期更多地通过感受和直觉来做选择，那些"莫名其妙"的决定往往后来证明是对的'}。

【25岁至今：走向成熟——真正的人生开始了】
第一次"人生结构调整期"（约28-30岁）是你从"青年"真正步入"成年"的分水岭。如果你已经经历过这个阶段，回想一下那时候：是不是有些事情被迫做了改变？是不是对自己的人生方向有了更清晰的认识？

这不是巧合，而是生命周期的自然节奏。这个时期你可能经历了重大的人生决定——换工作、结婚（或分手）、搬城市、重新定义自己的价值观。这些决定奠定了你接下来10年发展的基础。无论当时的选择对不对，它们都是你成长的重要一步。`;

    const present = currentYearData ? `【现阶段人生主题】
你目前正处于人生中一个承上启下的重要阶段。${currentYearData.year}年，你的综合运势评分为${currentYearData.score}分，整体呈现${currentYearData.trend === 'bull' ? '上升向好' : '调整蓄力'}的态势。这意味着${currentYearData.trend === 'bull' ? '你现在正处于一个"顺风期"——做事比较容易推进，人际关系也相对和谐。但也别因此放松，好运要靠行动来变现' : '你可能感觉到一些阻力或迷茫，但这恰恰是"练内功"的最好时机。很多后来的大成就，都是在这样的调整期酝酿出来的'}。

【正在经历的星象周期】
从更宏观的角度看，你目前正同时受到几股不同能量的影响：

木星的能量正在为你打开新的大门——它带来扩张、学习和成长的机遇。这一年你可能会发现自己的学习欲望特别强，或者有机会接触到之前接触不到的人和资源。适合报课学习、考证充电、参加行业活动或者开拓新的社交圈子。

同时，土星的能量在提醒你"欲速则不达"——它要求你在某些领域更加务实和负责。如果你觉得某些事情推进得很慢或者总是遇到阻碍，那很可能是土星在"考验"你是否真的准备好了。通过考验后，你获得的成果会格外扎实。

【当前的机遇】
• 学习和自我提升的黄金窗口——你的吸收能力正处于高峰期
• 人脉拓展的好时机——多参加聚会和活动，可能遇到改变你轨迹的人
• 表达和创作的活跃期——如果有想法，大胆说出来、写出来、做出来
• 重新审视人生方向的契机——也许是时候问问自己"我真正想要的是什么"

【当前的挑战】
• 平衡扩张与深耕——不要什么都想做，找到最重要的1-2件事集中发力
• 避免承诺过多——学会说"不"，你的时间和精力是有限的
• 保持身心健康——压力大的时候更要注意休息，不要透支身体
• 管理预期——运势好不等于做什么都成功，保持务实的心态` : '';

    const currentAge = currentYearData ? currentYearData.age : 30;

    const future = `【未来五年展望（${currentAge + 1}-${currentAge + 5}岁）】
接下来的五年是你人生重要的发展期，也是最值得认真规划的一段时间。木星的周期性能量将为你带来扩展的机遇——可能是事业上的突破、一段重要的新关系或者一次改变认知的学习经历。

具体来看：
• 事业方面：前两年适合积累和铺垫，后三年开始看到回报。如果你有转型或创业的想法，建议在这个阶段做好充分准备。
• 感情方面：${natalChart.sunSign.element === 'water' || natalChart.sunSign.element === 'earth' ? '关系会趋向稳定和深化，适合做一些长期的感情规划' : '可能会遇到新的人或者经历关系中的重要变化，保持开放心态很重要'}。
• 财务方面：整体呈上升趋势，但增长需要靠你的专业能力来驱动。建议在这个阶段建立或优化自己的理财习惯。
• 个人成长：这五年你会在某个领域建立起真正的深度，找到自己的"不可替代性"。

【中期趋势（${currentAge + 6}-${currentAge + 15}岁）】
这一阶段的核心主题是"深化与巩固"——之前种下的种子将在这个时期开花结果。这十年的关键在于：你能不能坚持得住。

很多人会在这个阶段遇到"瓶颈感"——觉得自己好像已经到了天花板。但真正持久的成就需要时间和耐心来打磨，就像好酒需要慢慢酿造。如果你在前五年做了正确的积累，这个阶段你会看到"复利效应"——成果以越来越快的速度增长。

这一时期的关键建议：
• 不要中途放弃正在做的事——很多人倒在了"黎明前的黑暗"
• 开始思考"传承"——你的经验和知识可以帮助到更多人
• 关注健康——身体是这个阶段最容易被忽视但最重要的资本
• 深化重要关系——家庭、挚友、核心合作伙伴，这些关系值得你投入时间

【远期愿景（${currentAge + 16}-${currentAge + 30}岁）】
放眼更远的未来，你的人生将进入一个全新的维度。根据你的本命盘配置，${natalChart.sunSign.element === 'fire' || natalChart.sunSign.element === 'air' ? '你在这个阶段可能会把影响力从个人层面扩展到更广泛的社会层面——成为某个领域的意见领袖、导师或开创者' : '你在这个阶段会进入一种"深度智慧"的状态——对人性、对生命、对世界有越来越透彻的理解，成为身边人的"精神支柱"'}。

这个时期，物质上的追求会逐渐让位于精神上的满足。你会更加在意：我的存在给这个世界带来了什么？我想留下怎样的影响？这些"大问题"会成为你生命后半段的指引灯。

关键提醒：
• 每一个阶段都有它独特的功课，不必急于跨越——当下就是最好的时间
• 保持对内在声音的倾听——你的直觉是最好的导航系统
• 健康是所有成就的基石——从现在开始善待自己的身体
• 人际关系是人生最大的财富——比任何投资回报率都高`;

    const milestone = `【人生重要里程碑预测】

你的人生中有几个特别重要的"转折年"，它们就像人生K线图上的关键节点——不是坏事，而是推动你成长和进化的催化剂。提前了解这些节点，不是为了害怕它们，而是为了在变化到来时更好地应对。

• 第一次"人生结构调整期"（28-30岁）
这是你从"年轻人"真正变成"成年人"的分水岭。在这个时期，你会被迫面对一些"不得不做选择"的时刻——比如确定职业方向、决定一段关系的去留、重新定义什么对自己最重要。

如何应对：不要逃避那些让你不舒服的问题。现在做出的每一个艰难选择，都在为你未来的十年铺路。如果感到迷茫，找一个你信任的长辈或前辈聊聊，他们都经历过同样的阶段。记住，这不是"危机"，而是"成长的必修课"。

• "中年觉醒期"（40-44岁）
很多人把这叫"中年危机"，但更准确的说法是"中年觉醒"。你内心深处那个"真正的自己"开始强烈地要求被看见——你可能突然对现在的生活感到不满足，渴望做一些不一样的事情。

如何应对：首先，这种感觉是正常的，几乎所有人都会经历。不要因此觉得自己"有问题"。其次，不要在冲动之下做不可逆的大决定（比如裸辞、离婚）。给自己一个探索的空间——试试新的爱好、读一些不一样的书、和不同圈子的人交流。慢慢地，你会找到一条既能保持稳定又能满足内心渴望的路。

• "智慧收获期"（58-60岁）
人生进入"收获与传承"的黄金阶段。此时你已经积累了丰富的人生经验，开始自然地思考更宏大的问题：我想留下什么？我能教给下一代什么？我的人生使命是什么？

如何应对：这是你一生中最有智慧的时期，不要浪费它。把你的经验和见解分享出来——写文章、带年轻人、做公益、建立一些能持续影响他人的东西。同时也要善待自己的身体，它陪你走过了漫长的旅程，值得被温柔对待。

• "深层疗愈期"（约50岁）
这是一次意义深远的内在整合之旅。那些你一直回避的旧伤、遗憾和未完成的心事，会在这个时期浮上水面要求被处理。听起来有点可怕，但这其实是一个巨大的礼物——它让你有机会真正"放下"，轻装上阵走接下来的路。

如何应对：允许自己感受那些不舒服的情绪，它们是在帮你清理积压的"心理垃圾"。如果需要，寻求专业的心理咨询支持。多花时间在大自然中、和真正在乎的人在一起。你会发现，正是那些曾经的伤疤赋予了你独特的深度和力量。`;

    const ageDescriptor = currentAge < 25 ? '朝气蓬勃' : currentAge < 35 ? '正在全力奔跑' : currentAge < 45 ? '逐渐找到自己节奏' : currentAge < 55 ? '越来越从容' : '充满智慧';
    const elementLifeAdvice = {
      fire: '你骨子里有一团火，它让你总是充满热情和勇气。请永远不要让任何人熄灭这团火。在有些人觉得"差不多得了"的时候，你就是要再往前冲一步——因为那就是你的天性，也是你的力量。但同时也要学会在奔跑间歇给自己加油——休息不是偷懒，是为了跑得更远。',
      earth: '你天生具有把梦想变成现实的能力。当别人还在空想的时候，你已经在动手了。这份脚踏实地的特质是你最宝贵的财富。但也请记得偶尔抬头看看星空——不是所有有价值的事情都能立刻看到结果，有些美好需要你先相信、再看见。',
      air: '你的大脑永远在运转，永远在连接不同的想法和可能性。这种思维的灵活性让你总能看到别人看不到的角度和机会。但有时候也需要让大脑休息一下——不是所有问题都需要想出答案，有些事情感受比分析更重要。相信你的直觉，它比你想象的更可靠。',
      water: '你有一种罕见的能力——能够真正"感受"到别人的感受。这让你在人际关系中无可替代，也让你对生活有着比大多数人更深的理解。但请记得保护好自己的心——你不需要吸收所有人的情绪，设立边界不是冷漠，而是爱自己的方式。'
    };

    const letter = `亲爱的未来的自己：

当你读到这封信的时候，希望你还记得现在的自己——那个${ageDescriptor}的、对未来充满好奇也有些忐忑的${currentAge}岁的你。

写这封信的此刻，你可能正在为某些事情烦恼，也可能正在为某些事情开心。无论你现在的状态如何，我想告诉你：你正走在属于自己的路上，而这条路，没有标准答案。

作为太阳${natalChart.sunSign.name}、月亮${natalChart.moonSign.name}、上升${natalChart.ascendant.name}的你，天生就拥有一套独特的"生命配置"。

${elementLifeAdvice[natalChart.sunSign.element]}

关于未来，我想对你说几句掏心窝的话：

人生不是一条笔直向上的线，而是一幅波澜起伏的K线图。有高峰，也有低谷；有顺势而为的畅快，也有逆流而上的坚韧。但请相信——每一次下跌都在为下一次上涨蓄力，每一次低谷都在锻造一个更强大的你。

不要害怕那些标记着"转折"的年份。28-30岁的那次调整不是惩罚，而是帮你卸下不属于你的包袱；40岁左右的那次觉醒不是危机，而是帮你找回真实的自己。

几个请你记住的"人生锦囊"：
• 永远不要停止学习——它是你对抗焦虑最好的武器
• 珍惜那些真正在乎你的人——他们才是你最大的财富
• 健康比什么都重要——没有健康，一切归零
• 允许自己犯错——完美主义是前进路上最大的绊脚石
• 保持善良，但也要有锋芒——善良不是软弱，有底线的善良才最有力量

最后，愿你永远保持对生活的热爱，对未知的好奇，对自己的温柔。

命运的K线图已经画好了大致的轮廓，但每一天的涨跌，都由你亲手书写。你比自己以为的更强大，也比自己以为的更值得被爱。

来自${currentYearData ? currentYearData.year : new Date().getFullYear()}年的自己`;

    return { overview, past, present, future, milestone, letter };
  },

  /**
   * 从后端获取K线数据
   */
  async fetchKLineData() {
    if (!this.data.userInfo) return;

    this.setData({ loading: true });

    try {
      const { birthDate, birthTime } = this.data.userInfo;
      const params = `birthDate=${encodeURIComponent(birthDate || '')}&birthTime=${encodeURIComponent(birthTime || '')}`;

      const res = await request({
        url: `${API_ENDPOINTS.KLINE_GENERATE}?${params}`
      });

      if (res && res.klineData) {
        const currentYear = new Date().getFullYear();
        const currentYearData = res.klineData.find(d => d.year === currentYear);
        const milestones = res.klineData.filter(d => d.isSaturnReturn || d.isUranusOpposition).slice(0, 5);
        const visibleData = res.klineData.slice(this.data.viewRange.start, this.data.viewRange.end);

        // 生成报告内容
        const reportContent = this.generateReportContent(res.natalChart, currentYearData);

        this.setData({
          klineData: res.klineData,
          visibleData,
          currentYearData,
          milestones,
          natalChart: res.natalChart || this.data.natalChart,
          reportContent,
          isDataFromServer: true,
          loading: false
        });
      }
    } catch (err) {
      console.error('获取K线数据失败:', err);
      this.setData({ loading: false });
      // 显示错误提示，但不影响本地数据预览
      wx.showToast({ title: '数据同步失败，显示本地预览', icon: 'none', duration: 2000 });
    }
  },

  /**
   * 切换视图模式
   */
  onViewModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  /**
   * 切换视图范围
   */
  onRangeChange(e) {
    const range = e.currentTarget.dataset.range;
    const visibleData = this.data.klineData.slice(range.start, range.end);
    this.setData({
      viewRange: range,
      visibleData
    }, () => {
      this.redrawChart();
    });
  },

  /**
   * 重绘图表
   */
  redrawChart() {
    const chartComponent = this.selectComponent('#klineChart');
    if (chartComponent) {
      setTimeout(() => chartComponent.redraw(), 50);
    }
  },

  /**
   * K线点击事件
   */
  onYearClick(e) {
    const { yearData } = e.detail;
    this.showYearDetailModal(yearData);
  },

  /**
   * 点击当前年份卡片
   */
  onCurrentYearClick() {
    if (this.data.currentYearData) {
      this.showYearDetailModal(this.data.currentYearData);
    }
  },

  /**
   * 点击里程碑
   */
  onMilestoneClick(e) {
    const year = e.currentTarget.dataset.year;
    const yearData = this.data.klineData.find(d => d.year === year);
    if (yearData) {
      this.showYearDetailModal(yearData);
    }
  },

  /**
   * 显示年度详情弹窗
   */
  showYearDetailModal(yearData) {
    const report = this.generateYearlyReport(yearData);
    this.setData({
      selectedYear: yearData,
      selectedYearReport: report,
      showYearDetail: true,
      activeTab: 'overview'
    });
  },

  /**
   * 生成年度报告
   */
  generateYearlyReport(yearData) {
    const { year, age, score, ganzhi, isSaturnReturn, isJupiterReturn, isUranusOpposition } = yearData;

    // 年度主题
    let theme = '';
    let majorEvent = null;

    if (isSaturnReturn) {
      theme = age < 35 ? '土星回归·人生结构重建' : '第二次土星回归·智慧收获';
      majorEvent = {
        name: '土星回归',
        impact: -15,
        description: age < 35
          ? '这是人生最重要的转折点之一。你将经历从"青年"到"真正成年人"的蜕变。曾经的幻想、不切实际的期待都将面临现实的检验。这不是惩罚，而是宇宙送给你的成人礼——通过考验，你将建立起真正稳固的人生结构。'
          : '第二次土星回归标志着人生进入"收获与传承"的阶段。此时你应当回顾一生的建树，思考想要留下怎样的人生印记。这也是重新定义人生下半场的关键时期。'
      };
    } else if (isJupiterReturn) {
      theme = '木星回归·扩张与机遇';
      majorEvent = {
        name: '木星回归',
        impact: 15,
        description: '每12年一次的木星回归是你的"幸运年"！木星带来扩张、乐观、机遇的能量。这一年适合开拓新领域、学习新技能、扩展人脉、远行等。但要注意避免过度乐观导致的承诺过多。'
      };
    } else if (isUranusOpposition) {
      theme = '天王星对分·中年觉醒';
      majorEvent = {
        name: '天王星对分相',
        impact: -10,
        description: '这就是常说的"中年危机"的占星根源，但更准确地说是"中年觉醒"。内心深处那个"真正的自己"开始敲门，要求被看见、被表达。你可能突然感到不满足，渴望自由与改变。不要压抑这种感觉，而是找到健康的方式去探索"我是谁"。'
      };
    } else if (score >= 70) {
      theme = '顺遂之年·乘势而上';
    } else if (score >= 55) {
      theme = '稳健之年·稳中求进';
    } else if (score >= 45) {
      theme = '平稳之年·修炼内功';
    } else if (score >= 35) {
      theme = '挑战之年·韬光养晦';
    } else {
      theme = '蛰伏之年·静待花开';
    }

    // 四维评分
    const seed = this.data.birthData.year * 10000 + year;
    const rand = (s) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    const dimensions = {
      career: {
        score: Math.min(100, Math.max(0, Math.round(score + (rand(seed + 1) - 0.5) * 20))),
        analysis: this.getDimensionAnalysis('career', score, year, age)
      },
      wealth: {
        score: Math.min(100, Math.max(0, Math.round(score + (rand(seed + 2) - 0.5) * 25))),
        analysis: this.getDimensionAnalysis('wealth', score, year, age)
      },
      love: {
        score: Math.min(100, Math.max(0, Math.round(score + (rand(seed + 3) - 0.5) * 20))),
        analysis: this.getDimensionAnalysis('love', score, year, age)
      },
      health: {
        score: Math.min(100, Math.max(0, Math.round(score + (rand(seed + 4) - 0.5) * 15))),
        analysis: this.getDimensionAnalysis('health', score, year, age)
      }
    };

    // 月度运势 - 关键词池基于伪随机选取，避免每年重复
    const keywordPool = [
      ['开局', '启程', '萌发', '破冰'],
      ['社交', '连接', '合作', '人脉'],
      ['机遇', '转机', '贵人', '惊喜'],
      ['突破', '进取', '跨越', '蜕变'],
      ['财运', '丰收', '积累', '增值'],
      ['调整', '休整', '蓄力', '沉淀'],
      ['反思', '内省', '觉察', '领悟'],
      ['挑战', '磨砺', '考验', '淬炼'],
      ['务实', '深耕', '精进', '打磨'],
      ['稳定', '守成', '巩固', '扎根'],
      ['冲刺', '加速', '攻坚', '发力'],
      ['收尾', '总结', '圆满', '归整']
    ];
    const notePool = [
      ['制定计划', '理清目标', '明确方向', '做好准备'],
      ['扩展人脉', '主动社交', '寻求合作', '拓展圈子'],
      ['把握机会', '果断行动', '留心信号', '主动出击'],
      ['大胆行动', '勇于尝试', '打破常规', '迈出第一步'],
      ['理财投资', '优化收支', '关注财务', '量入为出'],
      ['休息调整', '张弛有度', '充电蓄能', '劳逸结合'],
      ['避免冲动', '慎重决策', '三思后行', '保持冷静'],
      ['谨慎应对', '灵活变通', '稳中求进', '以静制动'],
      ['专注执行', '脚踏实地', '一步一印', '精益求精'],
      ['稳扎稳打', '循序渐进', '夯实基础', '不急不躁'],
      ['全力以赴', '把握节奏', '集中精力', '争取突破'],
      ['总结反思', '盘点成果', '展望未来', '感恩收获']
    ];

    const monthly = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const mseed = year * 13 + m * 7;
      const monthScore = Math.max(1, Math.min(5, Math.round(score / 20 + (rand(mseed) - 0.5) * 2)));
      const kwIdx = Math.floor(rand(mseed + 100) * keywordPool[i].length);
      const ntIdx = Math.floor(rand(mseed + 200) * notePool[i].length);
      return { month: m, score: monthScore, keyword: keywordPool[i][kwIdx], note: notePool[i][ntIdx] };
    });

    // 行动建议
    const actionAdvice = this.getActionAdvice(score, majorEvent);

    // 占星摘要 - 基于12宫位轮转
    const houses = ['命宫', '财帛宫', '兄弟宫', '田宅宫', '子女宫', '奴仆宫', '夫妻宫', '疾厄宫', '迁移宫', '事业宫', '福德宫', '玄秘宫'];
    const houseThemes = [
      '自我认同与个人形象的重塑',
      '财务收入与物质价值观的调整',
      '沟通学习与近距离关系的活跃',
      '家庭根基与内在安全感的建设',
      '创造力与爱的表达的绽放',
      '日常工作与身心调养的优化',
      '亲密关系与合作模式的深化',
      '深层转化与共同资源的整合',
      '远行求学与视野拓展的机遇',
      '事业声望与社会地位的提升',
      '理想愿景与社群连接的扩展',
      '灵性成长与潜意识整合的深化'
    ];
    const houseAdvices = [
      '这是重新定义"我是谁"的好时机，适合改变形象、调整生活方式或开启新的个人项目。建议大胆展现真实的自己，你的自信会感染周围的人。',
      '这股能量会帮助你发现新的收入来源或改善财务状况。建议重新审视自己的消费观和理财方式，把钱花在真正有价值的地方。',
      '这一年你的表达能力和学习能力都会提升，适合学新东西、写作或拓展社交圈。建议多和身边的人交流想法，好运可能藏在一次聊天里。',
      '家庭关系和居住环境是这一年的重要课题。适合搬家、装修或改善和家人的相处方式。建议花时间营造一个让自己感到安心的"根据地"。',
      '创造力和表达欲会特别旺盛，适合发展兴趣爱好、参与艺术活动或享受恋爱的甜蜜。建议给自己多一些玩耍和创造的时间，别总是埋头工作。',
      '这一年适合调整生活节奏，优化日常的工作方式和健康习惯。建议关注饮食和运动，小的改变会带来大的不同。',
      '亲密关系和合作伙伴关系会成为焦点，适合深化感情或建立重要的合作。建议在关系中学会平衡"给"和"要"，好的关系是双向的。',
      '这是一个适合"断舍离"的时期——无论是旧物、旧习惯还是不再适合的关系。建议勇敢地放手那些消耗你的东西，为新的可能腾出空间。',
      '远方在召唤你！这一年适合旅行、留学、学习新文化或参加远程的项目。建议把眼光放远，走出舒适区去看看更大的世界。',
      '事业上可能迎来重要的认可或晋升，你的社会声望在提升。建议认真对待每一个公开亮相的机会，你的专业形象会在这一年得到巩固。',
      '你会更加关注友谊、社群和自己的理想。适合加入新的圈子、参与公益活动或为未来设定大胆的目标。建议多和志同道合的人在一起，他们会激发你的灵感。',
      '内心世界会变得更加丰富，直觉力增强。这一年适合静修、冥想、写日记或进行心理咨询。建议多给自己独处的时间，倾听内心深处的声音。'
    ];
    const houseIdx = (year + age) % 12;
    const astroSummary = `这一年，过境木星行经你的${houses[houseIdx]}（也就是掌管${houseThemes[houseIdx]}的领域），这意味着宇宙正在为你这个方向注入扩张和成长的能量。${houseAdvices[houseIdx]}`;

    // 八字摘要 - 基于天干五行属性
    const stemElements = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
    const stemTraits = {
      '木': '生发向上',
      '火': '热情奔放',
      '土': '厚重沉稳',
      '金': '锐利果决',
      '水': '灵活变通'
    };
    const branchSeasons = { '子': '冬藏', '丑': '冬末蓄力', '寅': '春生', '卯': '春盛', '辰': '春转夏', '巳': '夏旺', '午': '夏盛', '未': '夏转秋', '申': '秋收', '酉': '秋实', '戌': '秋转冬', '亥': '冬蓄' };
    const stemEl = stemElements[ganzhi.stem] || '土';
    const elementAdvices = {
      '木': { high: '木气旺盛的年份，你的创造力和行动力都会增强，就像春天的树木一样充满生机。适合启动新项目、学习新技能或开始新的人际关系。', medium: '木气平和，成长的速度虽然不快，但根基在不断扎实。就像一棵正在扎根的树，表面看不出变化，但地下已经伸展得很远。建议保持耐心，专注于"扎根"的事情。', low: '木气受阻，可能会感觉做什么都不太顺畅，好像遇到了一堵看不见的墙。这其实是在提醒你暂停一下、反思一下方向对不对。建议减少盲目的行动，多思考再出发。' },
      '火': { high: '火的能量让你热情洋溢、充满感染力，走到哪里都是人群的焦点。适合做需要展示、演讲、社交的事情，你的表现会让人眼前一亮。', medium: '火气适中，热情还在但更加内敛。这种"温火慢炖"的状态其实最适合处理需要耐心的事情。建议把热情用在刀刃上，不要四处撒网。', low: '火气偏弱，可能会感觉缺乏激情和动力，做什么都提不起劲。这不是你"懒"了，而是身体在告诉你需要休息和充电。建议多做能让你重新燃起热情的事情。' },
      '土': { high: '土的能量带来踏实和稳定，这一年你做事会特别靠谱、特别有执行力。适合处理房产、签合同、建立长期合作等需要"落地"的事情。', medium: '土气平稳，虽然不够exciting，但却是最安全的状态。就像走在平坦的大路上，不会有惊喜但也不会有意外。建议利用这种稳定感来完成一些之前一直拖着没做的事。', low: '土气不足，可能会感觉做什么都不太踏实，缺乏安全感。这种时候容易焦虑或者做出冲动的决定。建议给自己找一个"锚点"——一个能让你感到安心的人、事或环境。' },
      '金': { high: '金的能量让你的判断力和决断力特别强，适合做重要的取舍和决定。该断则断，不要犹豫。同时你的审美和品味也在提升。', medium: '金气平和，理性与感性比较平衡。这一年不宜做太激进的决策，但可以慢慢收拾和整理——无论是生活空间、人际关系还是财务状况。', low: '金气偏弱，可能会在做决定时犹豫不决，或者容易心软而错过最佳时机。建议遇到重要决定时给自己设一个截止日期，到了就执行，不要一直拖。' },
      '水': { high: '水的能量增强了你的直觉和洞察力，你会比平时更能看透事物的本质。适合做需要创意、策划和深度思考的事情。同时人际关系也会更加圆融。', medium: '水气适中，思维灵活但不会过于飘忽。这一年适合学习、阅读和提升认知水平，你吸收新知识的能力比往常更强。建议多读书、多上课、多和聪明人交流。', low: '水气不足，思维可能会有些僵化，不太容易接受新观点或新方法。建议主动让自己接触不同的信息和观点，打破思维定式。多出去走走，换个环境换个心情。' }
    };
    const elLevel = score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';
    const baziSummaries = [
      `${ganzhi.full}年，天干${ganzhi.stem}属${stemEl}——用通俗的话说，就是"${stemTraits[stemEl]}"的能量在主导这一年。地支${ganzhi.branch}对应${branchSeasons[ganzhi.branch]}的节律，意味着这一年的整体节奏是${score >= 50 ? '向前推进' : '沉淀积累'}的。${elementAdvices[stemEl][elLevel]}`,
      `流年${ganzhi.full}，${stemEl}的能量是今年的主旋律。简单来说，${stemEl}代表${stemTraits[stemEl]}，这种特质会在你今年的生活中频繁出现。地支${ganzhi.branch}值年，对应的是${branchSeasons[ganzhi.branch]}的时间节奏——${score >= 50 ? '正是积极行动的好时候' : '提醒你要学会等待合适的时机'}。${elementAdvices[stemEl][elLevel]}`,
      `${ganzhi.full}年的能量组合中，天干${ganzhi.stem}和地支${ganzhi.branch}搭配，形成了${stemEl}气${score >= 60 ? '旺盛' : score >= 40 ? '平稳' : '偏弱'}的格局。翻译成日常语言就是：今年适合${score >= 60 ? '大胆出击、把握每一个看得到的机会' : score >= 40 ? '稳步推进、不急不躁地做好手头的事' : '养精蓄锐、把精力留给真正重要的事情'}。${elementAdvices[stemEl][elLevel]}`,
      `从传统命理的视角来看，${ganzhi.full}年天干${ganzhi.stem}带来${stemTraits[stemEl]}的特质，地支${ganzhi.branch}蕴含${branchSeasons[ganzhi.branch]}的意象。这两股力量交汇在一起，对你今年的运势${score >= 55 ? '形成支持——像是顺风而行' : '形成考验——像是逆风前行但能锻炼你的韧性'}。${elementAdvices[stemEl][elLevel]}`,
      `${ganzhi.full}年，五行中的${stemEl}是今年的核心能量。${ganzhi.stem}在天代表外在的趋势，${ganzhi.branch}在地代表内在的节奏，两者共同作用影响着你这一年的状态。${branchSeasons[ganzhi.branch]}的时令特征也在提示你${score >= 50 ? '顺势而为，该出手时就出手' : '顺其自然，该休息时就好好休息'}。${elementAdvices[stemEl][elLevel]}`,
      `流年${ganzhi.full}，以${stemEl}为主导。通俗地说，${stemEl}的"${stemTraits[stemEl]}"特质会成为你今年生活的一个关键词。本年的核心功课是${score >= 60 ? '在顺境中保持清醒——越是顺利越要稳住心态' : score >= 40 ? '在平淡中发现价值——很多重要的成长都发生在不知不觉中' : '在困境中积蓄力量——今天忍过的苦，都是明天成功的养分'}。${elementAdvices[stemEl][elLevel]}`
    ];
    const baziIdx = (ganzhi.stem.charCodeAt(0) + ganzhi.branch.charCodeAt(0) + age) % baziSummaries.length;
    const baziSummary = baziSummaries[baziIdx];

    // 个性化寄语
    let personalMessage = '';
    if (score >= 70) {
      personalMessage = `亲爱的${age}岁的自己：\n\n这是属于你的高光时刻！宇宙为你准备了丰盛的礼物，但记住，机遇只青睐有准备的人。\n\n"${theme}"——这四个字就是你今年的主旋律。在享受顺风的同时，也要为未来的挑战储备能量。顺境中最容易犯的错误就是以为好运会一直持续，聪明人会在春天为冬天存粮。\n\n去大胆追梦吧，但别忘了脚下的路。这一年你值得所有的美好，也有能力创造更多的可能。\n\n愿你乘风破浪，也不忘初心。`;
    } else if (score >= 55) {
      personalMessage = `亲爱的${age}岁的自己：\n\n"${theme}"——这个主题词已经暗示了这一年的基调。运势不错，虽然不是那种一飞冲天的年份，但绝对是稳步向前的好时光。\n\n不是所有的年份都需要狂飙突进，有时候稳稳地走，反而能到达更远的地方。你现在做的每一个小决定，都在为未来的自己铺路。不要小看日复一日的坚持，量变终将引发质变。\n\n享受当下的节奏，不攀比、不焦虑。你的时区刚刚好。\n\n相信自己，一步一个脚印。`;
    } else if (score >= 40) {
      personalMessage = `亲爱的${age}岁的自己：\n\n"${theme}"——或许这不是最闪耀的一年，但绝对是最有价值的一年之一。\n\n平淡的日子其实是最好的"修炼场"。没有大起大落，你才有机会静下心来，看看自己这些年走过的路，想想接下来真正想去的方向。很多了不起的人，都是在这样的"安静期"里完成了最重要的转变。\n\n不要因为平凡而焦虑，也不要因为普通而自我否定。你的光芒不需要每时每刻都绽放，有时候收敛锋芒，是为了下一次更耀眼的登场。\n\n沉住气，好戏还在后头。`;
    } else {
      personalMessage = `亲爱的${age}岁的自己：\n\n如果这一年感到艰难，请记住：你不是一个人在扛，而且这段日子一定会过去。\n\n"${theme}"——听起来可能有些沉重，但每一段低谷期都有它的意义。就像肌肉在撕裂后才会变得更强壮，你现在经历的一切都在为未来的自己"加buff"。回头看那些曾经觉得过不去的坎，哪一个不是后来的你轻描淡写？\n\n不要在低谷期做人生大决定，不要在深夜看那些让你焦虑的东西。多出门走走，多和让你舒服的人待在一起，多做能让你开心的小事。\n\n坚持住，美好即将到来。你比自己以为的要强大得多。`;
    }

    return {
      theme,
      majorEvent,
      dimensions,
      monthly,
      actionAdvice,
      astroSummary,
      baziSummary,
      personalMessage
    };
  },

  /**
   * 获取维度分析文案
   */
  getDimensionAnalysis(dimension, score, year, age) {
    const analyses = {
      career: {
        high: [
          '事业运势旺盛，贵人运强劲，整体处于上升通道。上半年是开拓新领域的黄金时机，可能收到重要的晋升机会或合作邀约。下半年的重心则在巩固成果、建立长期优势上。建议主动争取展示自己的机会，比如主导一个新项目或在团队中提出创新方案。同时注意维护好关键人脉，他们会在关键时刻给你助力。',
          '职业发展进入快车道，领导力和影响力都在显著提升。你在专业领域的积累开始产生"复利效应"，周围人会越来越认可你的能力。上半年适合承担更大的责任或挑战更高的目标，下半年则是收获期，之前的努力会逐步兑现。建议把握住每一次被看见的机会，不要低调到让机会溜走。记住，这一年你值得更大的舞台。',
          '专业能力获得广泛认可，行业地位明显提升。这一年你可能会收到来自不同方向的橄榄枝——跳槽邀请、合作提议或晋升通知。上半年重点在"出圈"，适合发表观点、参加行业活动、扩大影响力；下半年适合沉淀和深耕，把新获得的资源转化为长期优势。建议在精力允许的情况下多做一些跨界交流，你的视野决定了你的天花板。'
        ],
        medium: [
          '事业运势平稳，虽然没有大的飞跃，但整体在稳中有进。这正是打基础、积累实力的好时机，就像盖房子的地基阶段——看不见但至关重要。上半年可能会感觉进展缓慢，但下半年会逐渐看到回报。建议利用这段时间提升核心技能，比如考个证、学个新工具，或者把手头的项目做到极致。耐心是你今年最大的武器。',
          '职业发展进入巩固期，不宜冒进，但可以在现有框架内寻求优化。你可能会觉得当前的工作节奏有些平淡，但换个角度看，这恰好是你"修炼内功"的绝佳窗口。上半年适合梳理工作流程、优化效率，下半年可以小范围尝试一些新方向。建议找一位你佩服的前辈聊聊，他们的经验可能会帮你打开新思路。',
          '这是一个"深耕"的年份。表面上可能感觉进展缓慢，甚至有些焦虑，但实际上你正在积累未来爆发的能量。就像竹子前四年只长了3厘米，但第五年开始每天长30厘米——根基决定高度。建议把注意力从"别人怎么看我"转移到"我还能学到什么"上来。保持专注，减少无效社交，把时间花在真正能提升自己的事情上。'
        ],
        low: [
          '事业面临一定挑战，可能遇到项目受阻、方向调整或发展瓶颈。这并不意味着你做得不好，而是外部环境在推动你重新审视自己的职业路径。上半年压力可能较大，但下半年会逐步好转。建议降低预期、专注于提升自身实力，把每一次挫折都当作学习的机会。记住，很多成功人士都是在低谷期完成了最重要的转型。',
          '职场环境可能有些动荡，团队变动、项目调整或领导更替都可能发生。面对这些变化不必过度焦虑，保持低调、做好本职工作是最稳妥的策略。上半年以"守"为主，避免做重大职业决定；下半年情况会明显好转，届时再考虑新的发展方向。建议利用这段时间多观察、多思考，弄清楚自己真正想要什么样的职业生活。',
          '这一年的事业挑战其实是在帮你看清什么才是真正重要的。有些路走不通，不是因为你不够好，而是因为那不是属于你的方向。上半年可能会经历一些让你沮丧的事情，但这恰恰是宇宙在"清理"你生命中不适合的部分。建议减少抱怨、增加行动，把精力集中在你能控制的事情上。年底回头看，你会感谢现在的自己。'
        ]
      },
      wealth: {
        high: [
          '财运亨通，无论是工资收入还是额外收益都有增长的空间。上半年3-4月和下半年10-11月是财运的两个高峰期，适合做重要的财务决策或投资布局。整体来看，这一年的财富增长主要来自你的专业能力和人脉资源。建议在收入增加的同时，拿出一部分做长期储蓄或稳健投资，为未来打好财务基础。花钱可以大方，但不要冲动消费。',
          '财富积累进入良性循环的一年，之前的努力开始在经济上获得回报。你可能会发现赚钱的渠道在增多，收入来源也更加多元化。上半年适合开拓新的收入渠道，下半年则适合整合资源、优化投资组合。建议把一部分收益用于长期储蓄或投资，让钱为你"工作"。同时适当犒劳自己，你值得享受努力的成果。',
          '财运上升期，有机会通过合作、合伙等方式获得可观的财富增长。"人脉就是钱脉"这句话在今年体现得尤为明显。上半年多参加社交活动，你可能会在不经意间遇到能带来财富机遇的人。下半年适合落实上半年达成的合作意向。建议对大额投资保持理性，做好风险评估后再行动，不要因为运势好就放松警惕。'
        ],
        medium: [
          '财运平稳，收支基本平衡，不会有大的起落。虽然不是"暴富"的年份，但也不必担心经济压力。上半年的财务状况可能略紧，下半年会有所好转。这是一个适合保守理财、增加储蓄比例的时期。建议审视一下自己的消费习惯，砍掉不必要的订阅和冲动消费，把省下来的钱投入到能产生长期回报的地方。',
          '财务状况整体可控，但需要精打细算才能过得舒适。这一年的关键词是"量入为出"，避免超前消费和不必要的借贷。上半年可能会有一笔计划外的支出，提前做好应急储备很重要。下半年财运略好于上半年，适合做一些小额投资的尝试。建议学习一些基础的理财知识，哪怕每月只存一小笔，积少成多也是一种力量。',
          '这是一个"开源节流"的年份，财务增长的空间有限，但也不会出现严重的经济困难。与其焦虑于短期收入，不如把目光放长远——投资自己永远是回报率最高的投资。上半年适合学习新技能来提升未来的赚钱能力，下半年可能会因为之前的积累而看到一些财务上的好转。建议建立记账习惯，了解自己的钱都花在了哪里。'
        ],
        low: [
          '财运偏弱，需要比平时更加谨慎地管理财务。建议以保守为主，避免大额消费和高风险投资。上半年可能会遇到一些意外支出，提前准备好应急资金非常重要。下半年情况会逐步改善，但仍需保持节制。这一年的核心策略是"守住底线"——确保基本生活质量不受影响，其余的都可以暂时放一放。记住，财务低谷期终会过去。',
          '守财比生财更重要的一年。如果遇到看起来"太好"的赚钱机会，一定要多一分警惕，很可能是陷阱或高风险项目。上半年尤其要注意避免借钱给别人或参与不熟悉的投资。下半年财运会有所回暖，但仍建议以稳为主。这段时间适合梳理自己的财务状况，把该还的债务理清，该砍的支出砍掉，为来年的好转做准备。',
          '财务压力可能让你感到焦虑，但请记住——经济状况是暂时的，你创造价值的能力是持久的。与其纠结于短期收入的不理想，不如把精力放在提升自己的核心竞争力上，财运自然会随之好转。上半年以"缩减开支、保存实力"为主，下半年可以开始寻找新的收入机会。建议和信任的朋友聊聊你的困惑，有时候一个好建议胜过自己闷头想。'
        ]
      },
      love: {
        high: [
          '感情运势旺盛，个人魅力处于高峰期。单身的朋友有望在社交场合遇到心仪的对象，尤其是上半年3-5月和下半年9-10月桃花运最旺。已有伴侣的人感情会更加甜蜜，适合一起规划未来或做一些有仪式感的事情。建议多参加聚会、兴趣活动，主动制造与优质异性接触的机会。但也要保持一定的判断力，不要被表面的浪漫冲昏头脑。',
          '爱情运进入收获期，之前在感情中的真诚付出将得到温暖的回报。你会发现身边的人越来越被你吸引——不仅是外在，更是你内在散发出的自信和温暖。单身者可能通过朋友介绍或工作场合遇到值得深交的人。有伴侣者关系更加深入和稳固，适合讨论一些重要的共同话题。建议用心感受每一段关系带给你的成长，好的感情会让你变成更好的自己。',
          '魅力值飙升的一年，你会明显感觉到身边人对你的好感和关注在增加。单身的朋友不要将就——这一年你值得等待真正让你心动的人。有伴侣者可能会经历感情的"升温期"，适合安排旅行或共同体验新事物来加深感情。建议在享受被追捧的同时保持真诚，最好的感情从来不需要伪装。上半年是感情升温期，下半年是稳定期。'
        ],
        medium: [
          '感情运势平稳，没有大起大落，但也正因如此，这是一个适合沉下心来认真经营感情的年份。单身者可能暂时不会遇到特别心动的人，但不必焦虑——利用这段时间搞清楚自己真正想要什么样的伴侣更重要。有伴侣者可能会感觉感情进入了"平淡期"，但平淡不等于无趣，主动创造一些小惊喜就能重新点燃火花。建议多和伴侣或朋友深度交流，了解彼此的内心世界。',
          '感情处于"考验期"，这听起来有点吓人，但其实是一个加深了解、巩固关系的好机会。这一年你们可能会因为一些小事产生分歧，但正是这些摩擦让你们更加了解彼此的底线和需求。单身者在选择对象时会更加理性和成熟，不太容易被表面吸引。建议遇到矛盾时学会换位思考，好的感情不是没有冲突，而是每次冲突后都能变得更近。',
          '爱情需要用心经营的一年。日常的忙碌可能让你忽略了感情中的细节，但恰恰是这些细节决定了关系的温度。建议安排一些特别的活动——不需要多花钱，一起做顿饭、看场电影、散个步都是增进感情的好方式。单身者不妨降低一些"硬性标准"，多给不同类型的人一些接触的机会，你可能会发现意外的惊喜。上半年适合反思，下半年适合行动。'
        ],
        low: [
          '感情运势偏弱，可能会遇到一些让你心累的情况。单身的朋友不要急于脱单——在状态不好的时候仓促开始的感情，往往质量不高。有伴侣者可能会因为沟通不畅或期望落差而产生摩擦。上半年是感情的"低谷期"，建议多把精力放在自我成长上；下半年情况会好转，届时你会以更好的状态去面对感情。记住，爱别人之前先学会爱自己。',
          '关系中可能浮现一些之前被忽略的深层问题，比如价值观差异、生活习惯冲突或信任危机。与其继续回避，不如趁这个机会正面面对——虽然过程可能不舒服，但这是关系走向真正亲密的必经之路。单身者可能会经历一段"看谁都不顺眼"的阶段，这其实是你内心标准在提升的表现。建议有困惑时找信任的朋友倾诉，或者写日记梳理自己的感受。',
          '感情上的波折虽然让人难受，但其实是在帮你更清楚地认识自己真正需要什么。有些人注定只能陪你走一段路，学会放手也是一种成长。上半年感情上的不顺可能会影响你的心情，但请不要因此否定自己的价值。下半年你会慢慢走出阴霾，重新对感情充满期待。建议在低谷期多做让自己开心的事情，培养新的兴趣爱好，你会发现最好的感情往往出现在你最不执着的时候。'
        ]
      },
      health: {
        high: [
          '健康运势良好，精力充沛，免疫力也处于较高水平。这是一个非常适合建立健康生活习惯的年份——无论是开始跑步、健身、瑜伽还是学习一项新运动，你的身体都会给你积极的反馈。上半年精力最旺，适合挑战一些有难度的运动目标；下半年注意劳逸结合，不要因为状态好就过度透支。建议趁状态好的时候做一次全面体检，建立自己的健康档案。',
          '身心状态都很好的一年，你会明显感觉到自己的精神面貌和体力都有提升。这是培养长期健康习惯的好时机——现在养成的好习惯可以受益很多年。建议设定一些具体的健康目标，比如每周运动3次、每天睡够7小时、减少外卖频率等。上半年可以尝试不同的运动找到适合自己的，下半年坚持执行形成习惯。心理健康同样重要，多做让自己感到放松和快乐的事。',
          '活力满满的一年，身体底子好就是你最大的资本。但好的健康状态不是用来挥霍的，而是用来投资的。建议利用这段时间认真了解自己的身体——什么食物让你状态最好、什么运动最适合你、什么样的作息让你精力最充沛。上半年多尝试、多探索，下半年固定下来形成规律。记住，你现在对身体的善待，就是给未来的自己最好的礼物。'
        ],
        medium: [
          '健康状况整体可控，但身体可能会发出一些小信号提醒你注意。常见的表现包括偶尔的疲劳感、睡眠质量下降或消化系统不适。这些虽然不是大问题，但不应忽视。建议保持适度运动——不需要高强度，每天散步30分钟就很好。上半年特别注意肠胃保养，少吃外卖和冷饮；下半年注意颈椎和腰椎的保护，久坐族尤其要注意。',
          '身体发出的小信号不要忽视，它们往往是更大问题的前兆。这一年建议把"定期体检"提上日程，尤其关注之前容易忽略的项目。心理健康同样重要——如果经常感到莫名的疲惫或情绪低落，可能是压力在身体上的反映。建议培养一个放松的爱好，比如冥想、画画或者泡澡。上半年以调整为主，下半年你会感觉状态明显好转。',
          '这一年的健康重点是"预防胜于治疗"。你的身体可能没有明显的大毛病，但一些不健康的习惯已经在暗中消耗你的元气。建议认真审视一下自己的生活方式——熬夜、久坐、饮食不规律、过度看手机，这些"隐形杀手"需要被重视。上半年找到问题所在，下半年逐步改善。哪怕每天只改变一个小习惯，一年下来也是巨大的进步。'
        ],
        low: [
          '健康需要格外关注的一年，身体和心理都可能承受比平时更大的压力。建议尽快安排一次全面体检，尤其关注之前有过不适的部位。情绪健康也要重视——如果经常感到焦虑、失眠或情绪波动，不要硬扛，及时寻求专业帮助。上半年是需要特别注意的时期，减少不必要的应酬和熬夜；下半年身体会逐步恢复。记住，健康是所有成就的基石。',
          '身体在用各种方式提醒你放慢脚步。你可能会感到比往年更容易疲劳、更容易生病或者恢复变慢。这不是你变"弱"了，而是之前透支的健康在要求"偿还"。必要时主动休息，是为了能走更长的路。建议这一年在饮食上下功夫——多吃新鲜蔬果、减少加工食品、保证充足的蛋白质摄入。上半年以养为主，下半年可以开始逐步增加运动量。',
          '健康挑战是身体给你敲响的警钟，提醒你重新审视自己的生活方式。虽然可能会有一些不舒服的症状，但大多数情况下通过调整作息和积极治疗都可以好转。最重要的是不要忌讳就医——有不舒服就去看，早发现早处理比什么都强。建议减少工作强度、增加休息时间、远离让你焦虑的人和事。把健康放在第一位，其他的事情缓一缓都来得及。'
        ]
      }
    };

    const level = score >= 65 ? 'high' : score >= 45 ? 'medium' : 'low';
    const options = analyses[dimension][level];
    return options[(year + age) % options.length];
  },

  /**
   * 获取行动建议
   */
  getActionAdvice(score, majorEvent) {
    const mustDo = [];
    const mustNot = [];

    if (majorEvent) {
      if (majorEvent.name === '土星回归') {
        mustDo.push(
          '认真审视人生方向——花时间想清楚未来3-5年最想实现的目标，然后制定切实可行的计划',
          '放下不切实际的期待——把那些"总有一天"的幻想换成"今天就开始"的行动',
          '建立稳定的生活结构——固定的作息、规律的运动、持续的学习，这些"无聊"的习惯恰恰是成功的基石'
        );
        mustNot.push(
          '不要逃避责任——现在逃开的问题，以后会以更大的代价回来找你',
          '不要固守旧模式——如果一件事已经不适合你了，及时止损比硬撑更有智慧'
        );
      } else if (majorEvent.name === '木星回归') {
        mustDo.push(
          '大胆追求想做的事——你心里那个一直想做但没敢开始的事情，今年就是最好的时机',
          '扩展人脉和社交圈——多参加聚会、行业活动或兴趣社群，贵人可能就在其中',
          '学习新技能、拓展视野——报个课、读本书、去个没去过的地方，打开你的世界'
        );
        mustNot.push(
          '不要承诺过多——运势好不等于精力无限，学会对不重要的事说"不"',
          '不要过度乐观而忽视风险——做重要决定前先想想最坏的情况你能不能承受'
        );
      } else if (majorEvent.name === '天王星对分相') {
        mustDo.push(
          '给自己充分的探索空间——尝试一个新爱好、去一个新地方、认识一些不同圈子的人',
          '和亲近的人坦诚沟通——把内心的不安和渴望说出来，而不是一个人默默消化',
          '做一些打破常规的事——换个发型、调整职业方向、重新规划生活节奏都可以'
        );
        mustNot.push(
          '不要在冲动下做不可逆的决定——想离职、分手、搬家都行，但给自己至少一个月的冷静期',
          '不要压抑内心的渴望——想改变是正常的，关键是找到健康的方式去回应它'
        );
      }
    } else if (score >= 65) {
      mustDo.push(
        '抓住机遇、积极行动——好运来了就要接住，犹豫太久机会就溜走了',
        '扩展人脉、建立合作——多认识优秀的人，一个好的合作可能改变你的轨迹',
        '投资自己、学习成长——把赚到的钱和时间拿一部分出来提升自己，这是回报率最高的投资'
      );
      mustNot.push(
        '不要骄傲自满——越是顺利越要保持谦逊，你今天的好运明天也可能属于别人',
        '不要冒不必要的风险——运势好不代表做什么都能成功，大额投资和重大决定仍需谨慎'
      );
    } else if (score >= 45) {
      mustDo.push(
        '稳扎稳打、巩固基础——现在不是冒险的时候，把手头的事情做好比什么都重要',
        '提升核心技能——利用这段平稳期学习和充电，为未来的机遇做好准备',
        '维护重要关系——和家人、朋友、同事保持良好的连接，困难时他们是你最大的支撑'
      );
      mustNot.push(
        '不要急于求成——欲速则不达，按照自己的节奏来就好',
        '不要做重大冒险——大额投资、跨行创业等高风险动作建议推迟到运势更好的时候'
      );
    } else {
      mustDo.push(
        '保持耐心、蛰伏等待——低谷期最重要的能力就是"忍耐"，咬牙坚持就是胜利',
        '关注身心健康——压力大的时候更要好好吃饭、好好睡觉、好好运动，身体是革命的本钱',
        '反思和调整方向——利用这段时间想清楚什么是自己真正想要的，为下一次起飞做准备'
      );
      mustNot.push(
        '不要自暴自弃——低谷是暂时的，你的价值不会因为一段时间的不顺就消失',
        '不要在情绪低落时做重大决定——冲动辞职、结束关系等大事请先冷静再说'
      );
    }

    return { mustDo, mustNot };
  },

  /**
   * 关闭年度详情弹窗
   */
  closeYearDetail() {
    this.setData({ showYearDetail: false }, () => {
      setTimeout(() => this.redrawChart(), 50);
    });
  },

  /**
   * 切换详情Tab
   */
  onDetailTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  /**
   * 切换报告章节展开
   */
  toggleSection(e) {
    const section = e.currentTarget.dataset.section;
    const key = `expandedSections.${section}`;
    this.setData({
      [key]: !this.data.expandedSections[section]
    });
  },

  /**
   * 锁定章节点击
   */
  onLockedSectionClick(e) {
    const section = e.currentTarget.dataset.section;
    const sectionNames = {
      future: '未来三十载',
      milestone: '人生里程碑',
      letter: '予未来之我'
    };
    const name = sectionNames[section] || '该章节';

    wx.showModal({
      title: `「${name}」尚未解锁`,
      content: '解锁完整命书即可查看全部章节内容，包括未来运势预测、人生里程碑、给未来自己的寄语。',
      confirmText: '立即解锁',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.onUnlockReport();
        }
      }
    });
  },

  /**
   * 解锁付费内容
   */
  async onUnlockReport() {
    // 开发模式：直接解锁
    if (this.data.devMode) {
      this.setData({
        isUnlocked: true,
        expandedSections: { overview: true, past: true, present: true, future: true, milestone: true, letter: true }
      });
      wx.showToast({ title: '已解锁完整报告', icon: 'success' });
      return;
    }

    // 检查用户登录状态
    if (!this.data.userInfo) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      return;
    }

    // TODO: 正式版接入支付
    wx.showModal({
      title: '解锁完整报告',
      content: '人生K线完整报告包含：\n• 未来30年运势详解\n• 人生里程碑预测\n• 给未来的你\n\n订阅VIP会员可自动解锁所有报告。',
      confirmText: '了解VIP',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/me/me' });
        }
      }
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 阻止冒泡
   */
  preventBubble() {}
});
