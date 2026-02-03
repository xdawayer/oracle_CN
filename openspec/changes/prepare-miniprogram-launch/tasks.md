# 任务清单：微信小程序正式上架准备

## 阶段一：隐私合规（P0 - 必须完成，审核硬性要求）

### Task 1: 创建通用协议页面
- [x] 创建 `miniprogram/pages/agreement/agreement.{js,json,wxml,wxss}`
- [x] 支持 `?type=privacy|terms|vip|points` 参数路由
- [x] 在 `miniprogram/data/agreements.js` 中集中管理四种协议内容
- [x] 页面支持富文本渲染（章节标题、段落、列表）
- [x] 在 app.json 中注册页面路由

### Task 2: 编写四种协议内容
- [x] 隐私政策：信息收集范围、使用目的、存储保护、第三方服务、用户权利、联系方式
- [x] 用户协议：服务说明（占星内容仅供娱乐参考）、行为规范、知识产权、免责声明、争议解决
- [x] 会员服务协议：会员权益、退款政策（7 天内按比例）、价格变更通知
- [x] 积分服务协议：积分规则、有效期、退款规则、不可转让声明
- [x] 措辞合规（避免"算命""迷信"等表述）

### Task 3: 配置微信隐私保护框架
- [x] 在 app.json 添加 `"__private_config__"` 声明数据收集清单（UserInfo/Location/DeviceInfo）
- [x] 在 app.js 中注册 `wx.onNeedPrivacyAuthorization` 回调
- [x] 隐私弹窗含协议链接，支持同意/查看协议操作

### Task 4: 补全协议链接跳转
- [x] 订阅页「会员服务协议」改为可点击链接 → `agreement?type=vip`
- [x] 积分页「积分服务协议」改为可点击链接 → `agreement?type=points`
- [x] 引导页底部添加「用户协议」和「隐私政策」链接
- [x] 我的页面添加「用户协议」和「隐私政策」入口
- [x] 添加对应的 wxss 样式（terms-link）

### Task 5: 实现账号注销功能
- [x] 我的页面添加"注销账号"入口（danger-item 样式）
- [x] 二次确认弹窗（需输入"确认注销"）
- [x] 后端 `DELETE /api/user/delete-account` 接口（软删除 + 取消订阅）
- [x] 前端清除本地缓存和 token，跳转引导页

### Task 6: 接入微信内容安全 API
- [x] 新建 `backend/src/services/content-security.ts`
- [x] 封装 `security.msgSecCheck` 接口调用
- [x] 创建占星领域敏感词替换表（30+ 条映射）
- [x] 高风险内容检测（自杀、暴力等）
- [x] 在 `ai.ts` 中集成 `replaceSensitiveWords`（JSON 和 RAW_TEXT 两条路径）
- [x] 安全检查失败时返回通用占星内容

### Task 7: 优化 sitemap.json
- [x] 允许索引：home、discovery、wiki
- [x] 禁止索引：所有其他页面（disallow: *）

---

## 阶段二：支付系统补全（P0 - 必须完成）

### Task 8: 完善微信支付证书验签
- [x] 实现完整的 APIv3 RSA-SHA256 签名验证逻辑
- [x] 实现平台证书自动下载（`/v3/certificates`）和缓存
- [x] 支持本地证书文件加载（`backend/certs/`）
- [x] 回调通知完整验签（timestamp + nonce + body）
- [x] `verifyNotifySignature` 改为 async

### Task 9: 实现退款接口
- [x] `POST /api/wxpay/refund` 退款接口
- [x] VIP 订阅：7 天内按剩余天数比例退款
- [x] 积分：未使用部分退款
- [x] 调用微信退款 API（`/v3/refund/domestic/refunds`）
- [x] 更新订单状态和用户权益（取消订阅）
- [x] `GET /api/wxpay/orders` 用户订单列表接口

### Task 10: 创建订单管理页面
- [x] `miniprogram/pages/orders/orders.{js,json,wxml,wxss}`
- [x] 订单列表展示（编号、商品、金额、时间、状态）
- [x] 满足条件时显示"申请退款"按钮
- [x] 在 app.json 注册路由
- [x] 在「我的」页面添加"订单管理"入口

### Task 11: 支付结果反馈优化
- [x] 支付成功：展示成功 Toast，轮询订单状态确认到账
- [x] 支付失败：展示失败原因 + "重新支付"按钮（Modal）
- [x] 支付超时处理：轮询订单状态（最多 30 秒，每 5 秒一次）

### Task 12: 支付环境配置与启动检查
- [x] 创建 `backend/.env.example` 列出所有环境变量
- [x] 启动时检查关键环境变量完整性（JWT/微信/支付/数据库）
- [x] 缺少微信支付配置时生产环境返回 503
- [x] `backend/certs/` 和 `.pem` 加入 `.gitignore`

---

## 阶段三：生产环境准备（P1 - 建议完成）

### Task 13: 数据库生产配置
- [x] 确认 Supabase 配置架构正确（有配置用 Supabase，无配置用内存回退）
- [x] `.env.example` 中包含 Supabase 配置说明
- [ ] 运行数据库迁移脚本（000-004）— 需在生产环境执行

### Task 14: 域名与网络配置清单
- [x] 需在微信小程序后台配置：
  1. request 合法域名：后端 HTTPS 域名
  2. 如有文件上传需求：uploadFile 合法域名
  3. 字体文件域名：`fonts.gstatic.com`
- [ ] 真机验证 — 需部署后执行

### Task 15: 审核提交准备
- [x] 代码层面全部就绪
- [ ] 运营操作待完成：
  1. 确定小程序类目（建议：工具 > 信息查询 或 生活服务 > 生活信息）
  2. 准备小程序简介和详细描述
  3. 准备测试账号和测试流程说明
  4. 截图准备（首页、核心功能页、支付页）
  5. 准备资质材料（如类目需要）
