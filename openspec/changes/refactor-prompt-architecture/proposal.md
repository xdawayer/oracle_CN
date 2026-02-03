# Change: 重构 Prompt 架构 - 本土化与模块化

## Why

当前 `backend/src/prompts/manager.ts` 存在以下问题：

1. **单文件过大**：2865 行 / 136KB，包含 62 个 Prompt，难以维护
2. **冗余内容**：保留了大量针对欧美用户的英文版本，但产品仅面向中国大陆用户
3. **文化适配不足**：缺少系统化的本土化比喻库、场景库、心理学概念映射
4. **架构混乱**：Prompt 定义、注册逻辑、工具函数混杂在一起
5. **版本管理分散**：版本号散落在各处，缺少统一管理

## What Changes

### 架构重构
- **BREAKING** 将单一 `manager.ts` 拆分为模块化目录结构
- 新增 `core/` 层：类型定义、注册表、构建器、缓存
- 新增 `templates/` 层：按功能模块组织 Prompt（natal/daily/synastry/cbt/ask/synthetica/kline/wiki）
- 新增 `cultural/` 层：角色设定、语气指南、比喻库、场景库、心理学概念

### 内容清理
- 移除所有英文版 Prompt 和双语切换逻辑
- 移除 `SINGLE_LANGUAGE_INSTRUCTION_EN` 等英文常量
- 统一使用简体中文输出

### 本土化增强
- 新增 3 种角色设定（默认友人、疗愈向、分析向）
- 新增行星/相位/宫位比喻库（中国文化意象）
- 新增场景库（996、催婚、相亲等中国年轻人熟悉的场景）
- 新增心理学概念本土化映射（荣格、依恋理论、CBT 认知扭曲）

### Prompt 数量调整
- **精简为 38 个** Prompt（从 62 个精简）
- 按优先级分类：P0 核心（12 个）、P1 重要（16 个）、P2 增强（10 个）

## Impact

### 受影响的代码
- `backend/src/prompts/manager.ts` - 完全重构
- `backend/src/prompts/common.ts` - 移入 `core/types.ts`
- `backend/src/prompts/self-page/` - 整合入新的 `templates/` 结构
- `backend/src/services/ai.ts` - 更新 Prompt 调用方式

### 受影响的规范
- prompt-system（新建）

### 兼容性
- API 对外接口不变
- 缓存 key 格式保持兼容：`ai:{promptId}:v{version}:{hash}`
- 现有功能模块调用方式需小幅调整

### 风险
- 中等风险：大规模重构，需充分测试
- 迁移成本：需逐步替换，确保每个 Prompt 输出质量一致
