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
  SINGLE_CHART_LAYOUT,
  DUAL_CHART_LAYOUT,
  ASPECT_SYMBOLS,
  PLANET_NAMES_ZH,
  SIGN_NAMES_ZH,
  PLANET_KEYWORDS,
  SIGN_RULERS,
  ASPECT_ANGLES,
  SIGN_SVG_PATHS,
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
    // 是否使用外部详情弹层
    useExternalDetail: {
      type: Boolean,
      value: false
    },
  },

  data: {
    selectedPlanet: null,
    detailCardX: 0,
    detailCardY: 0,
  },

  lifetimes: {
    attached() {
      this.imagesLoaded = false;
      this.isImagesLoading = false;
      this.initCanvas();
    },
    ready() {
      // 等待图片加载完成后再绘制
      if (this.data.positions.length > 0) {
        this.ensureImagesLoaded();
      }
    },
  },

  observers: {
    'positions, outerPositions, aspects, houseCusps, type': function() {
      if (!this.canvas) return;
      if (!this.data.positions || this.data.positions.length === 0) return;

      if (this.imagesLoaded) {
        this.drawChart();
        return;
      }

      this.ensureImagesLoaded();
    },
  },

  methods: {
    /**
     * 预加载所有符号图片
     * @returns {Promise} 所有图片加载完成的 Promise
     */
    loadImages() {
      return new Promise((resolve) => {
        if (!this.canvas) {
          resolve();
          return;
        }

        this.imageCache = {};
        const loadPromises = [];

        // 行星图片映射
        const planetImages = {
          'Sun': 'sun',
          'Moon': 'moon',
          'Mercury': 'mercury',
          'Venus': 'venus',
          'Mars': 'mars',
          'Jupiter': 'jupiter',
          'Saturn': 'saturn',
          'Uranus': 'uranus',
          'Neptune': 'neptune',
          'Pluto': 'pluto',
          'Ascendant': 'ascendant',
          'Rising': 'ascendant',
          'Midheaven': 'ascendant',  // 暂时使用 ascendant 图标
          'MC': 'ascendant',          // 暂时使用 ascendant 图标
          'North Node': 'north node',
        };

        // 星座图片映射
        const signImages = {
          'Aries': 'aries',
          'Taurus': 'taurus',
          'Gemini': 'gemini',
          'Cancer': 'cancer',
          'Leo': 'leo',
          'Virgo': 'virgo',
          'Libra': 'libra',
          'Scorpio': 'scorpio',
          'Sagittarius': 'sagittarius',
          'Capricorn': 'capricorn',
          'Aquarius': 'aquarius',
          'Pisces': 'pisces',
        };

        // 加载行星图片
        Object.entries(planetImages).forEach(([key, filename]) => {
          const img = this.canvas.createImage();
          const imagePath = `/images/astro-symbols/${filename}.png`;

          const promise = new Promise((resolveImg) => {
            img.onload = () => {
              resolveImg();
            };
            img.onerror = () => {
              resolveImg();
            };
            img.src = imagePath;
          });
          this.imageCache[key] = img;
          loadPromises.push(promise);
        });

        // 加载星座图片
        Object.entries(signImages).forEach(([key, filename]) => {
          const img = this.canvas.createImage();
          const imagePath = `/images/astro-symbols/${filename}.png`;

          const promise = new Promise((resolveImg) => {
            img.onload = () => {
              resolveImg();
            };
            img.onerror = () => {
              resolveImg();
            };
            img.src = imagePath;
          });
          this.imageCache[`sign_${key}`] = img;
          loadPromises.push(promise);
        });

        // 等待所有图片加载完成
        Promise.all(loadPromises).then(() => {
          this.imagesLoaded = true;
          resolve();
        });
      });
    },

    /**
     * 绘制图片符号（带颜色着色）
     * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
     * @param {string} key - 图片缓存键
     * @param {number} x - 中心 X 坐标
     * @param {number} y - 中心 Y 坐标
     * @param {number} size - 符号大小
     * @param {string} color - 着色颜色（可选）
     */
    drawImageSymbol(ctx, key, x, y, size, color) {
      if (!this.imageCache) {
        return false;
      }

      const img = this.imageCache[key];
      if (!img) {
        return false;
      }

      if (img && img.complete) {
        ctx.save();

        // 如果提供了颜色，使用着色技术
        if (color) {
          // 先绘制图片
          ctx.drawImage(img, x - size / 2, y - size / 2, size, size);

          // 使用 source-atop 模式，只在现有内容上绘制颜色
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = color;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);

          // 恢复默认混合模式
          ctx.globalCompositeOperation = 'source-over';
        } else {
          // 不着色，直接绘制
          ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        }

        ctx.restore();
        return true;
      }

      return false;
    },

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

            // Canvas 初始化完成后，加载图片再绘制
            if (this.data.positions.length > 0) {
              this.ensureImagesLoaded();
            }
          }
        });
    },

    ensureImagesLoaded() {
      if (this.imagesLoaded || this.isImagesLoading) return;
      this.isImagesLoading = true;
      console.log('[Canvas Init] Canvas initialized, loading images...');
      this.loadImages().then(() => {
        this.isImagesLoading = false;
        console.log('[Canvas Init] Images loaded, drawing chart...');
        this.drawChart();
      });
    },

    /**
     * 绘制 SVG 路径符号
     * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
     * @param {string} pathData - SVG 路径数据
     * @param {number} x - 中心 X 坐标
     * @param {number} y - 中心 Y 坐标
     * @param {number} size - 符号大小
     * @param {string} color - 填充颜色
     * @param {boolean} stroke - 是否描边（默认填充）
     */
    drawSvgPath(ctx, pathData, x, y, size, color, stroke = false) {
      if (!pathData || !this.canvas) return false;

      try {
        // 创建 Path2D 对象
        const path = this.canvas.createPath2D ? this.canvas.createPath2D(pathData) : new Path2D(pathData);

        // 计算缩放比例（SVG 原始 viewBox 是 24x24）
        const scale = size / 24;

        ctx.save();
        // 移动到目标位置并缩放
        ctx.translate(x - size / 2, y - size / 2);
        ctx.scale(scale, scale);

        if (stroke) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2 / scale;
          ctx.stroke(path);
        } else {
          ctx.fillStyle = color;
          ctx.fill(path);
        }

        ctx.restore();
        return true;
      } catch (e) {
        // Path2D 不支持，回退到文本渲染
        return false;
      }
    },

    /**
     * 绘制星盘
     */
    drawChart() {
      if (!this.ctx) {
        console.warn('[Draw Chart] Canvas context not initialized');
        return;
      }

      // 检查图片是否加载完成
      if (!this.imagesLoaded) {
        console.warn('[Draw Chart] Images not loaded yet, waiting...');
        // 等待图片加载完成后再绘制
        setTimeout(() => this.drawChart(), 100);
        return;
      }

      console.log('[Draw Chart] Starting chart drawing with loaded images');

      const ctx = this.ctx;
      const { width, height, type, positions, outerPositions, houseCusps } = this.data;
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(cx, cy);

      // 清空画布
      ctx.clearRect(0, 0, width, height);
      this.clickAreas = [];

      // 获取配置
      const chartConfig = this.data.config || getChartConfig(type);
      const isBiWheel = type === 'synastry' || type === 'transit';

      // 选择布局配置
      const layout = isBiWheel ? DUAL_CHART_LAYOUT : SINGLE_CHART_LAYOUT;

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
      innerDisplayPlanets = spreadPlanets(innerDisplayPlanets, isBiWheel ? 10 : 8);
      if (outerPlanets.length > 0) {
        outerPlanets = spreadPlanets(outerPlanets, 10);
      }

      // 计算相位
      let allAspects = [];
      const hasProvidedAspects = this.data.aspects && this.data.aspects.length > 0;

      if (type === 'transit' && isBiWheel && 'crossAspects' in chartConfig) {
        // 行运盘仅保留跨盘相位
        allAspects = calculateCrossAspectsFromAngles(
          innerAspectPlanets,
          outerPlanets,
          chartConfig.crossAspects
        );
      } else if (hasProvidedAspects) {
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
      const aspectSettings = type === 'transit' && 'crossAspects' in chartConfig
        ? chartConfig.crossAspects
        : singleConfig.aspects;
      const filteredAspects = filterAspects(allAspects, aspectSettings);

      // 保存数据供点击事件使用
      this.chartData = {
        innerPlanets: innerDisplayPlanets,
        outerPlanets,
        aspects: filteredAspects,
        rotation,
        cx,
        cy,
        baseRadius,
        layout,
        isBiWheel,
      };

      // 绘制星盘各层
      this.drawZodiacWheel(ctx, cx, cy, baseRadius, rotation, layout);
      this.drawHouseCusps(ctx, cx, cy, baseRadius, houseCusps, rotation, layout);
      this.drawHouseCuspLabels(ctx, cx, cy, baseRadius, houseCusps, rotation, layout);
      this.drawAspects(ctx, cx, cy, baseRadius, filteredAspects, innerDisplayPlanets, outerPlanets, rotation, singleConfig, layout);

      // 绘制行星位置信息
      if (isBiWheel) {
        // 双盘：先绘制内环，再绘制外环
        this.drawPlanetInfo(ctx, cx, cy, baseRadius, innerDisplayPlanets, rotation, layout, false);
        this.drawPlanetInfo(ctx, cx, cy, baseRadius, outerPlanets, rotation, layout, true);
        // 绘制分隔线
        this.drawSeparator(ctx, cx, cy, baseRadius, layout);
      } else {
        // 单盘
        this.drawPlanetInfo(ctx, cx, cy, baseRadius, innerDisplayPlanets, rotation, layout, false);
      }
    },

    /**
     * 处理行星数据（添加绝对角度和视觉角度）
     */
    processPlanets(positions) {
      if (!Array.isArray(positions) || positions.length === 0) {
        console.warn('[processPlanets] Empty or invalid positions array');
        return [];
      }

      const result = positions.map(p => {
        if (!p || !p.name) {
          console.warn('[processPlanets] Invalid planet data:', p);
          return null;
        }
        const absAngle = getAbsoluteAngle(p.sign, p.degree, p.minute || 0);
        return {
          ...p,
          absAngle,
          visualAngle: absAngle,
        };
      }).filter(Boolean);

      // 调试日志：打印前3个行星的数据
      if (result.length > 0) {
        console.log('[processPlanets] Sample planets:', result.slice(0, 3).map(p => ({
          name: p.name,
          sign: p.sign,
          degree: p.degree,
          absAngle: p.absAngle?.toFixed(2)
        })));
      }

      return result;
    },

    /**
     * 绘制黄道带轮盘
     */
    drawZodiacWheel(ctx, cx, cy, baseRadius, rotation, layout) {
      const outerRadius = baseRadius * layout.outerRim;
      const innerRadius = baseRadius * layout.zodiacInner;

      // 绘制12个星座扇形（不再绘制星座符号，由宫头标注统一处理）
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
    drawHouseCusps(ctx, cx, cy, baseRadius, houseCusps, rotation, layout) {
      if (!houseCusps || houseCusps.length !== 12) return;

      const outerRadius = baseRadius * layout.zodiacInner;
      const houseRingRadius = baseRadius * layout.houseRing;
      const innerHubRadius = baseRadius * layout.innerHub;
      const houseNumRadius = baseRadius * layout.houseNumbers;
      const ascLongitude = houseCusps[0];
      const equalAngles = houseCusps.map((_, i) => normalizeAngle(ascLongitude + i * 30));

      // 绘制宫位外分隔圆
      ctx.strokeStyle = 'rgba(216, 209, 197, 0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, houseRingRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // 绘制宫位内分隔圆（相位线区域边界）
      const aspectLineRadius = baseRadius * layout.aspectLine;
      ctx.beginPath();
      ctx.arc(cx, cy, aspectLineRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // 绘制中心点
      ctx.beginPath();
      ctx.arc(cx, cy, innerHubRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // 绘制宫位线
      equalAngles.forEach((cuspLongitude, i) => {
        const angle = cuspLongitude - rotation;
        const startCoords = getCoords(angle, innerHubRadius, cx, cy);
        const endCoords = getCoords(angle, outerRadius, cx, cy);

        // 主轴（ASC/IC/DSC/MC）使用更粗的线条
        const isAxis = i === 0 || i === 3 || i === 6 || i === 9;

        ctx.strokeStyle = isAxis ? 'rgba(180, 180, 180, 0.7)' : 'rgba(128, 128, 128, 0.25)';
        ctx.lineWidth = isAxis ? 1 : 0.5;

        ctx.beginPath();
        ctx.moveTo(startCoords.x, startCoords.y);
        ctx.lineTo(endCoords.x, endCoords.y);
        ctx.stroke();
      });

      // 绘制宫位数字 - 位于两个宫头之间的中点
      for (let i = 0; i < 12; i++) {
        const midAngle = normalizeAngle(ascLongitude + (i + 0.5) * 30);
        const angle = midAngle - rotation;
        const pos = getCoords(angle, houseNumRadius, cx, cy);

        ctx.fillStyle = '#9F7645'; // 暖棕色
        ctx.font = `600 ${layout.fontSize.houseNum}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), pos.x, pos.y);
      }
    },

    /**
     * 绘制宫头标注（参考 oracle_CN/components/AstroChart.tsx 布局）
     * 格式：度数 [星座icon] 分钟，沿切线方向排列在星座环内
     */
    drawHouseCuspLabels(ctx, cx, cy, baseRadius, houseCusps, rotation, layout) {
      if (!houseCusps || houseCusps.length !== 12) return;

      const zodiacInner = baseRadius * layout.zodiacInner;
      const zodiacBandWidth = baseRadius * (layout.outerRim - layout.zodiacInner);
      // 星座icon位置 - 在星座环中间，对齐宫位线
      const iconRadius = zodiacInner + (zodiacBandWidth / 2);
      const ascLongitude = houseCusps[0];
      const equalAngles = houseCusps.map((_, i) => normalizeAngle(ascLongitude + i * 30));

      houseCusps.forEach((cuspLongitude, index) => {
        const normalizedLongitude = normalizeAngle(cuspLongitude);
        let signIndex = Math.floor(normalizedLongitude / 30);
        const degreeFloat = normalizedLongitude % 30;
        let degreeInSign = Math.floor(degreeFloat);
        let minute = Math.round((degreeFloat - degreeInSign) * 60);

        // 处理进位
        if (minute === 60) {
          minute = 0;
          degreeInSign += 1;
          if (degreeInSign >= 30) {
            degreeInSign = 0;
            signIndex = (signIndex + 1) % 12;
          }
        }

        const signName = SIGN_NAMES[signIndex];
        const signMeta = SIGN_META[signName];
        const labelAngle = equalAngles[index];
        const angle = labelAngle - rotation;
        const normalizedAngle = normalizeAngle(angle);

        // 星座icon位置 - 对齐宫位线
        const iconPos = getCoords(angle, iconRadius, cx, cy);

        // 判断位置区域（用于确定度数和分钟的排列方向）
        const isLeftSide = normalizedAngle > 135 && normalizedAngle < 225;
        const isRightSide = normalizedAngle > 315 || normalizedAngle < 45;
        const isSideArea = isLeftSide || isRightSide;

        // 度数和分钟沿切线方向环绕 icon
        const labelOffset = 18;  // 增加偏移量避免重叠（原12px）
        const tangentAngle = angle + 90;
        const firstPos = getCoords(tangentAngle, labelOffset, iconPos.x, iconPos.y);
        const secondPos = getCoords(tangentAngle + 180, labelOffset, iconPos.x, iconPos.y);

        // 根据位置决定度数和分钟的排列
        let degreePos, minutePos;
        if (isSideArea) {
          // 左右两侧：上方是度数，下方是分钟
          [degreePos, minutePos] = firstPos.y <= secondPos.y ? [firstPos, secondPos] : [secondPos, firstPos];
        } else {
          // 上下两侧：左边是度数，右边是分钟
          [degreePos, minutePos] = firstPos.x <= secondPos.x ? [firstPos, secondPos] : [secondPos, firstPos];
        }

        // 绘制度数
        ctx.fillStyle = '#1e293b';
        ctx.font = `600 ${layout.fontSize.cuspDegree}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(degreeInSign), degreePos.x, degreePos.y);

        // 绘制星座符号 - 优先使用 PNG 图片
        const cuspSignSize = layout.fontSize.cuspSign;
        const cuspSignDrawn = this.drawImageSymbol(ctx, `sign_${signName}`, iconPos.x, iconPos.y, cuspSignSize, signMeta.color);

        // 如果 PNG 不支持，尝试使用 SVG Path2D（不使用文本后备）
        if (!cuspSignDrawn) {
          const signPathData = SIGN_SVG_PATHS[signName];
          this.drawSvgPath(ctx, signPathData, iconPos.x, iconPos.y, cuspSignSize, signMeta.color);
        }

        // 绘制分钟
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${layout.fontSize.cuspMinute}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(minute).padStart(2, '0'), minutePos.x, minutePos.y);
      });
    },

    /**
     * 绘制内外环分隔线（双盘专用）
     */
    drawSeparator(ctx, cx, cy, baseRadius, layout) {
      const separatorRadius = baseRadius * layout.separator;

      ctx.strokeStyle = 'rgba(216, 209, 197, 0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, separatorRadius, 0, 2 * Math.PI);
      ctx.stroke();
    },

    /**
     * 绘制相位线
     */
    drawAspects(ctx, cx, cy, baseRadius, aspects, innerPlanets, outerPlanets, rotation, config, layout) {
      const aspectLineRadius = baseRadius * layout.aspectLine;

      // 按层级分组
      const layers = { foreground: [], midground: [], background: [] };
      aspects.forEach(aspect => {
        const layer = getAspectLayer(aspect, config);
        layers[layer].push(aspect);
      });

      // 按层级绘制（背景 -> 中景 -> 前景）
      ['background', 'midground', 'foreground'].forEach(layer => {
        layers[layer].forEach(aspect => {
          this.drawAspectLine(ctx, cx, cy, aspect, innerPlanets, outerPlanets, rotation, layer, aspectLineRadius);
        });
      });
    },

    /**
     * 绘制单条相位线
     */
    drawAspectLine(ctx, cx, cy, aspect, innerPlanets, outerPlanets, rotation, layer, radius) {
      // 跳过合相（不绘制）
      if (aspect.type === 'conjunction') return;

      // 查找行星
      const allPlanets = [...innerPlanets, ...outerPlanets];
      const p1 = allPlanets.find(p => p.name === aspect.planet1);
      const p2 = allPlanets.find(p => p.name === aspect.planet2);

      if (!p1 || !p2) return;

      // 计算坐标（使用实际角度 absAngle，而非视觉角度）
      const coords1 = getCoords(p1.absAngle - rotation, radius, cx, cy);
      const coords2 = getCoords(p2.absAngle - rotation, radius, cx, cy);

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
     * 绘制行星位置信息（参考专业星盘软件布局）
     * 格式：行星符号 + 度数° + 星座符号 + 分' + 逆行R
     */
    drawPlanetInfo(ctx, cx, cy, baseRadius, planets, rotation, layout, isOuter) {
      // 确定行星环半径
      let planetRingRadius;
      if (isOuter) {
        planetRingRadius = baseRadius * layout.outerPlanetRing;
      } else if (layout.innerPlanetRing) {
        // 双盘内环
        planetRingRadius = baseRadius * layout.innerPlanetRing;
      } else {
        // 单盘
        planetRingRadius = baseRadius * layout.planetRing;
      }

      const fontSize = layout.fontSize;
      const spacing = isOuter && layout.outerSpacing ? layout.outerSpacing : layout.spacing;

      planets.forEach(planet => {
        const baseName = stripOuterPrefix(planet.name);
        
        const isAngle = /^(Ascendant|Rising|Midheaven|MC|Descendant|IC)$/i.test(baseName);
        if (isAngle) return;

        const meta = PLANET_META[baseName];
        if (!meta) return;

        const signMeta = SIGN_META[planet.sign];
        if (!signMeta) return;

        const displayAngle = planet.visualAngle - rotation;
        const actualAngle = planet.absAngle - rotation;

        const deg = Math.floor(planet.degree);
        const min = planet.minute ?? Math.round((planet.degree - deg) * 60);

        const pos = getCoords(displayAngle, planetRingRadius, cx, cy);

        const angleDifference = Math.abs(normalizeAngle(planet.visualAngle - planet.absAngle));
        if (angleDifference > 2 && angleDifference < 358) {
          const shouldUseInnerHelper = !isOuter && this.data.type === 'transit';
          const helperRadius = shouldUseInnerHelper
            ? baseRadius * layout.houseNumbers
            : baseRadius * layout.zodiacInner;
          const zodiacPos = getCoords(actualAngle, helperRadius, cx, cy);
          ctx.strokeStyle = meta.color;
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = 0.3;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(zodiacPos.x, zodiacPos.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1.0;
        }

        const planetGlyph = meta.glyph || '?';
        ctx.fillStyle = meta.color;
        ctx.font = `${fontSize.planet}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(planetGlyph, pos.x, pos.y);

        if (!this.clickAreas) this.clickAreas = [];

        const isAxisPoint = /^(Ascendant|Rising|Midheaven|MC|Descendant|IC)$/i.test(baseName);
        if (isAxisPoint) return;

        const degRadius = planetRingRadius - spacing.planetInfo;
        const degPos = getCoords(displayAngle, degRadius, cx, cy);

        ctx.fillStyle = '#1e293b';
        ctx.font = `600 ${fontSize.degree}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${deg}°`, degPos.x, degPos.y);

        const signRadius = degRadius - spacing.smallInfo;
        const signPos = getCoords(displayAngle, signRadius, cx, cy);

        const signImageDrawn = this.drawImageSymbol(ctx, `sign_${planet.sign}`, signPos.x, signPos.y, fontSize.sign, signMeta.color);
        if (!signImageDrawn) {
          const signPathData = SIGN_SVG_PATHS[planet.sign];
          this.drawSvgPath(ctx, signPathData, signPos.x, signPos.y, fontSize.sign, signMeta.color);
        }

        const minRadius = signRadius - spacing.smallInfo;
        const minPos = getCoords(displayAngle, minRadius, cx, cy);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `${fontSize.minute}px sans-serif`;
        ctx.fillText(`${min}'`, minPos.x, minPos.y);

        let retroPos = null;
        if (planet.isRetrograde) {
          const retroRadius = minRadius - spacing.smallInfo;
          retroPos = getCoords(displayAngle, retroRadius, cx, cy);
          ctx.fillStyle = '#CD5C5C';
          ctx.font = `bold ${fontSize.retro}px sans-serif`;
          ctx.fillText('R', retroPos.x, retroPos.y);
        }

        const endPos = retroPos || minPos;
        this.clickAreas.push({
          type: 'segment',
          x1: pos.x,
          y1: pos.y,
          x2: endPos.x,
          y2: endPos.y,
          radius: isOuter ? 22 : 20,
          planet: {
            ...planet,
            glyph: meta.glyph,
            color: meta.color,
            name: baseName,
            isOuter: isOuter,
          },
        });
      });
    },

    distanceToSegment(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      if (dx === 0 && dy === 0) {
        return Math.hypot(px - x1, py - y1);
      }
      const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
      const clamped = Math.max(0, Math.min(1, t));
      const cx = x1 + clamped * dx;
      const cy = y1 + clamped * dy;
      return Math.hypot(px - cx, py - cy);
    },

    /**
     * 处理画布点击事件
     */
    onCanvasTap(e) {
      if (!this.clickAreas) {
        console.log('[Canvas Tap] No click areas defined');
        return;
      }

      // 获取 canvas 元素位置
      const query = this.createSelectorQuery();
      query.select('#astro-chart-canvas')
        .boundingClientRect((rect) => {
          if (!rect) {
            console.log('[Canvas Tap] Canvas rect not found');
            return;
          }

          // 计算相对于 canvas 的坐标（处理 DPR 缩放）
          const scaleX = this.canvas ? this.canvas.width / rect.width : 1;
          const scaleY = this.canvas ? this.canvas.height / rect.height : 1;

          let x = typeof e.detail.x === 'number' ? e.detail.x : undefined;
          let y = typeof e.detail.y === 'number' ? e.detail.y : undefined;

          if (typeof x !== 'number' || typeof y !== 'number') {
            x = typeof e.detail.clientX === 'number' ? e.detail.clientX - rect.left : 0;
            y = typeof e.detail.clientY === 'number' ? e.detail.clientY - rect.top : 0;
          }

          if (scaleX > 1.5 || scaleY > 1.5) {
            x = x / scaleX;
            y = y / scaleY;
          }

          if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
            if (typeof e.detail.clientX === 'number' && typeof e.detail.clientY === 'number') {
              x = (e.detail.clientX - rect.left) / (scaleX > 1.5 ? scaleX : 1);
              y = (e.detail.clientY - rect.top) / (scaleY > 1.5 ? scaleY : 1);
            }
          }

          console.log(`[Canvas Tap] Click at (${x.toFixed(1)}, ${y.toFixed(1)})`);
          console.log(`[Canvas Tap] ${this.clickAreas.length} click areas available`);

          // 查找点击的行星
          for (const area of this.clickAreas) {
            let hit = false;
            let distance = 0;

            if (area.type === 'segment') {
              distance = this.distanceToSegment(x, y, area.x1, area.y1, area.x2, area.y2);
              hit = distance <= area.radius;
            } else {
              distance = Math.sqrt(Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2));
              hit = distance <= area.radius;
            }

            console.log(`[Canvas Tap] Distance to ${area.planet.name}: ${distance.toFixed(1)}px (radius: ${area.radius})`);

            if (hit) {
              console.log(`[Canvas Tap] Hit planet: ${area.planet.name}`);
              this.showPlanetDetail(area.planet, x, y, rect);
              return;
            }
          }

          console.log('[Canvas Tap] No planet hit, closing detail');
          // 点击空白处关闭详情卡片
          this.closePlanetDetail();
        })
        .exec();
    },

    /**
     * 显示行星详情卡片
     */
    showPlanetDetail(planet, x, y, rect) {
      const baseName = stripOuterPrefix(planet.name);
      const signMeta = SIGN_META[planet.sign];

      // 获取相关相位
      const relevantAspects = this.getRelevantAspects(planet);

      // 获取守护宫位
      const ruledHouses = this.getRuledHouses(baseName);

      // 计算卡片位置（避免超出屏幕）
      const systemInfo = wx.getSystemInfoSync();
      const cardWidth = 280;
      const cardHeight = 300;

      let cardX = x + 15;
      let cardY = y - 50;

      if (cardX + cardWidth > systemInfo.windowWidth) {
        cardX = x - cardWidth - 15;
      }
      if (cardY + cardHeight > systemInfo.windowHeight) {
        cardY = systemInfo.windowHeight - cardHeight - 20;
      }
      if (cardY < 10) cardY = 10;
      if (cardX < 10) cardX = 10;

      // 计算度数和分钟
      const deg = Math.floor(planet.degree);
      const min = planet.minute ?? Math.round((planet.degree - deg) * 60);

      const detail = {
        ...planet,
        x: cardX,
        y: cardY,
        baseName: baseName,
        displayName: PLANET_NAMES_ZH[baseName] || baseName,
        keywords: PLANET_KEYWORDS[baseName] || '',
        signName: SIGN_NAMES_ZH[planet.sign] || planet.sign,
        signGlyph: signMeta?.glyph || '',
        signIcon: `/images/astro-symbols/${(planet.sign || 'aries').toLowerCase()}.png`,
        signColor: signMeta?.color || '#888',
        degree: deg,
        minute: min,
        ruledHouses: ruledHouses.join(', '),
        aspects: relevantAspects.slice(0, 5).map(a => {
          const otherBaseName = stripOuterPrefix(a.otherPlanet);
          const otherMeta = PLANET_META[otherBaseName];
          return {
            otherName: PLANET_NAMES_ZH[otherBaseName] || otherBaseName,
            otherGlyph: otherMeta?.glyph || '',
            otherColor: otherMeta?.color || '#888',
            angle: ASPECT_ANGLES[a.type],
            aspectSymbol: ASPECT_SYMBOLS[a.type],
            aspectColor: ASPECT_COLORS[a.type],
            orb: Math.abs(a.orb).toFixed(0),
            isCross: a.isCross || false,
          };
        }),
      };

      if (this.data.useExternalDetail) {
        const eventDetail = {
          ...detail,
          x: cardX, // Pass calculated card position
          y: cardY
        };
        // If rect is available, provide absolute coordinates for fixed positioning
        if (rect) {
          eventDetail.clientX = cardX + rect.left;
          eventDetail.clientY = cardY + rect.top;
        }
        this.triggerEvent('planetdetail', eventDetail);
        return;
      }

      this.setData({
        selectedPlanet: detail,
        detailCardX: cardX,
        detailCardY: cardY,
      });
    },

    /**
     * 获取相关相位
     */
    getRelevantAspects(planet) {
      if (!this.chartData || !this.chartData.aspects) return [];

      const aspects = this.chartData.aspects;
      const baseName = stripOuterPrefix(planet.name);

      return aspects
        .filter(a => stripOuterPrefix(a.planet1) === baseName || stripOuterPrefix(a.planet2) === baseName)
        .map(a => {
          const otherPlanet = stripOuterPrefix(a.planet1) === baseName ? a.planet2 : a.planet1;
          const p1Outer = /^(T-|B-)/.test(a.planet1);
          const p2Outer = /^(T-|B-)/.test(a.planet2);
          const isCross = p1Outer !== p2Outer;

          return {
            ...a,
            otherPlanet,
            isCross,
          };
        })
        .filter(a => this.data.type !== 'transit' || a.isCross)
        .sort((a, b) => {
          // 跨盘相位优先
          if (a.isCross !== b.isCross) return a.isCross ? -1 : 1;
          // 然后按 orb 排序
          return Math.abs(a.orb) - Math.abs(b.orb);
        });
    },

    /**
     * 获取行星守护的宫位
     */
    getRuledHouses(planetName) {
      if (!this.chartData || !this.data.houseCusps) return [];

      const houseCusps = this.data.houseCusps;
      const ruledHouses = [];

      houseCusps.forEach((cuspLongitude, i) => {
        const normalizedLongitude = normalizeAngle(cuspLongitude);
        const signIndex = Math.floor(normalizedLongitude / 30);
        const signName = SIGN_NAMES[signIndex];
        const ruler = SIGN_RULERS[signName];

        if (ruler === planetName) {
          ruledHouses.push(i + 1);
        }
      });

      return ruledHouses;
    },

    /**
     * 关闭行星详情卡片
     */
    closePlanetDetail() {
      if (this.data.useExternalDetail) {
        this.triggerEvent('planetdetailclose');
        return;
      }

      this.setData({
        selectedPlanet: null,
      });
    },

    /**
     * 阻止事件冒泡
     */
    stopPropagation() {
      // 空函数，仅用于阻止事件冒泡
    },
  },
});
