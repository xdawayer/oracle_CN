# 任务清单：优化「我的」页面完整体验

## 阶段 1：基础设施与配置

- [x] **1.1** 在 `app.json` 中注册新页面路由：`pages/subscription/subscription`、`pages/points/points`、`pages/points-history/points-history`、`pages/profile/profile`
  - 验证：小程序编译无报错，新页面可通过 `wx.navigateTo` 访问
- [x] **1.2** 在 `miniprogram/services/api.js` 中新增 API 端点常量：`WXPAY_CREATE_ORDER`、`WXPAY_ORDER_STATUS`、`USER_PROFILE`、`USER_AVATAR`、`POINTS_HISTORY`、`USER_SUBSCRIPTION`
  - 验证：常量定义正确，可被其他模块引用
- [x] **1.3** 创建后端微信支付配置 `backend/src/config/wxpay.ts`：读取环境变量（`WECHAT_APPID`、`WECHAT_MCH_ID`、`WECHAT_API_KEY_V3`、`WECHAT_SERIAL_NO`、`WECHAT_PRIVATE_KEY`），导出配置对象和 `isWxPayConfigured()` 函数
  - 验证：未配置时 `isWxPayConfigured()` 返回 false，不影响服务启动
- [x] **1.4** 创建后端微信支付服务 `backend/src/services/wxpayService.ts`：封装统一下单、签名生成、回调验签、订单查询等核心方法
  - 验证：单元测试签名算法正确
  - 依赖：1.3
- [x] **1.5** 创建后端微信支付路由 `backend/src/api/wxpay.ts`：`POST /create-order`、`POST /notify`、`GET /order/:orderId`
  - 验证：接口返回正确的响应结构
  - 依赖：1.4
- [x] **1.6** 在 `backend/src/index.ts` 中注册微信支付路由
  - 验证：服务启动无报错，路由可访问
  - 依赖：1.5

## 阶段 2：用户资料接口与编辑页

- [x] **2.1** 后端实现 `GET /api/user/profile` 和 `PUT /api/user/profile` 接口：获取/更新用户昵称、出生日期、出生时间、出生城市
  - 验证：API 返回正确数据，更新后 GET 能获取最新值
- [x] **2.2** 后端实现 `POST /api/user/avatar` 接口：接收头像文件上传，存储并返回 URL
  - 验证：上传成功返回可访问的头像 URL
- [x] **2.3** 创建个人资料编辑页 `miniprogram/pages/profile/`：头像展示与更换、昵称编辑、出生日期选择器、出生时间选择器、出生城市选择器、保存按钮
  - 视觉：水墨极简风格，表单项使用 `ink-border` 卡片
  - 验证：修改资料保存后返回我的页面，数据已更新
  - 依赖：2.1, 2.2
- [x] **2.4** 修改 `miniprogram/pages/me/me.js`：移除子视图切换逻辑（`currentRoute`、`sub-view`），所有菜单改为 `wx.navigateTo` 跳转独立页面
  - 验证：点击每个菜单项都能正确跳转到对应页面

## 阶段 3：VIP 会员中心（可与阶段 2 并行）

- [x] **3.1** 后端实现 `GET /api/user/subscription` 接口：返回用户当前 VIP 状态、方案、到期日期
  - 验证：VIP 用户返回 `isVip: true` + 到期日期，非 VIP 用户返回 `isVip: false`
- [x] **3.2** 后端在 `/api/wxpay/create-order` 中支持 `orderType: 'subscription'`：创建 VIP 订阅支付订单，支持 monthly/quarterly/yearly
  - 验证：返回正确的微信支付参数，订单记录已入库
  - 依赖：1.5
- [x] **3.3** 后端处理 VIP 订阅回调：支付成功后更新/创建 VIP 订阅记录，计算到期时间（已有 VIP 则叠加，未有则从当天开始）
  - 验证：支付回调后用户 VIP 状态变为 active，到期日期正确
  - 依赖：3.2
- [x] **3.4** 创建 VIP 会员中心页 `miniprogram/pages/subscription/`：
  - 用户头部信息（头像 + 昵称 + 会员状态 + 到期日期）
  - 三档价格卡片（连续包月 ¥9.9 / 年度会员 ¥128 / 季度会员 ¥45）
  - 原价划线展示（¥30 / ¥360 / ¥90）
  - 标签（「首月特惠」「最超值」）
  - 默认选中年度会员
  - 会员专属权益列表（无限次星盘解读、AI深度心理分析、行运星盘实时查看、高级合盘分析、专属隐私保护）
  - 底部固定：续费/开通按钮 + 《会员服务协议》勾选
  - 视觉：水墨极简风格，VIP 卡片用深墨底色
  - 验证：页面渲染正确，选择方案后金额更新，点击按钮触发微信支付
  - 依赖：3.1, 3.2

## 阶段 4：积分充值与记录（可与阶段 3 并行）

- [x] **4.1** 后端实现 `GET /api/user/points-history` 接口：分页返回积分收支明细（描述、日期、变更金额），支持 `page` 和 `pageSize` 参数
  - 验证：返回正确的分页数据，包含充值和消耗记录
- [x] **4.2** 后端在 `/api/wxpay/create-order` 中支持 `orderType: 'points'`：创建积分充值支付订单
  - 验证：返回正确的微信支付参数
  - 依赖：1.5
- [x] **4.3** 后端处理积分充值回调：支付成功后将积分加入用户账户，记录流水
  - 验证：支付回调后用户积分余额正确增加
  - 依赖：4.2
- [x] **4.4** 创建积分充值页 `miniprogram/pages/points/`：
  - 余额展示卡片（当前积分 + 刷新按钮）
  - 六档充值选项（1/10/50/100/200/500 积分）
  - 标签（50 积分「热门」、500 积分「推荐」）
  - 默认选中 50 积分
  - 支付说明文案
  - 底部固定：立即支付按钮（显示选中金额）+ 《积分服务协议》勾选
  - 右上角「记录」入口跳转积分记录页
  - 视觉：水墨极简风格
  - 验证：选择档位后按钮金额更新，点击触发微信支付
  - 依赖：4.1, 4.2
- [x] **4.5** 创建积分记录页 `miniprogram/pages/points-history/`：
  - 表格布局（详情、日期、积分变更）
  - 正数绿色、负数默认色
  - 支持下拉加载更多
  - 空状态展示
  - 视觉：水墨极简风格
  - 验证：列表正确展示，滚动加载更多数据正常
  - 依赖：4.1

## 阶段 5：收藏报告与合盘记录 UI 优化

- [x] **5.1** 重构 `miniprogram/pages/reports/reports.{wxml,wxss}`：统一水墨极简视觉风格
  - 报告卡片使用 `ink-border` + `--paper-50` 背景
  - 报告类型标签样式统一（深墨底 + 白字）
  - 日期使用 `--ink-light` 弱化色
  - 空状态设计
  - 验证：页面视觉与我的主页一致
- [x] **5.2** 重构 `miniprogram/pages/records/records.{wxml,wxss}`：统一水墨极简视觉风格
  - 合盘卡片使用 `ink-border` + `--paper-50` 背景
  - 匹配分数方块使用 `--ink-deep` 底色 + 白字
  - 关系类型标签样式统一
  - 空状态设计
  - 验证：页面视觉与我的主页一致
  - 可与 5.1 并行

## 阶段 6：我的主页视觉统一与对接

- [x] **6.1** 重构 `miniprogram/pages/me/me.{wxml,wxss}`：
  - 移除子视图相关 WXML 和 CSS
  - 统一所有卡片为水墨极简风格
  - 积分统计项点击跳转到积分充值页
  - VIP 卡片点击跳转到会员中心
  - 所有菜单项使用 `wx.navigateTo` 跳转
  - 验证：页面视觉统一，所有跳转正确
  - 依赖：2.4
- [x] **6.2** 端到端测试：从我的主页出发，依次验证所有子页面跳转、数据展示、支付流程（模拟）、返回刷新
  - 验证：所有页面间数据一致，支付回调后余额/状态即时更新
  - 依赖：所有前序任务
