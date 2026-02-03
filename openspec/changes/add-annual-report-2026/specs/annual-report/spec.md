# Spec: 2026 流年运势报告

## Overview

为用户提供个性化的 2026 年流年运势报告，包含年度总览、事业财运、感情关系、健康能量、人际社交、学习成长、季度详解和开运指南等模块，总计约 10000 字的深度解读。

---

## ADDED Requirements

### Requirement: 流年报告生成

系统 SHALL 支持基于用户本命盘数据生成 2026 年流年运势报告。

报告 SHALL 包含以下 11 个模块：
- 年度总览（overview）：800-1000 字
- 事业财运（career）：1200-1500 字
- 感情关系（love）：1200-1500 字
- 健康能量（health）：800-1000 字
- 人际社交（social）：800-1000 字
- 学习成长（growth）：800-1000 字
- 第一季度详解（q1）：500-600 字
- 第二季度详解（q2）：500-600 字
- 第三季度详解（q3）：500-600 字
- 第四季度详解（q4）：500-600 字
- 开运指南（lucky）：600-800 字

#### Scenario: 用户请求生成流年报告
- **GIVEN** 用户已完成付费
- **AND** 用户本命盘数据已存在（出生日期、时间、地点）
- **WHEN** 用户请求生成 2026 年流年运势报告
- **THEN** 系统并行启动各模块的 AI 生成任务
- **AND** 按模块完成顺序依次返回内容
- **AND** 全部完成后返回完成信号

#### Scenario: 缺少本命盘数据
- **GIVEN** 用户未设置完整的出生信息
- **WHEN** 用户请求生成流年报告
- **THEN** 系统返回错误，提示用户补全出生信息

---

### Requirement: 并行生成与流式响应

系统 SHALL 采用并行生成策略以优化用户等待时间。

系统 SHALL 按以下批次启动模块生成：
- 批次 1（立即）：overview
- 批次 2（批次 1 完成后）：career, love
- 批次 3（并行）：health, social, growth, q1, q2, q3, q4, lucky

系统 SHALL 使用 SSE (Server-Sent Events) 返回流式响应。

#### Scenario: 流式返回模块内容
- **GIVEN** 用户请求生成流年报告
- **WHEN** overview 模块生成完成
- **THEN** 系统立即通过 SSE 返回 overview 内容
- **AND** 前端立即渲染展示
- **AND** 其他模块继续生成

#### Scenario: 模块生成失败重试
- **GIVEN** 某个模块 AI 调用失败
- **WHEN** 失败次数未超过 2 次
- **THEN** 系统自动重试该模块
- **AND** 不影响其他模块的生成

---

### Requirement: 报告缓存

系统 SHALL 缓存已生成的报告模块，支持用户重复查看。

缓存 key 格式 SHALL 为：`annual:{userId}:{year}:{moduleId}:{chartHash}`

缓存有效期 SHALL 为 365 天。

#### Scenario: 命中缓存直接返回
- **GIVEN** 用户之前已生成过 2026 年流年报告
- **AND** 出生信息未发生变更
- **WHEN** 用户再次查看报告
- **THEN** 系统直接从缓存返回内容
- **AND** 不调用 AI 生成

#### Scenario: 出生信息变更后重新生成
- **GIVEN** 用户修改了出生时间或地点
- **WHEN** 用户查看流年报告
- **THEN** chartHash 与缓存不匹配
- **AND** 系统重新生成报告

---

### Requirement: 报告内容规范

报告内容 SHALL 符合以下规范：

**语言风格**：
- 使用简体中文
- 语言温暖有力，富有画面感
- 心理学视角解读，避免宿命论
- 融入中国文化元素（节气、传统节日）

**内容原则**：
- 避免绝对化预言（如"一定会"、"必然"）
- 使用"可能"、"容易"、"适合"等柔性表述
- 每个挑战配套应对策略
- 避免医疗和投资建议

**2026 年星象基础**：
- 木星：巨蟹座（至 2026.6）→ 狮子座（2026.6 起）
- 土星：白羊座全年
- 天王星：金牛座后期 → 双子座初期
- 海王星：双鱼座 → 白羊座（2026.3 进入）
- 冥王星：水瓶座全年
- 北交点：双鱼座 → 水瓶座（2026.1 进入）

#### Scenario: 报告内容包含必要元素
- **GIVEN** 系统生成年度总览模块
- **WHEN** 内容生成完成
- **THEN** 内容 SHALL 包含年度主题标题
- **AND** 内容 SHALL 包含关键星象解读
- **AND** 内容 SHALL 包含重要时间节点
- **AND** 内容 SHALL 包含年度关键词

#### Scenario: 季度详解包含节日元素
- **GIVEN** 系统生成 Q1 季度详解
- **WHEN** 内容生成完成
- **THEN** 内容 SHOULD 提及春节、元宵等传统节日
- **AND** 内容 SHALL 包含该季度的行动建议

---

### Requirement: 前端展示

前端 SHALL 提供流年报告展示页面。

页面 SHALL 包含：
- 顶部进度条，显示生成进度
- 模块列表，按顺序渲染已完成内容
- 加载中模块显示骨架屏或动画
- 全部完成后隐藏进度条

页面样式 SHALL 符合水墨风格规范。

#### Scenario: 渐进式渲染
- **GIVEN** 用户进入流年报告页面
- **WHEN** overview 模块返回
- **THEN** 页面立即渲染 overview 内容
- **AND** 其他模块显示加载状态
- **AND** 进度条显示 1/11 完成

#### Scenario: 全部完成
- **GIVEN** 所有 11 个模块已返回
- **WHEN** 收到 done 事件
- **THEN** 进度条显示 100% 并淡出
- **AND** 可滚动查看完整报告

---

### Requirement: API 端点

系统 SHALL 提供以下 API 端点：

**POST /api/annual-report/generate**
- 请求体：`{ year, birth: { date, time, city, lat, lon, timezone } }`
- 响应：SSE 流式响应
- 事件类型：
  - `module`：模块内容（包含 moduleId, status, content）
  - `error`：错误信息
  - `done`：生成完成

**GET /api/annual-report/status**
- 请求参数：`year`, `chartHash`
- 响应：各模块缓存状态

#### Scenario: SSE 响应格式
- **GIVEN** 用户请求生成报告
- **WHEN** overview 模块生成完成
- **THEN** 返回事件格式如下：
```
event: module
data: {"moduleId":"overview","status":"complete","content":"..."}
```

#### Scenario: 全部完成响应
- **GIVEN** 所有模块已生成
- **WHEN** 最后一个模块完成
- **THEN** 返回 done 事件：
```
event: done
data: {"totalModules":11,"completedAt":"2026-01-29T12:00:00Z"}
```
