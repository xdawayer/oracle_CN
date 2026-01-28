const storage = require('../../utils/storage');

Page({
  data: {
    features: [
      { id: 'kline', title: '人生K线', desc: '命运起伏趋势', route: 'kline', colorClass: 'bg-indigo', icon: '/images/icons/career.svg' },
      { id: 'pairing', title: '星座配对', desc: '契合度指数', route: 'pairing', colorClass: 'bg-rose', icon: '/images/icons/love.svg' },
      { id: 'chart', title: '专业排盘', desc: '本命/行运/推运', route: 'chart', colorClass: 'bg-purple', icon: '/images/astro-symbols/sun.svg' },
      { id: 'cbt', title: 'CBT 情绪日记', desc: '6步觉察与疗愈', route: 'cbt', colorClass: 'bg-emerald', icon: '/images/icons/health.svg' },
      { id: 'ask', title: '星象问答', desc: 'AI 深度咨询', route: 'ask', colorClass: 'bg-violet', icon: '/images/icons/relations.svg' },
      { id: 'wiki', title: '占星百科', desc: '系统化知识库', route: 'wiki', colorClass: 'bg-blue', icon: '/images/icons/study.svg' }
    ],
    topics: [
      { tag: '#热门', title: '冥王星进入水瓶座对时代的影响' },
      { tag: '#技巧', title: '如何利用金星行运提升桃花运？' },
      { tag: '#科普', title: '什么是凯龙星？伤痛与疗愈的指引' }
    ]
  },

  navToSynastry() {
    wx.navigateTo({ url: '/pages/synastry/synastry' });
  },

  onShow() {
    const entry = storage.get('discovery_entry');
    if (entry === 'synastry') {
      storage.remove('discovery_entry');
      wx.navigateTo({ url: '/pages/synastry/synastry' });
    }
  },

  navToSynthetica() {
    wx.navigateTo({ url: '/pages/synthetica/synthetica' });
  },

  navToFeature(e) {
    const route = e.currentTarget.dataset.route;
    wx.navigateTo({ url: `/pages/${route}/${route}` });
  }
});
