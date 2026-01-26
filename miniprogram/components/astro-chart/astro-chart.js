// INPUT: 星盘数据（行星位置、相位、宫位）
// OUTPUT: Canvas 2D 绘制的星盘可视化
// POS: 小程序星盘组件主逻辑

import {
  getChartConfig,
  PLANET_META,
  SIGN_META,
  SIGN_NAMES,
  ASPECT_COLORS,
  VISUAL_LAYER_STYLES,
} from '../../constants/chart-config.js';

import {
  getAbsoluteAngle,
  getCoords,
  normalizeAngle,
  spreadPlanets,
  filterPlanets,
  filterAspects,
  calculateAspectsFromAngles,
  calculateCrossAspectsFromAngles,
  getAspectLayer,
  isLuminaryAspect,
  isOuterPlanetOnlyAspect,
  stripOuterPrefix,
} from './chart-utils.js';

Component({
  properties: {
    // 盘型：'natal' | 'transit' | 'synastry' | 'composite'
    type: {
      type: String,
      value: 'natal'
    },
    // 行星位置数据
    positions: {
      type: Array,
      value: []
    },
    // 相位数据（可选，如果不提供则自动计算）
    aspects: {
      type: Array,
      value: null
    },
    // 宫位数据（12个宫头的黄道经度）
    houseCusps: {
      type: Array,
      value: []
    },
    // 外环行星位置（用于双轮盘）
    outerPositions: {
      type: Array,
      value: []
    },
    // 画布尺寸
    width: {
      type: Number,
      value: 350
    },
    height: {
      type: Number,
      value: 350
    },
    // 自定义配置（可选）
    config: {
      type: Object,
      value: null
    },
  },

  data: {
    selectedPlanet: null,
    detailCardX: 0,
    detailCardY: 0,
  },

  lifetimes: {
    attached() {
      this.initCanvas();
    },
    ready() {
      if (this.data.positions.length > 0) {
        this.drawChart();
      }
    },
  },

  observers: {
    'positions, outerPositions, aspects, houseCusps, type': function() {
      if (this.canvas) {
        this.drawChart();
      }
    },
  },

  methods: {
    /**
     * 初始化 Canvas
     */
    initCanvas() {
      const query = this.createSelectorQuery();
      query.select('#astro-chart-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res[0]) {
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');

            const dpr = wx.getSystemInfoSync().pixelRatio;
            canvas.width = this.data.width * dpr;
            canvas.height = this.data.height * dpr;
            ctx.scale(dpr, dpr);

            this.canvas = canvas;
            this.ctx = ctx;

            if (this.data.positions.length > 0) {
              this.drawChart();
            }
          }
        });
    },

    /**
     * 绘制星盘
     */
    drawChart() {
      if (!this.ctx) return;

      const ctx = this.ctx;
      const { width, height, type, positions, outerPositions, houseCusps } = this.data;
      const cx = width / 2;
      const cy = height / 2;

      // 清空画布
      ctx.clearRect(0, 0, width, height);

      // 获取配置
      const chartConfig = this.data.config || getChartConfig(type);
      const isBiWheel = type === 'synastry' || type === 'transit';

      // 处理行星数据
      let innerPlanets = this.processPlanets(positions);
      let outerPlanets = isBiWheel ? this.processPlanets(outerPositions) : [];

      // 计算上升点偏移
      const ascPlanet = innerPlanets.find(p => p.name === 'Ascendant' || p.name === 'Rising');
      const ascAngle = ascPlanet ? ascPlanet.absAngle : 0;
      const rotation = normalizeAngle(180 + ascAngle);

      // 过滤行星
      const singleConfig = 'inner' in chartConfig ? chartConfig.inner : chartConfig;
      const innerAspectPlanets = filterPlanets(innerPlanets, singleConfig, { includeAllAngles: true });
      let innerDisplayPlanets = filterPlanets(innerPlanets, singleConfig);

      if (isBiWheel && 'outer' in chartConfig) {
        const outerConfig = { ...singleConfig, celestialBodies: chartConfig.outer.celestialBodies };
        outerPlanets = filterPlanets(outerPlanets, outerConfig);
      }

      // 应用防重叠算法
      innerDisplayPlanets = spreadPlanets(innerDisplayPlanets, 8);
      if (outerPlanets.length > 0) {
        outerPlanets = spreadPlanets(outerPlanets, 8);
      }

      // 计算相位
      let allAspects = [];
      if (this.data.aspects && this.data.aspects.length > 0) {
        allAspects = this.data.aspects;
      } else {
        // 自动计算相位
        const innerAspects = calculateAspectsFromAngles(innerAspectPlanets, singleConfig.aspects);
        allAspects = innerAspects;

        if (isBiWheel && 'crossAspects' in chartConfig) {
          const crossAspects = calculateCrossAspectsFromAngles(
            innerAspectPlanets,
            outerPlanets,
            chartConfig.crossAspects
          );
          allAspects = [...innerAspects, ...crossAspects];
        }
      }

      // 过滤相位
      const filteredAspects = filterAspects(allAspects, singleConfig.aspects);

      // 保存数据供点击事件使用
      this.chartData = {
        innerPlanets: innerDisplayPlanets,
        outerPlanets,
        rotation,
        cx,
        cy,
      };

      // 绘制星盘各层
      this.drawZodiacWheel(ctx, cx, cy, rotation);
      this.drawHouseCusps(ctx, cx, cy, houseCusps, rotation);
      this.drawAspects(ctx, cx, cy, filteredAspects, innerDisplayPlanets, outerPlanets, rotation, singleConfig);
      this.drawPlanets(ctx, cx, cy, innerDisplayPlanets, rotation, false);
      if (outerPlanets.length > 0) {
        this.drawPlanets(ctx, cx, cy, outerPlanets, rotation, true);
      }
    },

    /**
     * 处理行星数据（添加绝对角度和视觉角度）
     */
    processPlanets(positions) {
      return positions.map(p => {
        const absAngle = getAbsoluteAngle(p.sign, p.degree, p.minute || 0);
        return {
          ...p,
          absAngle,
          visualAngle: absAngle,
        };
      });
    },

    /**
     * 绘制黄道带轮盘
     */
    drawZodiacWheel(ctx, cx, cy, rotation) {
      const outerRadius = Math.min(cx, cy) * 0.85;
      const innerRadius = outerRadius * 0.75;

      // 绘制12个星座扇形
      for (let i = 0; i < 12; i++) {
        const startAngle = (i * 30 - rotation) * Math.PI / 180;
        const endAngle = ((i + 1) * 30 - rotation) * Math.PI / 180;

        // 交替颜色 - 纸感浅灰色
        ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 0, 0, 0.03)' : 'rgba(0, 0, 0, 0.01)';
        ctx.beginPath();
        ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
        ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fill();

        // 绘制星座符号
        const signAngle = (i * 30 + 15 - rotation) * Math.PI / 180;
        const signRadius = (outerRadius + innerRadius) / 2;
        const signX = cx + signRadius * Math.cos(signAngle);
        const signY = cy + signRadius * Math.sin(signAngle);

        const signName = SIGN_NAMES[i];
        const signMeta = SIGN_META[signName];

        ctx.save();
        ctx.translate(signX, signY);
        ctx.rotate(signAngle + Math.PI / 2);
        ctx.fillStyle = signMeta.color;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(signMeta.glyph, 0, 0);
        ctx.restore();
      }

      // 绘制外圈 - 纸感中灰色
      ctx.strokeStyle = '#D8D1C5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // 绘制内圈
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, 2 * Math.PI);
      ctx.stroke();
    },

    /**
     * 绘制宫位线
     */
    drawHouseCusps(ctx, cx, cy, houseCusps, rotation) {
      if (!houseCusps || houseCusps.length !== 12) return;

      const outerRadius = Math.min(cx, cy) * 0.85;
      const innerRadius = outerRadius * 0.75;

      ctx.strokeStyle = 'rgba(216, 209, 197, 0.6)';
      ctx.lineWidth = 1.2;

      houseCusps.forEach((cuspLongitude, i) => {
        const angle = (cuspLongitude - rotation) * Math.PI / 180;
        const startCoords = getCoords(cuspLongitude - rotation, innerRadius, cx, cy);
        const endCoords = getCoords(cuspLongitude - rotation, outerRadius, cx, cy);

        ctx.beginPath();
        ctx.moveTo(startCoords.x, startCoords.y);
        ctx.lineTo(endCoords.x, endCoords.y);
        ctx.stroke();

        // 绘制宫位数字 - 纸感深灰色
        const labelRadius = outerRadius * 0.68;
        const labelCoords = getCoords(cuspLongitude - rotation, labelRadius, cx, cy);

        ctx.fillStyle = '#7A746B';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), labelCoords.x, labelCoords.y);
      });
    },

    /**
     * 绘制相位线
     */
    drawAspects(ctx, cx, cy, aspects, innerPlanets, outerPlanets, rotation, config) {
      const innerRadius = Math.min(cx, cy) * 0.85 * 0.75;
      const outerRadius = Math.min(cx, cy) * 0.85 * 0.55;

      // 按层级分组
      const layers = { foreground: [], midground: [], background: [] };
      aspects.forEach(aspect => {
        const layer = getAspectLayer(aspect, config);
        layers[layer].push(aspect);
      });

      // 按层级绘制（背景 -> 中景 -> 前景）
      ['background', 'midground', 'foreground'].forEach(layer => {
        layers[layer].forEach(aspect => {
          this.drawAspectLine(ctx, cx, cy, aspect, innerPlanets, outerPlanets, rotation, layer, innerRadius, outerRadius);
        });
      });
    },

    /**
     * 绘制单条相位线
     */
    drawAspectLine(ctx, cx, cy, aspect, innerPlanets, outerPlanets, rotation, layer, innerRadius, outerRadius) {
      // 跳过合相（不绘制）
      if (aspect.type === 'conjunction') return;

      // 查找行星
      const allPlanets = [...innerPlanets, ...outerPlanets];
      const p1 = allPlanets.find(p => p.name === aspect.planet1);
      const p2 = allPlanets.find(p => p.name === aspect.planet2);

      if (!p1 || !p2) return;

      // 判断是否为跨盘相位
      const isCrossAspect = (innerPlanets.includes(p1) && outerPlanets.includes(p2)) ||
                           (innerPlanets.includes(p2) && outerPlanets.includes(p1));

      // 确定半径
      const radius = isCrossAspect ? outerRadius : innerRadius;

      // 计算坐标
      const coords1 = getCoords(p1.visualAngle - rotation, radius, cx, cy);
      const coords2 = getCoords(p2.visualAngle - rotation, radius, cx, cy);

      // 获取样式
      const color = ASPECT_COLORS[aspect.type];
      const style = VISUAL_LAYER_STYLES[layer];

      // 绘制线条
      ctx.strokeStyle = color;
      ctx.globalAlpha = style.opacity;
      ctx.lineWidth = style.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(coords1.x, coords1.y);
      ctx.lineTo(coords2.x, coords2.y);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    },

    /**
     * 绘制行星
     */
    drawPlanets(ctx, cx, cy, planets, rotation, isOuter) {
      const baseRadius = Math.min(cx, cy) * 0.85;
      const radius = isOuter ? baseRadius * 0.95 : baseRadius * 0.65;

      planets.forEach(planet => {
        const baseName = stripOuterPrefix(planet.name);
        const meta = PLANET_META[baseName];
        if (!meta) return;

        const coords = getCoords(planet.visualAngle - rotation, radius, cx, cy);

        // 绘制符号
        ctx.fillStyle = meta.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(meta.glyph, coords.x, coords.y);

        // 保存点击区域（用于交互）
        if (!this.clickAreas) this.clickAreas = [];
        this.clickAreas.push({
          x: coords.x,
          y: coords.y,
          radius: 10,
          planet: {
            ...planet,
            glyph: meta.glyph,
            color: meta.color,
            name: baseName,
          },
        });
      });
    },

    /**
     * 处理画布点击事件
     */
    onCanvasTap(e) {
      if (!this.clickAreas) return;

      const { x, y } = e.detail;

      // 查找点击的行星
      for (const area of this.clickAreas) {
        const distance = Math.sqrt(Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2));
        if (distance <= area.radius) {
          this.showPlanetDetail(area.planet, x, y);
          return;
        }
      }

      // 点击空白处关闭详情卡片
      this.closePlanetDetail();
    },

    /**
     * 显示行星详情卡片
     */
    showPlanetDetail(planet, x, y) {
      // 调整卡片位置，避免超出屏幕
      let cardX = x + 10;
      let cardY = y - 50;

      if (cardX + 150 > this.data.width) {
        cardX = x - 160;
      }
      if (cardY < 0) {
        cardY = 10;
      }

      this.setData({
        selectedPlanet: planet,
        detailCardX: cardX,
        detailCardY: cardY,
      });
    },

    /**
     * 关闭行星详情卡片
     */
    closePlanetDetail() {
      this.setData({
        selectedPlanet: null,
      });
    },
  },
});
