# Astromind 小程序手动配置与验证指南

以下内容覆盖所有需要手动配置或手动验证的任务。每项均提供可执行的步骤。

## A. 手动配置/验证清单
1. Task 1.2.1 创建 Supabase 项目
2. Task 1.2.2 运行 `000_initial_schema.sql`
3. Task 1.2.3 运行 `001_payment_subscription.sql`
4. Task 1.2.4 运行 `002_update_free_usage_synthetica.sql`
5. Task 1.2.5 添加微信字段
6. Task 1.3.1 创建 `astromind/backend/.env`
7. Task 1.3.2 配置 `DEEPSEEK_API_KEY`
8. Task 1.3.3 配置 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
9. Task 1.3.4 配置 `JWT_SECRET`
10. Task 1.3.5 配置 `WECHAT_APPID` 和 `WECHAT_APPSECRET`
11. Task 1.3.6 配置 `REDIS_URL`（可选）
12. Task 2.1.3 配置 `project.config.json`
13. Task 3.2.3 测试 DeepSeek API 调用
14. Task 3.2.4 验证温度分层策略
15. Task 3.2.5 验证缓存机制
16. Task 5.1.1 测试 16 个小程序页面
17. Task 5.1.2 测试 17 个后端 API
18. Task 5.1.3 测试微信授权登录流程
19. Task 5.1.4 测试数据持久化
20. Task 5.2.1 测试小程序首屏加载时间
21. Task 5.2.2 测试 API 响应时间
22. Task 5.3.1 提交小程序审核

## B. 数据库配置（Supabase）

### B1. 创建项目（Task 1.2.1）
1. 访问 https://supabase.com/dashboard。
2. 点击 New Project。
3. 项目名填写 `astromind-miniprogram`。
4. 创建完成后进入 Project Settings -> API。
5. 记录 `Project URL` 与 `service_role` key。

### B2. 运行迁移脚本（Task 1.2.2-1.2.4）
1. 进入 Supabase 控制台 -> SQL Editor。
2. 依次执行以下脚本（位于 `astromind/backend/migrations/`）：
   - `000_initial_schema.sql`
   - `001_payment_subscription.sql`
   - `002_update_free_usage_synthetica.sql`
3. 执行后确认表结构创建成功（任务清单中列出的 7 张表）。

### B3. 添加微信字段（Task 1.2.5）
1. 在 SQL Editor 执行：
```sql
ALTER TABLE users ADD COLUMN wechat_openid VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN wechat_unionid VARCHAR(255);
ALTER TABLE users ADD COLUMN wechat_session_key VARCHAR(255);
CREATE INDEX idx_users_wechat_openid ON users(wechat_openid);
```

## C. 后端环境变量（Task 1.3.1-1.3.6）

### C1. 创建 `.env` 文件（Task 1.3.1）
1. 在 `astromind/backend/` 创建 `.env` 文件。
2. 确保该文件不被提交到 Git。

### C2. 配置项与来源（Task 1.3.2-1.3.6）
在 `astromind/backend/.env` 写入以下变量：
```
DEEPSEEK_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
WECHAT_APPID=
WECHAT_APPSECRET=
REDIS_URL=
```
获取方式：
1. `DEEPSEEK_API_KEY`：DeepSeek 平台获取。
2. `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`：Supabase 项目 Settings -> API。
3. `JWT_SECRET`：运行 `openssl rand -base64 32` 生成。
4. `WECHAT_APPID`、`WECHAT_APPSECRET`：微信公众平台 -> 开发 -> 开发管理 -> 开发设置。
5. `REDIS_URL`：可选；不配置时系统使用内存缓存。

## D. 小程序项目配置（Task 2.1.3）
1. 使用微信开发者工具打开 `astromind/miniprogram`。
2. 修改 `project.config.json` 的 `appid` 为你的 AppID。
3. 在“详情”面板中启用：
   - ES6 转 ES5
   - 增强编译
4. 本地测试可勾选“不校验合法域名”，上线前在公众平台配置合法域名。

## E. AI 服务验证（Task 3.2.3-3.2.5）

### E1. DeepSeek API 调用（Task 3.2.3）
1. 启动后端服务（确保 `astromind/backend/.env` 已配置）。
2. 使用 GET 请求调用：
```bash
curl "http://localhost:3001/api/natal/overview?date=1990-01-01&time=12:00&city=Shanghai&lang=zh"
```
3. 验证返回 `content` 字段为 AI 生成结果。

### E2. 温度分层（Task 3.2.4）
1. 打开 `astromind/backend/src/services/ai.ts`。
2. 检查 `TEMPERATURE_MAP` 范围在 0.1-0.7。
3. 确认 T2/T3/T4/T5 取值分别为 0.3/0.5/0.6/0.7。

### E3. 缓存机制（Task 3.2.5）
1. 启动 Redis 或确认缓存降级可用。
2. 调用同一 AI 接口两次。
3. 检查响应 meta 中 `cached` 标记或观察 Redis 中缓存键值。
4. TTL 参照 `astromind/backend/src/cache/strategy.ts`（7 天）。

## F. 功能测试与性能测试（Task 5.1.x / 5.2.x）

### F1. 页面渲染与交互（Task 5.1.1）
1. 在开发者工具中逐个打开 16 个页面。
2. 验证无控制台错误。
3. 验证关键操作（输入、提交、导航）正常。

### F2. 后端 API 测试（Task 5.1.2）
1. 启动后端服务。
2. 使用 Postman 或 curl 调用 17 个 API。
3. 校验返回结构与状态码正确。

### F3. 微信授权登录（Task 5.1.3）
1. 打开“我的”页。
2. 点击“微信授权登录”。
3. 验证 token 写入 `storage`，并可访问需要鉴权的接口。

### F4. 数据持久化（Task 5.1.4）
1. 完成登录与一次业务操作。
2. 检查 Supabase 表中记录是否新增/更新。

### F5. 小程序首屏性能（Task 5.2.1）
1. 使用开发者工具性能面板。
2. 冷启动计时首屏完成时间，应 < 2 秒。

### F6. API 响应时间（Task 5.2.2）
1. 使用日志或 API 网关统计。
2. 非 AI 接口应 < 1 秒，AI 接口应 < 5 秒。

## G. 提交审核（Task 5.3.1）
1. 在开发者工具点击“上传”。
2. 登录 https://mp.weixin.qq.com/ -> 版本管理。
3. 设置体验版，完成验收后提交审核。

---
注意：不要提交包含真实密钥的 `astromind/backend/.env`。
