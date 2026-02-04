# Change: 微信支付生产环境全流程完善

## Why

微信支付的基础框架（下单、回调、退款发起）已在 `prepare-miniprogram-launch` 中实现，但距离生产环境稳定运行仍有多处缺口：退款结果无异步通知处理、支付 API 调用无重试容错、前端轮询超时后无兜底查询、订单超时未自动关闭、证书管理依赖内存缓存无持久化。这些问题在低流量下不明显，但会在生产环境中导致资金状态不一致和用户投诉。

此外，2023 年 9 月起工信部要求所有小程序必须完成备案，2024 年 3 月 31 日后未备案的小程序已无法更新上架。小程序备案是上线的前置硬性条件，需在提案中纳入备案合规检查与相关材料准备。

## What Changes

- 新增退款结果通知回调端点 `/api/wxpay/refund-notify`，处理微信异步退款结果
- 为微信支付 API 调用（下单、退款、查询）添加指数退避重试机制
- 新增主动订单状态查询能力，作为回调丢失时的兜底方案
- 实现订单超时自动关闭（30 分钟未支付的 pending 订单）
- 完善平台证书管理：本地文件缓存 + 定时刷新策略
- 新增小程序备案合规检查清单：ICP 备案、小程序备案材料准备、域名白名单配置

## Impact

- Affected specs: `wxpay-system`（新建能力）、`miniprogram-filing`（新建能力）
- Affected code:
  - `backend/src/services/wxpayService.ts` — 退款回调、重试逻辑、证书持久化
  - `backend/src/api/wxpay.ts` — 新增路由端点
  - `miniprogram/pages/orders/orders.js` — 退款状态实时更新
  - `miniprogram/services/api.js` — 新增 API 常量
