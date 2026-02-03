<!-- INPUT: 后端服务目录结构与职责说明（snake_case 输出，含经典拆解 Markdown 数据源、报告积分购买、地理搜索优化与自我页详情扩展）。 -->
<!-- OUTPUT: 后端服务目录文档（含经典拆解数据源、报告积分购买、地理搜索优化与自我页详情扩展说明）。 -->
<!-- POS: 后端服务目录说明；若更新此文件，务必更新本头注释。 -->
一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。
一旦我所属的文件夹有所变化，请更新我。

# 文件夹：backend

架构概要
- 独立后端服务，提供占星计算与 AI 内容生成 API。
- AI 输出以单语言为主，问答支持结构化报告。
- 缓存与数据源模块化组织，便于扩展。
- 百科内容与每日星象/灵感由后端聚合输出。

文件清单
- FOLDER.md｜地位：目录索引文档｜功能：记录后端架构与文件清单。
- .env.local｜地位：本地配置｜功能：后端 DeepSeek 配置（不对前端暴露）。
- package.json｜地位：依赖清单｜功能：后端依赖与脚本定义。
- package-lock.json｜地位：依赖锁定｜功能：锁定后端依赖版本。
- tsconfig.json｜地位：编译配置｜功能：TypeScript 编译器选项。
- data/｜地位：经典拆解数据源｜功能：经典书籍 Markdown 拆解内容（zh/en）。
- src/｜地位：源码目录｜功能：后端路由、服务与类型定义。
- dist/｜地位：构建产物｜功能：编译后的后端运行文件。

独立后端服务，提供占星计算与 AI 内容生成 API（含来源标记）。

## 技术栈

- 运行时：Node.js + TypeScript
- 框架：Express
- 缓存：Redis（可选，有内存 fallback）
- 数据库：PostgreSQL（待实现）

## 目录结构

```
backend/
├── data/              # 经典书籍 Markdown 拆解内容
├── src/
│   ├── api/           # API 路由
│   │   ├── natal.ts   # 本命盘端点
│   │   ├── daily.ts   # 每日运势端点
│   │   ├── wiki.ts    # 心理占星百科端点
│   │   ├── ask.ts     # 问答端点（支持类别上下文）
│   │   ├── synastry.ts# 合盘端点
│   │   ├── cycle.ts   # 周期端点
│   │   ├── cbt.ts     # CBT 端点
│   │   └── geo.ts     # 地理搜索端点
│   ├── services/      # 业务服务
│   │   ├── ephemeris.ts # 星历计算（Swiss Ephemeris）
│   │   ├── ai.ts      # AI 内容生成（DeepSeek，snake_case 输出，含单语言解析、来源标记、统一 Key 与缓存策略）
│   │   └── geocoding.ts # 城市搜索（Open-Meteo，含超时回退）
│   ├── data/          # 数据源定义
│   │   ├── sources.ts # 数据源接口与常量
│   │   ├── wiki.ts    # 百科静态内容与趋势标签
│   │   └── wiki-classics.ts # 经典书籍静态数据
│   ├── prompts/       # Prompt 管理
│   │   └── manager.ts # Prompt 注册与版本管理（snake_case）
│   ├── cache/         # 缓存层
│   │   ├── strategy.ts# 缓存策略定义
│   │   └── redis.ts   # Redis 实现
│   ├── types/         # 类型定义
│   │   └── api.ts     # API 请求/响应类型（含问答类别）
│   └── index.ts       # 入口文件
├── package.json
└── tsconfig.json
```

## 环境变量

- `PORT`：服务端口（默认 3001）
- `DEEPSEEK_API_KEY`：DeepSeek API 密钥
- `DEEPSEEK_BASE_URL`：DeepSeek API 地址（可选）
- `AI_TIMEOUT_MS`：AI 请求超时（毫秒，默认 0 表示不超时）
- `AI_TEMPERATURE`：AI 采样温度（0-1）
- `GEOCODING_TIMEOUT_MS`：地理编码请求超时（毫秒）
- `REDIS_URL`：Redis 连接 URL（可选）

后端入口会尝试读取 `backend/.env` 与项目根目录 `.env.local`，用于共享同一套 DeepSeek 配置。

## 运行

```bash
cd backend
npm install
npm run dev
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/natal/chart` | GET | 获取本命盘数据 |
| `/api/natal/overview` | GET | 获取本命盘 + AI 解读 |
| `/api/natal/core-themes` | GET | 获取本命盘核心主题 |
| `/api/natal/dimension` | GET | 获取本命盘维度解读 |
| `/api/daily` | GET | 获取每日运势 |
| `/api/daily/detail` | GET | 获取详细日运 |
| `/api/wiki/home` | GET | 获取百科首页聚合内容 |
| `/api/wiki/items` | GET | 获取百科条目列表 |
| `/api/wiki/items/:id` | GET | 获取百科条目详情 |
| `/api/wiki/classics` | GET | 获取经典书籍列表 |
| `/api/wiki/classics/:id` | GET | 获取经典书籍详情 |
| `/api/wiki/search` | GET | 百科关键词搜索 |
| `/api/ask` | POST | 问答 |
| `/api/synastry` | GET | 获取合盘分析（支持 tab 分段生成） |
| `/api/synastry/technical` | GET | 获取合盘技术附录（按需加载） |
| `/api/synastry/suggestions` | GET | 合盘关系类型建议 |
| `/api/cycle/list` | GET | 获取周期列表 |
| `/api/cycle/naming` | GET | 获取周期命名 |
| `/api/cbt/analysis` | POST | CBT 分析 |
| `/api/cbt/records` | GET/POST | CBT 记录管理 |
| `/api/geo/search` | GET | 城市模糊搜索 |
| `/health` | GET | 健康检查 |

## 近期更新
- Geo 搜索支持多语言参数与省/国家过滤兜底。
- 报告购买流程改为积分扣减并应用订阅折扣定价。
- Ask/合盘生成端点补充权益校验与消费处理。
- 本命盘/日运/CBT 端点改用紧凑摘要上下文并新增 Server-Timing 指标。
- 行运计算结果按出生信息 + 日期缓存 24 小时。
- 移除本命盘技术分析 AI 端点，仅保留真实计算数据。
- 后端 Node 版本固定为 20.x 并升级 node-gyp 以兼容 swisseph 编译。
- 权益 V2 补充详情解锁与 GM 积分购买处理。
- GM 开发会话在无数据库时启用内存权益回退。
- 新增 GM 开发会话端点用于本地测试登录。
- 新增 Wiki 经典书籍静态数据与列表/详情端点。
- 百科深度解读生成覆盖已填充全量内容，并扩展字段 Prompt。
- 本命盘概览输出拆分为 sun/moon/rising，并更新 prompt 版本与 mock 数据。
- 详情解读端点新增本我页面 Big3/深度解析类型支持。
- 星历输出新增南交点、莉莉丝、福点、宿命点与东方点等衍生点位。
- 人生课题与行动 prompt 输出结构改为 summary + key_points，并同步类型与 mock。
- 合盘技术附录拆分为独立端点，overview 不再携带附录载荷。
- AI 默认超时时间上调以降低合盘报告超时概率。
- 合盘报告请求支持禁用 AI 超时以持续等待结果。
- 合盘报告请求提升 max_tokens 以避免长内容截断。
- AI 严格模式失败时输出后端错误日志用于排查。
- AI 输出 JSON 异常时增加自动修复尝试与错误归类。
- AI 输出改为单语言 payload，并在缓存 key 中包含语言。
- 合盘接口支持按 tab 分段生成与明确失败返回。
- 问答输出改为结构化报告并更新 Prompt 架构。
- DeepSeek 环境变量迁移到后端本地配置并仅后端读取。
- 合盘总览 Prompt/类型加入核心互动动力学、关系时间线与占星亮点准确度提示。
- 新增心理占星百科 Wiki 端点与每日星象/灵感 Prompt。
