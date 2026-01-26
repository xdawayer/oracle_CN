const PLANETS = [
  { id: 'sun', name: '太阳', symbol: '☉', angle: 230, sign: '天蝎座', house: 2, color: '#F59E0B', description: '你的核心自我。拥有深刻的洞察力。', degree: "15°20'" },
  { id: 'moon', name: '月亮', symbol: '☽', angle: 340, sign: '双鱼座', house: 6, color: '#9CA3AF', description: '你的情感需求。极强的同理心。', degree: "08°45'" },
  { id: 'mercury', name: '水星', symbol: '☿', angle: 245, sign: '射手座', house: 3, color: '#10B981', description: '沟通与思维。直言不讳。', degree: "22°10'" },
  { id: 'venus', name: '金星', symbol: '♀', angle: 200, sign: '天秤座', house: 1, color: '#EC4899', description: '爱与价值观。追求和谐。', degree: "05°30'" },
  { id: 'mars', name: '火星', symbol: '♂', angle: 160, sign: '处女座', house: 12, color: '#EF4444', description: '行动力。注重细节。', degree: "18°55'" },
  { id: 'jupiter', name: '木星', symbol: '♃', angle: 80, sign: '双子座', house: 9, color: '#8B5CF6', description: '扩张与幸运。通过学习成长。', degree: "12°40'" },
  { id: 'saturn', name: '土星', symbol: '♄', angle: 300, sign: '摩羯座', house: 4, color: '#4B5563', description: '责任与限制。家庭责任。', degree: "29°05'" },
  { id: 'asc', name: '上升', symbol: 'Asc', angle: 170, sign: '处女座', house: 1, color: '#0A0B0D', description: '外在表现。谦逊整洁。', degree: "10°00'" },
];

const ASPECTS = [
  { id: 'a1', from: 'sun', to: 'moon', type: 'trine', angle: 110, description: '日水和谐：理智与情感的平衡。' },
  { id: 'a2', from: 'sun', to: 'mars', type: 'square', angle: 90, description: '日火刑：意志与行动的冲突。' },
  { id: 'a3', from: 'venus', to: 'jupiter', type: 'trine', angle: 120, description: '金木拱：极佳的财运与人缘。' },
];

Page({
  data: {
    planets: [],
    aspects: [],
    big3: [],
    lifeDomains: [
      { id: 'career', title: '财运事业', desc: '二宫主星飞星良好' },
      { id: 'marriage', title: '婚恋关系', desc: '七宫落双鱼座' },
      { id: 'health', title: '身体健康', desc: '六宫群星汇聚' },
      { id: 'relations', title: '人际交往', desc: '十一宫贵人运' },
      { id: 'study', title: '学业考试', desc: '水星相位极佳' },
      { id: 'love', title: '恋爱桃花', desc: '金星入庙天秤' },
    ],
    selectedItem: null,
    isZoomed: false,
    showPayment: false,
    paymentLoading: false,
    expandedSection: null,

    chartSize: 350,
    fullChartSize: 400,
    radarSize: 300,

    // 星盘组件数据
    chartPositions: [],
    chartAspects: [],
    chartHouseCusps: [],
  },

  onLoad() {
    this.fetchData();
  },

  async fetchData() {
    wx.showLoading({ title: 'Loading...' });
    try {
      const planets = PLANETS;
      const aspects = ASPECTS;

      const enhancedAspects = aspects.map(a => ({
        ...a,
        fromName: planets.find(p => p.id === a.from)?.name || a.from,
        toName: planets.find(p => p.id === a.to)?.name || a.to
      }));

      const big3 = [
        planets.find(p => p.id === 'sun'),
        planets.find(p => p.id === 'moon'),
        planets.find(p => p.id === 'asc'),
      ].filter(Boolean);

      // 转换为星盘组件格式
      const chartPositions = this.convertToChartPositions(planets);
      const chartAspects = this.convertToChartAspects(aspects, planets);
      const chartHouseCusps = this.generateMockHouseCusps();

      this.setData({
        planets,
        aspects: enhancedAspects,
        big3,
        chartPositions,
        chartAspects,
        chartHouseCusps,
      }, () => {
        this.drawRadarChart('radarChart', this.data.radarSize);
      });

    } catch (err) {
      console.error('Fetch data failed', err);
      const planets = PLANETS;
      const aspects = ASPECTS;

      this.setData({
        planets: PLANETS,
        aspects: ASPECTS.map(a => ({
           ...a,
           fromName: PLANETS.find(p => p.id === a.from)?.name,
           toName: PLANETS.find(p => p.id === a.to)?.name
        })),
        big3: [PLANETS[0], PLANETS[1], PLANETS[7]],
        chartPositions: this.convertToChartPositions(planets),
        chartAspects: this.convertToChartAspects(aspects, planets),
        chartHouseCusps: this.generateMockHouseCusps(),
      }, () => {
        this.drawRadarChart('radarChart', this.data.radarSize);
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 转换行星数据为星盘组件格式
  convertToChartPositions(planets) {
    const signMap = {
      '白羊座': 'Aries', '金牛座': 'Taurus', '双子座': 'Gemini', '巨蟹座': 'Cancer',
      '狮子座': 'Leo', '处女座': 'Virgo', '天秤座': 'Libra', '天蝎座': 'Scorpio',
      '射手座': 'Sagittarius', '摩羯座': 'Capricorn', '水瓶座': 'Aquarius', '双鱼座': 'Pisces'
    };

    const nameMap = {
      '太阳': 'Sun', '月亮': 'Moon', '水星': 'Mercury', '金星': 'Venus',
      '火星': 'Mars', '木星': 'Jupiter', '土星': 'Saturn', '上升': 'Ascendant'
    };

    return planets.map(p => {
      const degreeStr = p.degree.replace(/[°']/g, '');
      const [deg, min] = degreeStr.split(/[°']/).map(s => parseInt(s) || 0);

      return {
        name: nameMap[p.name] || p.name,
        sign: signMap[p.sign] || p.sign,
        degree: deg,
        minute: min,
        house: p.house,
      };
    });
  },

  // 转换相位数据为星盘组件格式
  convertToChartAspects(aspects, planets) {
    const nameMap = {
      '太阳': 'Sun', '月亮': 'Moon', '水星': 'Mercury', '金星': 'Venus',
      '火星': 'Mars', '木星': 'Jupiter', '土星': 'Saturn', '上升': 'Ascendant'
    };

    return aspects.map(a => {
      const p1 = planets.find(p => p.id === a.from);
      const p2 = planets.find(p => p.id === a.to);

      return {
        planet1: nameMap[p1?.name] || a.from,
        planet2: nameMap[p2?.name] || a.to,
        type: a.type,
        orb: 2.5,
        isApplying: false,
      };
    });
  },

  // 生成模拟宫位数据
  generateMockHouseCusps() {
    // 从上升点开始，每30度一个宫位（简化版）
    const ascAngle = 170; // 上升点角度
    return Array.from({ length: 12 }, (_, i) => (ascAngle + i * 30) % 360);
  },

  drawRadarChart(canvasId, size) {
      const query = wx.createSelectorQuery();
     query.select('#' + canvasId)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        const width = size;
        const height = size;
        const cx = width / 2;
        const cy = height / 2;
        const r = width / 2 - 40;

        ctx.clearRect(0, 0, width, height);
        
        const data = [85, 78, 90, 72, 60, 88, 65, 75, 95, 70, 80, 85];
        const labels = ['自我', '情感', '沟通', '关系', '行动', '成长', '责任', '创新', '灵性', '转化', '疗愈', '命运'];
        const total = 12;

        ctx.strokeStyle = '#EFEAE2';
        ctx.fillStyle = '#7A746B';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        [0.2, 0.4, 0.6, 0.8, 1.0].forEach(scale => {
           ctx.beginPath();
           for(let i=0; i<total; i++) {
              const rad = (i * 360 / total - 90) * Math.PI / 180;
              const x = cx + r * scale * Math.cos(rad);
              const y = cy + r * scale * Math.sin(rad);
              if (i===0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
           }
           ctx.closePath();
           ctx.stroke();
        });

        for(let i=0; i<total; i++) {
           const rad = (i * 360 / total - 90) * Math.PI / 180;
           const x = cx + r * Math.cos(rad);
           const y = cy + r * Math.sin(rad);
           ctx.beginPath();
           ctx.moveTo(cx, cy);
           ctx.lineTo(x, y);
           ctx.stroke();

           const labelR = r + 20;
           const lx = cx + labelR * Math.cos(rad);
           const ly = cy + labelR * Math.sin(rad);
           ctx.fillText(labels[i], lx, ly);
        }

        ctx.beginPath();
        for(let i=0; i<total; i++) {
           const val = data[i] / 100;
           const rad = (i * 360 / total - 90) * Math.PI / 180;
           const x = cx + r * val * Math.cos(rad);
           const y = cy + r * val * Math.sin(rad);
           if (i===0) ctx.moveTo(x, y);
           else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
  },

  onSelectPlanet(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({ selectedItem: item });
  },

  showPaymentModal() {
    this.setData({ showPayment: true });
  },

  closePayment() {
    this.setData({ showPayment: false });
  },

  handlePay() {
    this.setData({ paymentLoading: true });
    setTimeout(() => {
      this.setData({ paymentLoading: false, showPayment: false });
      wx.showToast({ title: 'Payment logic', icon: 'none' });
    }, 1500);
  },

  closeDetail() {
    this.setData({ selectedItem: null });
  },

  toggleZoom() {
    const newZoom = !this.data.isZoomed;
    this.setData({ isZoomed: newZoom }, () => {
       if (newZoom) {
          setTimeout(() => {
             this.drawNatalChart('natalChartFull', 350);
          }, 100);
       }
    });
  },

  toggleAccordion(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedSection: this.data.expandedSection === id ? null : id
    });
  },
  
  onDomainClick() {},

  stopProp() {}
})
