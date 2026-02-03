# 能力增量：支付系统补全

## MODIFIED Requirements

### Requirement: 微信支付证书验签完善

完善微信支付回调通知的平台证书验签逻辑，确保支付安全。

#### Scenario: 支付回调验签

**Given** 微信支付发送支付结果通知到回调 URL
**When** 后端接收到通知
**Then** 使用微信平台证书验证签名
**And** 验签通过后更新订单状态
**And** 验签失败返回错误并记录日志

#### Scenario: 平台证书自动更新

**Given** 后端启动或证书即将过期
**When** 需要验签
**Then** 自动下载最新微信平台证书并缓存

---

## ADDED Requirements

### Requirement: 退款接口

为 VIP 订阅和积分充值提供退款功能。

#### Scenario: VIP 订阅退款

**Given** 用户购买 VIP 订阅未超过 7 天
**When** 用户申请退款
**Then** 按剩余天数比例计算退款金额
**And** 调用微信退款 API 原路退款到微信零钱
**And** 取消用户 VIP 权益

#### Scenario: 积分充值退款

**Given** 用户充值的积分未使用
**When** 用户申请退款
**Then** 全额退款到微信零钱
**And** 扣除对应积分

#### Scenario: 退款条件不满足

**Given** 用户 VIP 购买超过 7 天或积分已部分使用
**When** 用户申请退款
**Then** 提示"不满足退款条件"并说明原因

---

### Requirement: 订单管理页面

用户可以查看历史订单和订单详情。

#### Scenario: 查看订单列表

**Given** 用户进入订单管理页面
**When** 页面加载
**Then** 展示所有历史订单（VIP 订阅和积分充值）
**And** 按时间倒序排列
**And** 显示订单状态（已支付/已退款/待支付）

#### Scenario: 查看订单详情

**Given** 用户点击某个订单
**When** 进入订单详情
**Then** 显示订单编号、商品名称、金额、支付时间、订单状态
**And** 满足退款条件时显示"申请退款"按钮

---

### Requirement: 支付结果反馈

支付完成后给用户明确的结果反馈。

#### Scenario: 支付成功

**Given** 用户完成微信支付
**When** 支付成功
**Then** 展示支付成功页面，显示购买内容和生效时间
**And** 提供"返回"按钮回到主页

#### Scenario: 支付失败

**Given** 用户发起微信支付但支付失败
**When** 支付回调返回失败
**Then** 展示支付失败提示，显示失败原因
**And** 提供"重新支付"按钮

---

### Requirement: 支付环境配置清单

生产环境必须配置完整的微信支付参数。

#### Scenario: 环境变量完整性检查

**Given** 后端服务启动
**When** 检测到支付相关 API 被调用
**Then** 验证以下环境变量已配置：
- `WECHAT_MCH_ID`（商户号）
- `WECHAT_API_KEY_V3`（APIv3 密钥）
- `WECHAT_PRIVATE_KEY` 或 `WECHAT_CERT_PATH`（商户证书私钥）
- `WECHAT_SERIAL_NO`（证书序列号）
- `WECHAT_NOTIFY_URL`（支付回调 URL）
**And** 缺少任一配置时记录错误日志并返回 503
