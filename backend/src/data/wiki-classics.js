/**
 * 占星经典书籍完整数据（含50本书基本信息）
 * 内容深度解读由 DeepSeek Reasoner 生成
 */

const buildContent = (sections) => sections.filter(Boolean).join('\n\n');

// 50本占星经典书籍完整列表
const CLASSIC_BOOKS = [
  // 第一阶段：奠基——掌握占星的"语法" (入门-初阶)
  {
    id: 'contemporary-astrologers-handbook',
    title: '当代占星研究',
    enTitle: 'The Contemporary Astrologer\'s Handbook',
    author: '苏·汤普金斯',
    enAuthor: 'Sue Tompkins',
    summary: '现代心理占星学的理论架构与实务诠释',
    keywords: ['心理占星', '星盘整合', '入门经典', '苏·汤普金斯'],
    stage: '第一阶段：奠基'
  },
  {
    id: 'aspects-in-astrology',
    title: '占星相位研究',
    enTitle: 'Aspects in Astrology',
    author: '苏·汤普金斯',
    enAuthor: 'Sue Tompkins',
    summary: '动力结构的百科全书',
    keywords: ['相位', '心理动力', '解盘逻辑'],
    stage: '第一阶段：奠基'
  },
  {
    id: 'twelve-houses-sasportas',
    title: '占星十二宫位',
    enTitle: 'The Twelve Houses',
    author: '霍华德·萨司波塔斯',
    enAuthor: 'Howard Sasportas',
    summary: '宫位解读的巅峰之作',
    keywords: ['宫位', '生活领域', '心理动机'],
    stage: '第一阶段：奠基'
  },
  {
    id: 'four-elements',
    title: '生命四元素',
    enTitle: 'Astrology, Psychology, and the Four Elements',
    author: '史蒂芬·阿若优',
    enAuthor: 'Stephen Arroyo',
    summary: '能量系统的教科书',
    keywords: ['四元素', '心理类型', '能量语言'],
    stage: '第一阶段：奠基'
  },
  {
    id: 'chart-interpretation-handbook',
    title: '占星护照',
    enTitle: 'Chart Interpretation Handbook',
    author: '史蒂芬·阿若优',
    enAuthor: 'Stephen Arroyo',
    summary: '整合碎片知识的速查手册',
    keywords: ['解盘', '整合', '入门指南'],
    stage: '第一阶段：奠基'
  },
  {
    id: 'inner-sky',
    title: '内在的天空',
    enTitle: 'The Inner Sky',
    author: '史蒂芬·福里斯特',
    enAuthor: 'Steven Forrest',
    summary: '成长导向的入门首选',
    keywords: ['演化占星', '自由意志', '入门'],
    stage: '第一阶段：奠基'
  },
  {
    id: 'twelve-houses-marks',
    title: '人生的十二个面向',
    enTitle: 'The Twelve Houses',
    author: '特蕾西·马克斯',
    enAuthor: 'Tracy Marks',
    summary: '宫位与心理动力的补充阅读',
    keywords: ['宫位', '心理动力', '补充读物'],
    stage: '第一阶段：奠基'
  },

  // 第二阶段：深化——心理动力与灵魂进化 (进阶)
  {
    id: 'saturn-new-look',
    title: '土星：从新观点看老恶魔',
    enTitle: 'Saturn: A New Look at an Old Devil',
    author: '丽兹·格林',
    enAuthor: 'Liz Greene',
    summary: '心理占星的基石',
    keywords: ['土星', '心理占星', '阴影', '荣格'],
    stage: '第二阶段：深化'
  },
  {
    id: 'astrological-neptune',
    title: '海王星：生命是一场追寻救赎的旅程',
    enTitle: 'The Astrological Neptune',
    author: '丽兹·格林',
    enAuthor: 'Liz Greene',
    summary: '渴望、幻觉与成瘾的深度剖析',
    keywords: ['海王星', '渴望', '成瘾', '疗愈'],
    stage: '第二阶段：深化'
  },
  {
    id: 'pluto-evolutionary-journey',
    title: '冥王星：灵魂的演化之旅',
    enTitle: 'Pluto: The Evolutionary Journey of the Soul',
    author: '杰夫·格林',
    enAuthor: 'Jeff Green',
    summary: '创伤与业力的手术刀',
    keywords: ['冥王星', '创伤', '业力', '演化占星'],
    stage: '第二阶段：深化'
  },
  {
    id: 'chiron-healing-journey',
    title: '凯龙星：灵魂的创伤与疗愈',
    enTitle: 'Chiron and the Healing Journey',
    author: '梅兰妮·瑞哈特',
    enAuthor: 'Melanie Reinhart',
    summary: '受伤疗愈者的圣经',
    keywords: ['凯龙星', '疗愈', '创伤', '阴影'],
    stage: '第二阶段：深化'
  },
  {
    id: 'family-astrology',
    title: '家族占星',
    enTitle: 'Family Astrology',
    author: '丽兹·格林',
    enAuthor: 'Liz Greene',
    summary: '原生家庭的遗传与心理纠葛',
    keywords: ['家族', '原生家庭', '心理遗传'],
    stage: '第二阶段：深化'
  },
  {
    id: 'astrology-karma-transformation',
    title: '占星、业力与转化',
    enTitle: 'Astrology, Karma & Transformation',
    author: '史蒂芬·阿若优',
    enAuthor: 'Stephen Arroyo',
    summary: '外行星与个人转化的关系',
    keywords: ['业力', '转化', '外行星'],
    stage: '第二阶段：深化'
  },
  {
    id: 'relationships-life-cycles',
    title: '人际关系占星学',
    enTitle: 'Relationships and Life Cycles',
    author: '史蒂芬·阿若优',
    enAuthor: 'Stephen Arroyo',
    summary: '人际互动的能量流动',
    keywords: ['关系', '人际', '能量流动'],
    stage: '第二阶段：深化'
  },
  {
    id: 'gods-of-change',
    title: '生命的轨迹',
    enTitle: 'The Gods of Change',
    author: '霍华德·萨司波塔斯',
    enAuthor: 'Howard Sasportas',
    summary: '外行星行运对人生的改变',
    keywords: ['外行星', '行运', '命运改变'],
    stage: '第二阶段：深化'
  },

  // 第三阶段：技法——流年预测与合盘 (高阶)
  {
    id: 'planets-in-transit',
    title: '行星行运全书',
    enTitle: 'Planets in Transit',
    author: '罗伯特·汉德',
    enAuthor: 'Robert Hand',
    summary: '推运的百科全书',
    keywords: ['行运', 'Transit', '预测', '推运'],
    stage: '第三阶段：技法'
  },
  {
    id: 'predictive-astrology-eagle',
    title: '预测占星学',
    enTitle: 'Predictive Astrology: The Eagle and the Lark',
    author: '伯纳黛特·布雷迪',
    enAuthor: 'Bernadette Brady',
    summary: '现代推运逻辑的集大成者',
    keywords: ['预测', '推运', '时间点'],
    stage: '第三阶段：技法'
  },
  {
    id: 'solar-arcs',
    title: '太阳弧推运法',
    enTitle: 'Solar Arcs',
    author: '诺埃尔·蒂尔',
    enAuthor: 'Noel Tyl',
    summary: '精准定位重大生命事件的技法',
    keywords: ['太阳弧', '事件定位', '技法'],
    stage: '第三阶段：技法'
  },
  {
    id: 'planets-in-composite',
    title: '组合盘：两人关系的奥秘',
    enTitle: 'Planets in Composite',
    author: '罗伯特·汉德',
    enAuthor: 'Robert Hand',
    summary: '两人关系能量场的研究',
    keywords: ['组合盘', 'Composite', '关系'],
    stage: '第三阶段：技法'
  },
  {
    id: 'synastry-davison',
    title: '关系合盘',
    enTitle: 'Synastry',
    author: '罗纳德·戴维森',
    enAuthor: 'Ronald Davison',
    summary: '比较盘的基础读物',
    keywords: ['比较盘', 'Synastry', '关系'],
    stage: '第三阶段：技法'
  },
  {
    id: 'progressed-moon',
    title: '月亮推运法',
    enTitle: 'The Progressed Moon',
    author: '各类作者',
    enAuthor: 'Various Authors',
    summary: '次限法的补充学习',
    keywords: ['次限法', '月亮推运', 'Progressed Moon'],
    stage: '第三阶段：技法'
  },

  // 第四阶段：回溯——古典占星与希腊化占星 (大师之路)
  {
    id: 'hellenistic-astrology',
    title: '希腊化占星',
    enTitle: 'Hellenistic Astrology: The Study of Fate and Fortune',
    author: '克里斯·布伦南',
    enAuthor: 'Chris Brennan',
    summary: '古典占星复兴的里程碑',
    keywords: ['希腊化', '古典占星', '技法', '历史'],
    stage: '第四阶段：回溯'
  },
  {
    id: 'ancient-astrology-vol1',
    title: '古代占星理论与实践 第一卷',
    enTitle: 'Ancient Astrology in Theory and Practice, Vol 1',
    author: '德梅特拉·乔治',
    enAuthor: 'Demetra George',
    summary: '古典占星的教科书（上册）',
    keywords: ['古典占星', '尊贵', '技法'],
    stage: '第四阶段：回溯'
  },
  {
    id: 'ancient-astrology-vol2',
    title: '古代占星理论与实践 第二卷',
    enTitle: 'Ancient Astrology in Theory and Practice, Vol 2',
    author: '德梅特拉·乔治',
    enAuthor: 'Demetra George',
    summary: '古典占星的教科书（下册）',
    keywords: ['古典占星', '判断法则', '技法'],
    stage: '第四阶段：回溯'
  },
  {
    id: 'christian-astrology',
    title: '基督徒占星',
    enTitle: 'Christian Astrology',
    author: '威廉·莉莉',
    enAuthor: 'William Lilly',
    summary: '卜卦与本命占星的17世纪经典',
    keywords: ['卜卦', '古典占星', '威廉·莉莉'],
    stage: '第四阶段：回溯'
  },
  {
    id: 'carmen-astrologicum',
    title: '卡门占星',
    enTitle: 'Carmen Astrologicum',
    author: '西顿的多罗西斯',
    enAuthor: 'Dorotheus of Sidon',
    summary: '希腊化时期的择日与本命经典',
    keywords: ['希腊化', '择日', '择时'],
    stage: '第四阶段：回溯'
  },
  {
    id: 'tetrabiblos',
    title: '四书',
    enTitle: 'Tetrabiblos',
    author: '托勒密',
    enAuthor: 'Ptolemy',
    summary: '占星学历史上的"圣经"',
    keywords: ['托勒密', '古典占星', '哲学'],
    stage: '第四阶段：回溯'
  },
  {
    id: 'traditional-astrology-today',
    title: '传统占星学',
    enTitle: 'Traditional Astrology for Today',
    author: '本杰明·戴克斯',
    enAuthor: 'Benjamin Dykes',
    summary: '现代思维转向古典思维的桥梁',
    keywords: ['传统占星', '古典', '入门'],
    stage: '第四阶段：回溯'
  },
  {
    id: 'horary-textbook',
    title: '卜卦全书',
    enTitle: 'The Horary Textbook',
    author: '约翰·福利',
    enAuthor: 'John Frawley',
    summary: '现代卜卦学习的最佳指南',
    keywords: ['卜卦', 'Horary', '问事'],
    stage: '第四阶段：回溯'
  },
  {
    id: 'real-astrology-applied',
    title: '真正实用的占星学',
    enTitle: 'The Real Astrology Applied',
    author: '约翰·福利',
    enAuthor: 'John Frawley',
    summary: '古典技法的现代应用',
    keywords: ['古典技法', '实用', '批判'],
    stage: '第四阶段：回溯'
  },

  // 第五阶段：专精——特殊领域与天文学 (专家级)
  {
    id: 'brady-book-fixed-stars',
    title: '布雷迪恒星书',
    enTitle: 'Brady\'s Book of Fixed Stars',
    author: '伯纳黛特·布雷迪',
    enAuthor: 'Bernadette Brady',
    summary: '背景恒星对命运的深层影响',
    keywords: ['恒星', 'Fixed Stars', '背景恒星'],
    stage: '第五阶段：专精'
  },
  {
    id: 'combination-stellar-influences',
    title: '中点组合论',
    enTitle: 'The Combination of Stellar Influences',
    author: '莱因霍尔德·埃伯廷',
    enAuthor: 'Reinhold Ebertin',
    summary: '汉堡学派/中点占星的字典',
    keywords: ['中点', '汉堡学派', '医疗占星'],
    stage: '第五阶段：专精'
  },
  {
    id: 'electional-astrology',
    title: '择日占星',
    enTitle: 'Electional Astrology',
    author: '维维安·罗布森',
    enAuthor: 'Vivian Robson',
    summary: '选择最佳时间的指南',
    keywords: ['择日', 'Electional', '择时'],
    stage: '第五阶段：专精'
  },
  {
    id: 'mundane-astrology',
    title: '世俗占星学',
    enTitle: 'Mundane Astrology',
    author: '贝根特等',
    enAuthor: 'Baigent, Campion, and Harvey',
    summary: '国运、政治、经济变动的权威',
    keywords: ['世俗占星', '政治', '经济', '集体'],
    stage: '第五阶段：专精'
  },
  {
    id: 'medical-astrology',
    title: '占星医案',
    enTitle: 'Medical Astrology',
    author: '伊琳·诺曼',
    enAuthor: 'Eileen Nauman',
    summary: '身体健康与星盘的对应',
    keywords: ['医疗占星', '健康', '身体'],
    stage: '第五阶段：专精'
  },

  // 第六阶段：哲学与整合——道的层面 (宗师级)
  {
    id: 'cosmos-psyche',
    title: '宇宙与心灵',
    enTitle: 'Cosmos and Psyche',
    author: '理查德·塔纳斯',
    enAuthor: 'Richard Tarnas',
    summary: '行星周期与人类文明的共时性',
    keywords: ['哲学', '共时性', '文明', '深度'],
    stage: '第六阶段：哲学'
  },
  {
    id: 'pulse-of-life',
    title: '生命的脉动',
    enTitle: 'The Pulse of Life',
    author: '丹恩·鲁伊尔',
    enAuthor: 'Dane Rudhyar',
    summary: '人本主义占星之父的哲学著作',
    keywords: ['人本主义', '哲学', '黄道'],
    stage: '第六阶段：哲学'
  },
  {
    id: 'jung-astrology',
    title: '荣格与占星学',
    enTitle: 'Jung and Astrology',
    author: '玛吉·海德',
    enAuthor: 'Maggie Hyde',
    summary: '共时性原理的深度探讨',
    keywords: ['荣格', '共时性', '心理学'],
    stage: '第六阶段：哲学'
  },

  // 补充书单：工具书与拓展
  {
    id: 'retrograde-planets',
    title: '逆行行星',
    enTitle: 'Retrograde Planets',
    author: '艾琳·沙利文',
    enAuthor: 'Erin Sullivan',
    summary: '逆行现象的深度解读',
    keywords: ['逆行', 'Retrograde', '行星运动'],
    stage: '补充书单'
  },
  {
    id: 'book-of-moon',
    title: '月亮之书',
    enTitle: 'The Book of the Moon',
    author: '史蒂芬·福里斯特',
    enAuthor: 'Steven Forrest',
    summary: '月亮的全方位解读',
    keywords: ['月亮', '月球', '情感'],
    stage: '补充书单'
  },
  {
    id: 'vocational-astrology',
    title: '职业占星',
    enTitle: 'Vocational Astrology',
    author: '朱迪思·希尔',
    enAuthor: 'Judith Hill',
    summary: '事业方向与天赋发现',
    keywords: ['职业', '事业', '天赋'],
    stage: '补充书单'
  },
  {
    id: 'vettius-valens-anthology',
    title: 'Vettius Valens 选集',
    enTitle: 'Anthology',
    author: '瓦伦斯',
    enAuthor: 'Vettius Valens',
    summary: '古典实战案例集',
    keywords: ['古典', '案例', '实战'],
    stage: '补充书单'
  },
  {
    id: 'bonatti-astrology',
    title: 'Bonatti占星',
    enTitle: 'Bonatti on Astrology',
    author: '博纳蒂',
    enAuthor: 'Guido Bonatti',
    summary: '中世纪占星集大成',
    keywords: ['中世纪', '古典', '技法'],
    stage: '补充书单'
  },
  {
    id: 'visual-astrology',
    title: '视觉占星',
    enTitle: 'Visual Astrology',
    author: '伯纳黛特·布雷迪',
    enAuthor: 'Bernadette Brady',
    summary: '回归天空观测的占星',
    keywords: ['天空观测', '视觉', '回归'],
    stage: '补充书单'
  },
  {
    id: 'sabian-symbols',
    title: '萨比恩征象',
    enTitle: 'The Sabian Symbols',
    author: '马克·埃德蒙·琼斯',
    enAuthor: 'Marc Edmund Jones',
    summary: '萨比恩符号的灵性技法',
    keywords: ['萨比恩', '符号', '灵性'],
    stage: '补充书单'
  },
  {
    id: 'planetary-cycles',
    title: '行星周期',
    enTitle: 'Planetary Cycles',
    author: '安德烈·巴尔博',
    enAuthor: 'Andre Barbault',
    summary: '历史大周期的经典研究',
    keywords: ['周期', '历史', '大周期'],
    stage: '补充书单'
  },
  {
    id: 'houses-temples-sky',
    title: '宫位：天空的神殿',
    enTitle: 'The Houses: Temples of the Sky',
    author: '黛博拉·霍尔丁',
    enAuthor: 'Deborah Houlding',
    summary: '宫位历史含义的深度考据',
    keywords: ['宫位', '历史', '含义'],
    stage: '补充书单'
  },
  {
    id: 'astrology-for-soul',
    title: '灵魂占星',
    enTitle: 'Astrology for the Soul',
    author: '简·斯皮勒',
    enAuthor: 'Jan Spiller',
    summary: '南北交点的实操指南',
    keywords: ['南北交点', '灵魂', '成长'],
    stage: '补充书单'
  },
  {
    id: 'dynamics-aspect-analysis',
    title: '相位图形分析',
    enTitle: 'Dynamics of Aspect Analysis',
    author: '比尔·蒂尔尼',
    enAuthor: 'Bil Tierney',
    summary: 'T三角、大三角等格局分析',
    keywords: ['相位格局', '图形', '分析'],
    stage: '补充书单'
  },
  {
    id: 'financial-astrology',
    title: '金融占星',
    enTitle: 'Financial Astrology',
    author: '大卫·威廉姆斯',
    enAuthor: 'David Williams',
    summary: '股市与金融市场的占星预测',
    keywords: ['金融', '股市', '经济'],
    stage: '补充书单'
  },
  {
    id: 'consulting-astrology',
    title: '占星咨询',
    enTitle: 'Consulting with Astrology',
    author: '温迪·阿什利',
    enAuthor: 'Wendy Ashley',
    summary: '咨询技巧与客户对话指南',
    keywords: ['咨询', '技巧', '对话'],
    stage: '补充书单'
  },
  {
    id: 'manilius-astronomica',
    title: '占星诗集',
    enTitle: 'Astronomica',
    author: '马尼利乌斯',
    enAuthor: 'Marcus Manilius',
    summary: '最古老的拉丁文占星诗',
    keywords: ['诗歌', '古典', '文学'],
    stage: '补充书单'
  },
  {
    id: 'astrology-personality',
    title: '人格的占星学',
    enTitle: 'Astrology of Personality',
    author: '丹恩·鲁伊尔',
    enAuthor: 'Dane Rudhyar',
    summary: '现代心理占星之父的经典',
    keywords: ['人格', '心理占星', '哲学'],
    stage: '补充书单'
  }
];

// 构建中文数据（从静态文件合并现有内容）
const WIKI_CLASSICS_ZH = CLASSIC_BOOKS.map(book => ({
  id: book.id,
  title: book.title,
  author: book.author,
  summary: book.summary,
  cover_url: null,
  keywords: book.keywords,
  stage: book.stage
}));

// 构建英文数据
const WIKI_CLASSICS_EN = CLASSIC_BOOKS.map(book => ({
  id: book.id,
  title: book.enTitle,
  author: book.enAuthor,
  summary: book.summary, // 英文summary需要翻译或重新生成
  cover_url: null,
  keywords: book.keywords, // 关键词可以保持或翻译
  stage: book.stage
}));

// 导出函数：获取经典书籍列表
function getWikiClassics(lang) {
  const data = lang === 'en' ? WIKI_CLASSICS_EN : WIKI_CLASSICS_ZH;
  return data.map(item => ({
    id: item.id,
    title: item.title,
    author: item.author,
    summary: item.summary,
    cover_url: item.cover_url,
    keywords: item.keywords,
    stage: item.stage
  }));
}

// 导出函数：本书详情获取单
function getWikiClassicDetail(id, lang) {
  const data = lang === 'en' ? WIKI_CLASSICS_EN : WIKI_CLASSICS_ZH;
  const book = data.find(item => item.id === id);
  if (!book) return null;
  
  return {
    ...book,
    lang,
    content: book.content || `《${book.title》正在深度解读生成中，敬请期待。`
  };
}

export {
  WIKI_CLASSICS_ZH,
  WIKI_CLASSICS_EN,
  getWikiClassics,
  getWikiClassicDetail,
  CLASSIC_BOOKS
};

export default {
  WIKI_CLASSICS_ZH,
  WIKI_CLASSICS_EN,
  getWikiClassics,
  getWikiClassicDetail
};
