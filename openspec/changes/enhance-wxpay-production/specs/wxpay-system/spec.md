## ADDED Requirements

### Requirement: 退款结果通知处理

系统 SHALL 提供 `/api/wxpay/refund-notify` 端点，接收微信支付异步推送的退款结果通知。

系统 SHALL 对退款通知执行与支付通知相同的验签和解密流程（RSA-SHA256 签名验证 + AES-256-GCM 解密）。

退款成功时，系统 SHALL 更新订单状态为 `refunded` 并回收对应权益：
- VIP 订阅：缩短 subscription 的 `current_period_end` 至当前时间
- 积分充值：扣减 `purchase_records` 中未消费的积分余额

退款失败时，系统 SHALL 记录失败原因日志，保持订单为 `paid` 状态不变。

#### Scenario: 退款成功通知处理

- **GIVEN** 用户已发起退款申请且微信已完成退款处理
- **WHEN** 微信向 `/api/wxpay/refund-notify` 推送退款成功通知
- **THEN** 系统验签解密成功后将订单状态更新为 `refunded`
- **AND** 回收对应的 VIP 权益或积分余额
- **AND** 返回 HTTP 200 确认接收

#### Scenario: 退款失败通知处理

- **GIVEN** 微信退款处理失败（如余额不足）
- **WHEN** 微信向 `/api/wxpay/refund-notify` 推送退款失败通知
- **THEN** 系统记录失败原因至日志
- **AND** 订单状态保持 `paid` 不变
- **AND** 返回 HTTP 200 确认接收

#### Scenario: 退款通知幂等处理

- **GIVEN** 微信重复推送同一笔退款通知
- **WHEN** 系统再次收到该退款通知
- **THEN** 系统检测到已处理，直接返回 HTTP 200 不重复操作

---

### Requirement: API 调用重试机制

系统 SHALL 对所有微信支付 API 调用（统一下单、退款、查询订单、关闭订单）提供指数退避重试能力。

重试策略 SHALL 满足：
- 最多重试 3 次，间隔分别为 1 秒、2 秒、4 秒
- 仅对网络超时、连接错误和 HTTP 5xx 状态码触发重试
- HTTP 4xx 错误直接返回，不重试
- 每次重试记录 warn 级别日志

#### Scenario: 网络超时触发重试

- **GIVEN** 调用微信统一下单 API
- **WHEN** 请求因网络超时失败
- **THEN** 系统在 1 秒后自动重试
- **AND** 若再次失败，2 秒后再次重试
- **AND** 第三次重试成功则正常返回结果

#### Scenario: 4xx 错误不重试

- **GIVEN** 调用微信退款 API
- **WHEN** 微信返回 HTTP 400（参数错误）
- **THEN** 系统直接返回错误信息，不触发重试

---

### Requirement: 主动订单状态查询

系统 SHALL 提供 `POST /api/wxpay/query-order` 端点，允许前端主动查询微信侧的订单支付状态。

当查询结果与本地订单状态不一致时（如微信已支付但本地仍为 pending），系统 SHALL 自动修正本地状态并触发相应的后续处理（如激活 VIP、充值积分）。

#### Scenario: 回调丢失后主动查询修正

- **GIVEN** 用户已支付但回调通知未到达（本地订单仍为 pending）
- **WHEN** 用户点击"查询支付结果"触发主动查询
- **THEN** 系统调用微信查询订单 API 获取真实支付状态
- **AND** 发现已支付后自动更新本地订单为 `paid`
- **AND** 触发 VIP 激活或积分充值流程

#### Scenario: 确认未支付

- **GIVEN** 用户取消了支付
- **WHEN** 用户点击"查询支付结果"
- **THEN** 系统确认微信侧订单未支付
- **AND** 返回"订单未支付"状态

---

### Requirement: 订单超时自动关闭

系统 SHALL 定时检查超过 30 分钟仍为 `pending` 状态的订单，主动调用微信关闭订单 API 并将本地状态更新为 `closed`。

关闭前系统 SHALL 先查询微信侧订单状态，避免误关已支付的订单。

定时任务 SHALL 每 10 分钟执行一次，在服务启动时注册。

#### Scenario: 超时订单自动关闭

- **GIVEN** 一笔订单创建已超过 30 分钟且状态仍为 `pending`
- **WHEN** 定时任务执行
- **THEN** 系统先查询微信确认该订单确实未支付
- **AND** 调用微信关闭订单 API
- **AND** 将本地订单状态更新为 `closed`

#### Scenario: 超时订单实际已支付

- **GIVEN** 一笔订单创建已超过 30 分钟，本地为 `pending`，但微信侧已支付
- **WHEN** 定时任务执行并查询微信
- **THEN** 系统发现已支付，不关闭订单
- **AND** 自动更新本地状态为 `paid` 并触发后续处理

---

### Requirement: 平台证书持久化管理

系统 SHALL 将从微信下载的平台证书持久化到本地文件系统（`backend/certs/` 目录），作为内存缓存的二级缓存。

证书加载优先级 SHALL 为：内存缓存 → 本地文件 → 远程下载。

内存缓存有效期为 24 小时，过期后从微信重新下载并同步更新本地文件。

`backend/certs/` 目录 SHALL 被添加到 `.gitignore` 中，不纳入版本控制。

#### Scenario: 服务重启后快速加载证书

- **GIVEN** 服务重启，内存缓存已清空
- **WHEN** 首次收到支付回调需要验签
- **THEN** 系统从本地 `backend/certs/` 加载证书，无需调用微信 API
- **AND** 将证书写入内存缓存

#### Scenario: 本地证书不存在时远程下载

- **GIVEN** 首次部署，`backend/certs/` 为空
- **WHEN** 需要验签
- **THEN** 系统从微信 API 下载平台证书
- **AND** 写入本地文件和内存缓存
