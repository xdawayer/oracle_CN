const { RECHARGE_TIERS } = require('../../utils/credits');

Component({
  properties: {
    show: { type: Boolean, value: false },
    price: { type: Number, value: 0 },
    balance: { type: Number, value: 0 },
  },

  observers: {
    'price, balance': function (price, balance) {
      if (!price && !balance) return;
      const deficit = Math.max(0, price - balance);
      // 选择最小的能覆盖差额的档位索引
      let defaultIndex = RECHARGE_TIERS.length - 1;
      for (let i = 0; i < RECHARGE_TIERS.length; i++) {
        if (RECHARGE_TIERS[i] >= deficit) {
          defaultIndex = i;
          break;
        }
      }
      this.setData({ deficit, defaultIndex });
    },
  },

  data: {
    deficit: 0,
    defaultIndex: 0,
  },

  methods: {
    onCancel() {
      this.triggerEvent('cancel');
    },

    onRecharge() {
      this.triggerEvent('recharge', { defaultIndex: this.data.defaultIndex });
    },

    preventBubble() {},
  },
});
