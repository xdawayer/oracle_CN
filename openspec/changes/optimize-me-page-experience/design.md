# 设计文档：优化「我的」页面完整体验

## 架构决策

### AD-1：页面组织方式 — 子视图 vs 独立页面

**决策**：个人资料编辑、VIP 会员中心、积分充值、积分记录采用**独立页面**（`wx.navigateTo`），收藏报告和合盘记录保持现有独立页面。

**理由**：
- 子视图模式（当前 me.js 的 `currentRoute` 切换）导致所有逻辑耦合在一个文件中，难以维护
- 独立页面可以有自己的原生导航栏（标题 + 返回按钮），不需要自定义导航
- 支付页面涉及异步回调和状态管理，独立页面更清晰
- 移除 me.js 中的子视图逻辑，所有菜单项改为页面跳转

**权衡**：增加了页面文件数量，但每个页面职责单一、可独立开发测试。

### AD-2：微信支付集成方案

**决策**：后端新增 `/api/wxpay/` 路由模块，与现有 Stripe 支付并行。

**方案**：
```
前端 → POST /api/wxpay/create-order → 后端生成预付单 → 返回支付参数
前端 → wx.requestPayment(payParams) → 微信支付
微信 → POST /api/wxpay/notify → 后端验签 → 更新订单状态
前端 → 支付成功回调 → 刷新页面状态
```

**关键设计**：
- 使用微信支付 V3 API（推荐）
- 订单表与现有 `purchase_records` 表复用，增加 `payment_channel` 字段区分 Stripe/WeChat
- 订阅和积分充值共用支付流程，通过 `order_type` 区分

### AD-3：VIP 订阅模型 — 微信小程序场景

**决策**：采用**到期时间叠加模式**（非自动续费），而非 Stripe 式自动订阅。

**理由**：
- 微信支付的自动续费（委托扣款）审核门槛高，小程序初期难以通过
- 到期时间叠加模式简单可靠：购买 1 个月 → 到期时间 +30 天
- 用户主动续费，符合国内用户习惯
- 后续可升级为自动续费

**数据模型**：
```
vip_subscriptions:
  - user_id
  - plan: 'monthly' | 'quarterly' | 'yearly'
  - start_date
  - expire_date
  - status: 'active' | 'expired'
  - payment_channel: 'wechat'
  - order_id (关联微信支付订单)
```

### AD-4：积分系统 — 与现有 credits 对齐

**决策**：积分（Points）即为现有系统中的 credits，1 积分 = ¥1.00，保持与后端 `entitlementServiceV2` 一致。

**充值流程**：
1. 用户选择档位 → 前端请求 `/api/wxpay/create-order`
2. 后端创建待支付订单 → 调用微信支付统一下单
3. 用户完成支付 → 微信回调 → 后端确认 → 积分入账
4. 前端刷新余额

### AD-5：视觉风格统一方案

**决策**：全部采用水墨极简风格，严格基于 CSS 变量系统。

**配色规范**：
| 元素 | 样式 |
|------|------|
| 页面背景 | `var(--paper-100)` |
| 卡片背景 | `var(--paper-50)` |
| 卡片边框 | `ink-border` 类 |
| 主要文字 | `var(--ink-deep)` |
| 次要文字 | `var(--ink-dark)` |
| 弱化文字 | `var(--ink-light)` |
| 强调/操作按钮 | `var(--accent)` 金色 |
| VIP 卡片背景 | `var(--ink-deep)` 深墨色 |
| 价格文字 | `var(--ink-deep)` |
| 选中态边框 | `var(--ink-deep)` 2rpx solid |
| 正数（收入） | 绿色 `#2D8A4E`（保持可读性） |
| 标签背景 | `var(--ink-deep)` + `var(--paper-50)` 文字 |

**禁止项**：
- 粉红色渐变（现有积分页）
- 金棕色（现有 VIP 页）
- 彩色图标背景
- emoji

## 页面结构设计

### 我的主页（me）
```
┌─ 原生导航栏（我的）──────────┐
│                              │
│  ┌─ 用户头部卡片 ─────────┐  │
│  │ [头像] 昵称 >           │  │
│  │        尊享会员          │  │
│  └─────────────────────────┘  │
│                              │
│  ┌─ 会员卡片（深墨底）────┐  │
│  │ 会员中心    到期日期     │  │
│  │ 查看专属权益 >          │  │
│  └─────────────────────────┘  │
│                              │
│  ┌─ 统计卡片 ─────────────┐  │
│  │  积分  │  收藏  │  合盘  │  │
│  │  8422  │   12   │   5   │  │
│  └─────────────────────────┘  │
│                              │
│  ┌─ 菜单列表 ─────────────┐  │
│  │ 编辑出生资料           > │  │
│  │ 偏好设置              > │  │
│  │ 帮助与反馈             > │  │
│  │ 退出登录              > │  │
│  └─────────────────────────┘  │
└──────────────────────────────┘
```

### VIP 会员中心
```
┌─ 原生导航栏（VIP 会员中心）──┐
│                              │
│  ┌─ 用户信息 ─────────────┐  │
│  │ [头像] 昵称              │  │
│  │        会员状态·到期日期  │  │
│  └─────────────────────────┘  │
│                              │
│  ┌──────┐┌──────┐┌──────┐    │
│  │首月特惠││最超值 ││季度会员││    │
│  │连续包月││年度会员││      ││    │
│  │ ¥9.9  ││ ¥128 ││ ¥45  ││    │
│  │  ¥30  ││ ¥360 ││ ¥90  ││    │
│  └──────┘└──────┘└──────┘    │
│                              │
│  ┌─ 会员专属权益 ─────────┐  │
│  │ 无限次星盘解读          │  │
│  │ AI 深度心理分析         │  │
│  │ 行运星盘实时查看        │  │
│  │ 高级合盘分析            │  │
│  │ 专属隐私保护            │  │
│  └─────────────────────────┘  │
│                              │
│  ┌─ 续费按钮 ─────────────┐  │
│  │    续费会员 ¥128        │  │
│  └─────────────────────────┘  │
│  同意《会员服务协议》         │
└──────────────────────────────┘
```

### 积分充值
```
┌─ 原生导航栏（积分充值）──────┐
│                     [记录] > │
│  ┌─ 余额展示 ─────────────┐  │
│  │    积分  8,422.00  ↻    │  │
│  │    当前可用余额          │  │
│  └─────────────────────────┘  │
│                              │
│  ┌─────┐┌─────┐┌─────┐      │
│  │  1  ││ 10  ││ 50  │热门   │
│  │¥1.00││¥10  ││¥50  │      │
│  └─────┘└─────┘└─────┘      │
│  ┌─────┐┌─────┐┌─────┐      │
│  │ 100 ││ 200 ││ 500 │推荐   │
│  │¥100 ││¥200 ││¥500 │      │
│  └─────┘└─────┘└─────┘      │
│                              │
│  支付说明                     │
│                              │
│  ┌─ 立即支付 ¥50.00 ──────┐  │
│  └─────────────────────────┘  │
│  同意《积分服务协议》         │
└──────────────────────────────┘
```

## API 设计

### 新增接口

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/wxpay/create-order` | 创建微信支付订单 |
| POST | `/api/wxpay/notify` | 微信支付回调 |
| GET | `/api/wxpay/order/:orderId` | 查询订单状态 |
| GET | `/api/user/profile` | 获取用户资料 |
| PUT | `/api/user/profile` | 更新用户资料 |
| POST | `/api/user/avatar` | 上传头像 |
| GET | `/api/user/points-history` | 积分流水记录 |
| GET | `/api/user/subscription` | 获取 VIP 订阅状态 |

### create-order 请求体

```json
{
  "orderType": "subscription" | "points",
  "plan": "monthly" | "quarterly" | "yearly",  // subscription 时必填
  "amount": 50,                                  // points 时必填（积分数）
  "totalFee": 5000                               // 支付金额（分）
}
```

### create-order 响应体

```json
{
  "orderId": "WX20260203...",
  "payParams": {
    "timeStamp": "...",
    "nonceStr": "...",
    "package": "prepay_id=...",
    "signType": "RSA",
    "paySign": "..."
  }
}
```

## 文件变更清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `miniprogram/pages/subscription/subscription.{js,wxml,wxss,json}` | VIP 会员中心页 |
| `miniprogram/pages/points/points.{js,wxml,wxss,json}` | 积分充值页 |
| `miniprogram/pages/points-history/points-history.{js,wxml,wxss,json}` | 积分记录页 |
| `miniprogram/pages/profile/profile.{js,wxml,wxss,json}` | 个人资料编辑页 |
| `backend/src/api/wxpay.ts` | 微信支付 API 路由 |
| `backend/src/services/wxpayService.ts` | 微信支付服务 |
| `backend/src/config/wxpay.ts` | 微信支付配置 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `miniprogram/pages/me/me.{js,wxml,wxss}` | 移除子视图逻辑，菜单全改页面跳转，统一视觉 |
| `miniprogram/pages/reports/reports.{wxml,wxss}` | 统一水墨极简视觉 |
| `miniprogram/pages/records/records.{wxml,wxss}` | 统一水墨极简视觉 |
| `miniprogram/app.json` | 注册新页面路由 |
| `miniprogram/services/api.js` | 新增 API 端点常量 |
| `backend/src/index.ts` | 注册微信支付路由 |
