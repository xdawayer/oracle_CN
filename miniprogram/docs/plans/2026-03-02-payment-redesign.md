# 付费体系优化与整合 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将付费体系从「订阅+积分+配额」混合模式简化为「订阅管日常 + 积分买报告」两种清晰模式

**Architecture:** 前端先行修改所有价格配置、门控逻辑和 UI，后端 API 需同步配合调整。前端改动集中在价格常量、付费流程逻辑和协议文本三个层面。

**Tech Stack:** 微信小程序原生开发、微信云开发

---

## Task 1: 更新积分充值档位配置（核心基础）

**Files:**
- Modify: `utils/credits.js:5` — RECHARGE_TIERS 常量
- Modify: `pages/points/points.js:6-12` — BADGES 和 PACKAGES 计算
- Modify: `components/credits-modal/credits-modal.js:11-21` — 推荐档位算法

**Step 1: 修改 `utils/credits.js`**

将 `RECHARGE_TIERS` 从积分数改为以 RMB 金额驱动的积分数：

```javascript
// 旧: const RECHARGE_TIERS = [60, 100, 200, 500, 1200];
// 新档位: ¥10/30/50/100/200/500 → 对应积分 100/300/500/1000/2000/5000
const RECHARGE_TIERS = [100, 300, 500, 1000, 2000, 5000];
```

**Step 2: 修改 `pages/points/points.js`**

更新 BADGES 和 PACKAGES 逻辑：

```javascript
const BADGES = { 500: '推荐', 5000: '尊享' };
const PACKAGES = RECHARGE_TIERS.map((amount) => ({
  amount,
  price: amount * 10,               // 1 积分 = 0.1 RMB，单位：分
  priceText: (amount / 10).toFixed(0),
  ...(BADGES[amount] ? { badge: BADGES[amount] } : {}),
}));
```

同步更新默认选中项：

```javascript
// 旧: selectedIndex: 2, selectedPriceText: '20.00'
selectedIndex: 2, // 默认选中 500 积分（¥50）
selectedPriceText: '50',
```

**Step 3: 修改 `pages/points/points.wxml`**

更新首充标签逻辑 — 所有档位统一显示「首充双倍」：

```xml
<!-- 旧: {{isFirstRecharge ? (item.amount <= 100 ? '首充翻倍' : '首充+50%') : item.badge}} -->
<text>{{isFirstRecharge ? '首充双倍' : item.badge}}</text>
```

**Step 4: 验证 `components/credits-modal/credits-modal.js`**

确认推荐档位算法无需改动 — 它已基于 `RECHARGE_TIERS` 动态计算差额，自动适配新档位。仅需确认导入的 `RECHARGE_TIERS` 正确更新。

**Step 5: Commit**

```bash
git add utils/credits.js pages/points/points.js pages/points/points.wxml
git commit -m "refactor: 更新积分充值档位为 100/300/500/1000/2000/5000，统一首充双倍"
```

---

## Task 2: 更新订阅定价（首次/续费双价格）

**Files:**
- Modify: `pages/subscription/subscription.js:6-30` — PLANS 常量、benefits、loadSubscriptionStatus
- Modify: `pages/subscription/subscription.wxml:14-41,64-67` — 套餐卡片和按钮

**Step 1: 修改 `pages/subscription/subscription.js` 的 PLANS 常量**

```javascript
// 旧的单一价格
// const PLANS = {
//   monthly: { price: '9.9', totalFee: 990, label: '月度会员' },
//   yearly: { price: '128', totalFee: 12800, label: '年度会员' },
//   quarterly: { price: '45', totalFee: 4500, label: '季度会员' },
// };

// 新的首次/续费双价格
const PLANS = {
  monthly: {
    firstPrice: '9.9', firstTotalFee: 990,
    renewPrice: '18', renewTotalFee: 1800,
    label: '月度会员',
  },
  quarterly: {
    firstPrice: '30', firstTotalFee: 3000,
    renewPrice: '45', renewTotalFee: 4500,
    label: '季度会员',
  },
  yearly: {
    firstPrice: '168', firstTotalFee: 16800,
    renewPrice: '198', renewTotalFee: 19800,
    label: '年度会员',
  },
};
```

**Step 2: 更新 data 中的 benefits 和新增 firstStatus**

```javascript
data: {
  // ...existing fields...
  selectedPlan: 'yearly',
  selectedPrice: '168',
  // 各档位首次订阅状态（从后端获取）
  firstStatus: { monthly: true, quarterly: true, yearly: true },
  benefits: [
    { icon: '∞', title: 'AI 问答无限制', desc: '不限次数，随时提问' },
    { icon: '♡', title: '合盘分析无限制', desc: '不限次数，多对象分析' },
    { icon: '心', title: 'AI 深度心理分析', desc: '结合个人特质的深度分析' },
    { icon: '☆', title: '实时周期分析', desc: '掌握每日洞察指南' },
    { icon: '★', title: '高级关系分析', desc: '多维度关系互动深度解析' },
    { icon: '盾', title: '专属隐私保护', desc: '数据加密，仅你可见' },
  ],
},
```

**Step 3: 更新 loadSubscriptionStatus 和 onSelectPlan**

在 `loadSubscriptionStatus` 中获取各档位首次状态：

```javascript
async loadSubscriptionStatus() {
  try {
    const res = await request({ url: '/api/user/subscription' });
    if (res) {
      const firstStatus = res.firstStatus || { monthly: true, quarterly: true, yearly: true };
      this.setData({
        isVip: res.isVip || false,
        vipExpireDate: res.vipExpireDate || '',
        firstStatus,
      });
      // 更新当前选中档位的显示价格
      this._updateSelectedPrice();
      // 同步到本地缓存
      const profile = storage.get('user_profile') || {};
      profile.isVip = res.isVip;
      profile.vipExpireDate = res.vipExpireDate;
      storage.set('user_profile', profile);
    }
  } catch (err) {
    // 使用本地数据
  }
},
```

新增 `_updateSelectedPrice` 辅助方法：

```javascript
_updateSelectedPrice() {
  const plan = this.data.selectedPlan;
  const config = PLANS[plan];
  if (!config) return;
  const isFirst = this.data.firstStatus[plan];
  this.setData({
    selectedPrice: isFirst ? config.firstPrice : config.renewPrice,
  });
},
```

更新 `onSelectPlan`：

```javascript
onSelectPlan(e) {
  const plan = e.currentTarget.dataset.plan;
  if (PLANS[plan]) {
    const isFirst = this.data.firstStatus[plan];
    const config = PLANS[plan];
    this.setData({
      selectedPlan: plan,
      selectedPrice: isFirst ? config.firstPrice : config.renewPrice,
    });
  }
},
```

**Step 4: 更新 onPay 中的金额传递**

```javascript
async onPay() {
  // ...existing checks...
  const plan = this.data.selectedPlan;
  const planConfig = PLANS[plan];
  if (!planConfig) return;

  this.setData({ paying: true });
  try {
    const res = await request({
      url: '/api/wxpay/create-order',
      method: 'POST',
      data: {
        orderType: 'subscription',
        plan: plan,
        // 后端根据 plan + 用户首次状态自行判定价格，前端不传 totalFee
      },
    });
    // ...rest unchanged...
  }
}
```

**Step 5: 修改 `pages/subscription/subscription.wxml`**

更新套餐卡片以展示首次/续费价格：

```xml
<!-- 月度 -->
<view class="plan-card ink-border {{selectedPlan === 'monthly' ? 'selected' : ''}}" bindtap="onSelectPlan" data-plan="monthly">
  <view class="plan-badge" wx:if="{{firstStatus.monthly}}">首次特惠</view>
  <text class="plan-name">月度会员</text>
  <view class="plan-price-row">
    <text class="plan-currency">¥</text>
    <text class="plan-price font-ancient">{{firstStatus.monthly ? '9.9' : '18'}}</text>
  </view>
  <text class="plan-original-price" wx:if="{{firstStatus.monthly}}">续费 ¥18/月</text>
</view>

<!-- 年度 -->
<view class="plan-card ink-border {{selectedPlan === 'yearly' ? 'selected' : ''}}" bindtap="onSelectPlan" data-plan="yearly">
  <view class="plan-badge best">最超值</view>
  <text class="plan-name">年度会员</text>
  <view class="plan-price-row">
    <text class="plan-currency">¥</text>
    <text class="plan-price font-ancient">{{firstStatus.yearly ? '168' : '198'}}</text>
  </view>
  <text class="plan-original-price" wx:if="{{firstStatus.yearly}}">续费 ¥198/年</text>
</view>

<!-- 季度 -->
<view class="plan-card ink-border {{selectedPlan === 'quarterly' ? 'selected' : ''}}" bindtap="onSelectPlan" data-plan="quarterly">
  <view class="plan-badge" wx:if="{{firstStatus.quarterly}}">首次特惠</view>
  <text class="plan-name">季度会员</text>
  <view class="plan-price-row">
    <text class="plan-currency">¥</text>
    <text class="plan-price font-ancient">{{firstStatus.quarterly ? '30' : '45'}}</text>
  </view>
  <text class="plan-original-price" wx:if="{{firstStatus.quarterly}}">续费 ¥45/季</text>
</view>
```

**Step 6: Commit**

```bash
git add pages/subscription/subscription.js pages/subscription/subscription.wxml
git commit -m "feat: 订阅改为首次/续费双价格，更新权益列表（移除赠积分、新增AI问答和合盘无限）"
```

---

## Task 3: 修改 AI 问答页面 — 移除积分付费路径

**Files:**
- Modify: `pages/ask/ask.js:90-94,193-231` — 移除 askCost 和积分付费逻辑

**Step 1: 清理 data 中的积分相关字段**

```javascript
// 删除 askCost: 50,
// 保留配额字段
askTotalLeft: 0,
credits: 0,       // 仍可保留用于其他展示，但不再用于 ask 付费
quotaLoaded: false,
```

同时从顶部 import 移除 `creditsModalData` 和 `creditsModalMethods`：

```javascript
// 旧: const { creditsModalData, creditsModalMethods } = require('../../utils/credits');
// 新: 不再需要 credits 相关导入（ask 页面不再有积分操作）
```

移除 data 中的 `...creditsModalData` 展开和底部的 `...creditsModalMethods`。

**Step 2: 重写 onSend 中的超额逻辑**

```javascript
async onSend() {
  const text = this.data.inputValue.trim();
  if (!text) return;

  // 登录态检查
  if (!storage.get('access_token')) {
    const ok = await auth.ensureLogin(1);
    if (!ok) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
  }

  const { askTotalLeft, quotaLoaded } = this.data;

  // 配额已加载且本周次数用完 → 引导订阅
  if (quotaLoaded && askTotalLeft <= 0) {
    wx.showModal({
      title: '本周免费次数已用完',
      content: '开通会员可享 AI 问答无限次使用',
      confirmText: '了解会员',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/subscription/subscription' });
        }
      },
    });
    return;
  }

  this.sendMessage(text);
},
```

**Step 3: 更新 onError 中的 403 处理**

```javascript
onError: (err) => {
  logger.error('Ask Stream Error:', err);
  if (err && err.statusCode === 403) {
    this.setData({ showReport: false, reportLoading: false, reportData: null, isLoading: false });
    this._streamTask = null;
    this._fetchQuota();
    // 引导订阅而非提示积分不足
    wx.showModal({
      title: '提问次数已用完',
      content: '开通会员可享 AI 问答无限次使用',
      confirmText: '了解会员',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/subscription/subscription' });
        }
      },
    });
    return;
  }
  // ...rest unchanged (fallback logic)...
}
```

**Step 4: 清理 ask.wxml 中的积分弹窗组件引用（如有）**

检查 `pages/ask/ask.wxml` 是否引用了 `<credits-modal>`，如有则移除。

**Step 5: Commit**

```bash
git add pages/ask/ask.js pages/ask/ask.wxml
git commit -m "refactor: AI问答移除积分付费路径，超额统一引导订阅"
```

---

## Task 4: K 线报告改为免费

**Files:**
- Modify: `pages/kline/kline.js:89-92,603-662` — 移除付费门控

**Step 1: 简化 onUnlockReport**

```javascript
async onUnlockReport() {
  const allExpanded = { overview: true, past: true, present: true, future: true, milestone: true, letter: true };

  // 开发模式：直接解锁
  if (this.data.devMode) {
    this.setData({ isUnlocked: true, expandedSections: allExpanded });
    wx.showToast({ title: '已解锁完整报告', icon: 'success' });
    return;
  }

  if (!this.data.userInfo) {
    wx.showToast({ title: '请先完善出生信息', icon: 'none' });
    return;
  }

  // 直接解锁，不再需要付费
  this.setData({ isUnlocked: true, expandedSections: allExpanded });
},
```

**Step 2: 简化 checkUnlockStatus**

```javascript
async checkUnlockStatus() {
  if (this.data.devMode) return;
  // K 线现在免费开放，直接设为解锁
  this.setData({
    isUnlocked: true,
    expandedSections: { overview: true, past: true, present: true, future: true, milestone: true, letter: true },
  });
},
```

**Step 3: 清理不再需要的 import**

```javascript
// 旧: const { handleInsufficientCredits, creditsModalData, creditsModalMethods } = require('../../utils/credits');
// K线不再有积分操作，移除整行 import
```

移除 data 中的 `...creditsModalData` 和底部的 `...creditsModalMethods`。
移除 `isUnlocked: false` 默认值改为 `isUnlocked: true`（或保留 false 让 checkUnlockStatus 设置）。

**Step 4: 更新 kline.wxml 中锁定相关的 UI（如有付费提示）**

移除或隐藏付费入口按钮和价格显示。

**Step 5: Commit**

```bash
git add pages/kline/kline.js pages/kline/kline.wxml
git commit -m "feat: K线报告改为免费开放，移除300积分付费门控"
```

---

## Task 5: 更新报告定价（月度 200、专题 200、年度 300）

**Files:**
- Modify: `pages/daily/daily.js:~484` — 月度报告价格
- Modify: `pages/discovery/discovery.js:8-46` — 专题报告价格

**Step 1: 修改月度报告价格**

在 `pages/daily/daily.js` 的 `_showMonthlyPayment` 方法中：

```javascript
// 旧: price: 60,
price: 200,
```

**Step 2: 修改专题报告价格**

在 `pages/discovery/discovery.js` 的 `TOPIC_REPORT_META` 中：

```javascript
'love-topic': {
  // ...features unchanged...
  price: 200,  // 旧: 150
  // ...
},
'career-topic': {
  // ...features unchanged...
  price: 200,  // 旧: 150
  // ...
},
'wealth-topic': {
  // ...features unchanged...
  price: 200,  // 旧: 150
  // ...
},
```

**Step 3: 确认年度报告（300 积分）**

检查年度报告（annual）类型在 `pages/report/report.js:15-40` 中是否已有定义。如果 annual 报告入口在 daily.js 或 discovery.js 中，需确认其价格设为 300。

> 注意：年度报告的前端入口可能需要新增或确认，后端 `/api/report/create` 的 reportType='annual' 的定价需同步改为 300。

**Step 4: Commit**

```bash
git add pages/daily/daily.js pages/discovery/discovery.js
git commit -m "refactor: 报告统一定价——月度200积分、专题200积分、年度300积分"
```

---

## Task 6: 更新积分不足弹窗 — 移除 VIP 引导条

**Files:**
- Modify: `components/credits-modal/credits-modal.wxml:26-29` — 移除/更新 VIP 引导文案

**Step 1: 更新 VIP 引导条文案**

积分弹窗现在只服务于报告购买场景（订阅用户也需积分），VIP 引导文案不再适用：

```xml
<!-- 旧: -->
<!-- <view class="vip-banner" bindtap="onGoVip">
  <text class="vip-banner-text">开通 VIP 享 8 折报告优惠 + 赠积分</text>
  <text class="vip-banner-arrow">→</text>
</view> -->

<!-- 新: 移除 VIP 引导条（订阅用户也需积分买报告，引导订阅无意义）-->
```

**Step 2: Commit**

```bash
git add components/credits-modal/credits-modal.wxml
git commit -m "refactor: 积分不足弹窗移除VIP引导条（积分仅用于报告，与订阅无关）"
```

---

## Task 7: 更新协议文本

**Files:**
- Modify: `data/agreements.js:147-271` — 会员协议 + 积分协议

**Step 1: 更新会员服务协议**

```javascript
// 一、会员权益 items 更新为:
items: [
  '1. AI 问答不限次数，随时提问。',
  '2. 合盘分析不限次数。',
  '3. AI 深度心理分析，结合个人特质。',
  '4. 实时周期分析与每日洞察。',
  '5. 专属隐私保护，数据加密。'
]

// 二、会员套餐与价格 更新为:
items: [
  '1. 月度会员：首次 ¥9.9/月，续费 ¥18/月。',
  '2. 季度会员：首次 ¥30/季，续费 ¥45/季。',
  '3. 年度会员：首次 ¥168/年，续费 ¥198/年（最超值）。'
]
```

**Step 2: 更新积分服务协议**

```javascript
// 一、积分说明 items 更新为:
items: [
  '1. 积分通过充值获得，充值后实时到账。',
  '2. 积分可用于购买深度分析报告（月度报告、专题报告、年度报告等）。',
  '3. 不同报告消耗的积分数量不同，具体以页面标注为准。'
]

// 二、充值档位 更新为:
items: [
  '1. 100 积分 - ¥10。',
  '2. 300 积分 - ¥30。',
  '3. 500 积分 - ¥50。',
  '4. 1000 积分 - ¥100。',
  '5. 2000 积分 - ¥200。',
  '6. 5000 积分 - ¥500。',
  '首次充值享双倍积分优惠。'
]
```

**Step 3: Commit**

```bash
git add data/agreements.js
git commit -m "docs: 更新会员和积分服务协议（新定价、新权益、新档位）"
```

---

## Task 8: 端到端验收检查

**Step 1: 全局搜索残留的旧价格**

```bash
grep -rn "price: 60\b\|price: 150\b\|RECHARGE_TIERS\|赠积分\|赠100\|赠350\|赠1500\|askCost\|首充翻倍\|首充+50%" pages/ components/ utils/ data/ --include="*.js" --include="*.wxml"
```

确保没有遗漏的旧价格引用。

**Step 2: 检查所有使用 credits-modal 的页面**

确认以下页面仍然正确使用积分弹窗（仅报告场景）：
- `pages/daily/daily.js` — 月度报告 ✓
- `pages/discovery/discovery.js` — 专题报告 ✓

确认以下页面已移除积分弹窗：
- `pages/ask/ask.js` — 已移除 ✓
- `pages/kline/kline.js` — 已移除 ✓

**Step 3: 整理 credits.js 中 creditsModalMethods 的 onCreditsModalGoVip**

由于积分弹窗不再引导订阅，可保留此方法但更新文案，或直接移除 `onGoVip` 事件触发（因为弹窗已无 VIP 引导条）。

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: 付费体系优化——端到端验收清理"
```

---

## 后端 API 变更清单（需同步，不在本仓库）

以下后端 API 需要配合前端改动进行修改：

| API | 变更 |
|-----|------|
| `POST /api/wxpay/create-order` | 订阅类型：根据 plan + 用户首次状态返回对应价格；积分类型：接受新档位 |
| `GET /api/wxpay/first-recharge-status` | 首充判定改为全局（非按档位），返回 `{isFirstRecharge: bool}` |
| `GET /api/user/subscription` | 新增返回 `firstStatus: {monthly: bool, quarterly: bool, yearly: bool}` |
| `GET /api/entitlements/v2` | 订阅用户：`ask.totalLeft` 返回 -1（无限）；合盘同理 |
| `POST /api/report/create` | 月度报告定价 200，专题定价 200，年度定价 300 |
| `POST /api/kline/unlock` | 移除积分门控，或直接返回 unlocked |
| `GET /api/kline/unlock-status` | 所有用户返回 `{unlocked: true}` |
| `POST /api/ask/stream` | 订阅用户不检查积分，仅检查订阅状态 |

---

## 总任务清单

| # | 任务 | 涉及文件数 | 依赖 |
|---|------|----------|------|
| 1 | 更新积分充值档位 | 3 | 无 |
| 2 | 更新订阅定价 | 2 | 无 |
| 3 | AI 问答移除积分付费 | 2 | 无 |
| 4 | K 线报告改为免费 | 2 | 无 |
| 5 | 更新报告定价 | 2 | 无 |
| 6 | 更新积分不足弹窗 | 1 | Task 1 |
| 7 | 更新协议文本 | 1 | Task 1,2 |
| 8 | 端到端验收 | 全部 | Task 1-7 |

Task 1-5 互相独立，可并行执行。Task 6-7 依赖前面的任务。Task 8 是最终验收。
