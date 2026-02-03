/**
 * K线图 Canvas 组件
 * 使用 scroll-view 进行横向滚动
 */
Component({
  properties: {
    data: {
      type: Array,
      value: [],
      observer: 'onDataChange'
    },
    candleWidth: {
      type: Number,
      value: 8
    },
    candleGap: {
      type: Number,
      value: 4
    }
  },

  data: {
    canvas: null,
    ctx: null,
    dpr: 1,
    canvasStyleWidth: 300,
    canvasStyleHeight: 200,
    canvasWrapWidth: 320,
    padding: { top: 20, right: 20, bottom: 30, left: 40 },
    colors: {
      bull: '#10B981',
      bear: '#EF4444',
      current: '#F59E0B',
      special: '#8B5CF6',
      grid: '#E5E7EB',
      axis: '#6B7280',
      bg: '#FDFBF7'
    }
  },

  lifetimes: {
    attached() {
      this._candlePositions = null;
      this.initCanvas();
    },
    detached() {
      this.setData({ canvas: null, ctx: null });
      this._candlePositions = null;
    }
  },

  methods: {
    rpxToPx(rpx) {
      return rpx * wx.getWindowInfo().windowWidth / 750;
    },

    _getViewportWidth() {
      const windowWidth = wx.getWindowInfo().windowWidth;
      const marginPx = this.rpxToPx(20 * 2 + 16 * 2);
      return Math.max(300, Math.floor(windowWidth - marginPx));
    },

    calculateCanvasWidth() {
      const { data, candleWidth, candleGap, padding } = this.data;
      const dataLen = data.length || 0;
      const contentWidth = padding.left + dataLen * (candleWidth + candleGap) + padding.right;
      return Math.max(this._getViewportWidth(), contentWidth);
    },

    initCanvas(retryCount = 0) {
      const styleWidth = this.calculateCanvasWidth();
      const styleHeight = Math.round(this.rpxToPx(400));
      const rightPadding = Math.round(this.rpxToPx(20));
      const wrapWidth = styleWidth + rightPadding;

      this.setData({
        canvasStyleWidth: styleWidth,
        canvasStyleHeight: styleHeight,
        canvasWrapWidth: wrapWidth
      }, () => {
        setTimeout(() => {
          const query = this.createSelectorQuery();
          query.select('#klineCanvas')
            .fields({ node: true, size: true })
            .exec((res) => {
              if (!res[0] || !res[0].node) {
                if (retryCount < 5) {
                  setTimeout(() => this.initCanvas(retryCount + 1), 100);
                }
                return;
              }

              const canvas = res[0].node;
              const ctx = canvas.getContext('2d');
              const dpr = wx.getWindowInfo().pixelRatio;

              canvas.width = styleWidth * dpr;
              canvas.height = styleHeight * dpr;
              ctx.scale(dpr, dpr);

              this.setData({ canvas, ctx, dpr }, () => {
                this.draw();
              });
            });
        }, 50);
      });
    },

    onDataChange(newVal) {
      if (newVal && newVal.length > 0) {
        if (this.data.ctx) {
          const newWidth = this.calculateCanvasWidth();
          if (newWidth !== this.data.canvasStyleWidth) {
            this.initCanvas();
          } else {
            this.draw();
          }
        } else {
          this.initCanvas();
        }
      }
    },

    draw() {
      const { ctx, canvasStyleWidth, canvasStyleHeight, padding, colors, data, candleWidth, candleGap } = this.data;
      if (!ctx || !data || data.length === 0) return;

      const innerHeight = canvasStyleHeight - padding.top - padding.bottom;

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, canvasStyleWidth, canvasStyleHeight);

      const yScale = (value) => {
        return padding.top + innerHeight - (value / 100) * innerHeight;
      };

      const xScale = (index) => {
        return padding.left + index * (candleWidth + candleGap) + candleWidth / 2;
      };

      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.fillStyle = colors.axis;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let v = 0; v <= 100; v += 25) {
        const y = yScale(v);
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvasStyleWidth - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText(v.toString(), padding.left - 8, y);
      }

      this._candlePositions = [];

      data.forEach((item, index) => {
        const x = xScale(index);
        const color = item.trend === 'bull' ? colors.bull : colors.bear;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yScale(item.high));
        ctx.lineTo(x, yScale(item.low));
        ctx.stroke();

        const openY = yScale(item.open);
        const closeY = yScale(item.close);
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(openY - closeY), 2);

        ctx.fillStyle = color;
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

        if (item.isCurrentYear) {
          ctx.fillStyle = colors.current;
          ctx.beginPath();
          ctx.arc(x, yScale(item.close) - 14, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        if (item.isSaturnReturn || item.isJupiterReturn || item.isUranusOpposition) {
          ctx.fillStyle = colors.special;
          ctx.beginPath();
          ctx.arc(x, yScale(item.high) - 10, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        this._candlePositions.push({ x, width: candleWidth, data: item });
      });

      ctx.fillStyle = colors.axis;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '10px sans-serif';

      data.forEach((item, index) => {
        if (index % 5 === 0) {
          const x = xScale(index);
          ctx.fillText(`${item.age}`, x, canvasStyleHeight - padding.bottom + 8);
        }
      });
    },

    onTap(e) {
      const detailX = e && e.detail && typeof e.detail.x === 'number' ? e.detail.x : null;
      const touchPoint = e && e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : null;
      const touchX = touchPoint
        ? (typeof touchPoint.x === 'number' ? touchPoint.x : touchPoint.clientX)
        : null;
      const x = detailX !== null ? detailX : touchX;
      if (x === null || x === undefined) return;

      const clicked = this._candlePositions && this._candlePositions.find(c =>
        Math.abs(x - c.x) <= c.width / 2 + 8
      );
      if (clicked) {
        this.triggerEvent('yearclick', { yearData: clicked.data });
      }
    },

    redraw() {
      if (this.data.ctx) {
        this.draw();
      } else {
        this.initCanvas();
      }
    }
  }
});
