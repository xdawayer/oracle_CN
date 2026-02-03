# Change: 优化双人合盘 Prompt 系统

## Why

当前合盘模块的 Prompt 存在以下问题：

1. **角色设定碎片化**：各 Prompt 独立使用 `ANALYTICAL_PERSONA`，缺少针对关系占星的专属角色设定
2. **分析框架不统一**：用户提供了系统化的分析框架（本命盘 6 维度、比较盘 8 维度、组合盘 6 维度、综合报告），但现有 Prompt 未完全对齐
3. **输出格式不规范**：现有 JSON 输出结构与用户提供的标准格式有差异
4. **缺少相位解读知识库**：用户提供了详细的相位解读参考表，需要整合进系统
5. **场景化不足**：需要更多针对中国年轻人关系场景的具体示例

## What Changes

### 文化层扩展
- 新增 `cultural/synastry-persona.ts`：关系占星师专属角色设定
- 新增 `cultural/metaphors/synastry-aspects.ts`：合盘相位比喻库（日月、金火、土星、冥王、北交点）

### 模板层重写
- **重写** `templates/synastry/natal-a.ts` 和 `natal-b.ts`：对齐本命盘 6 维度框架
- **重写** `templates/synastry/compare-ab.ts` 和 `compare-ba.ts`：对齐比较盘 8 维度框架
- **重写** `templates/synastry/composite.ts`：对齐组合盘 6 维度框架
- **新增** `templates/synastry/comprehensive-report.ts`：综合报告生成

### 指令层扩展
- 新增 `instructions/synastry-output.ts`：合盘专属输出格式规范

## Impact

### 受影响的代码
- `backend/src/prompts/cultural/` - 新增文件
- `backend/src/prompts/templates/synastry/` - 重写多个文件
- `backend/src/prompts/instructions/` - 新增文件
- `backend/src/prompts/index.ts` - 更新导出

### 受影响的规范
- synastry-prompts（新建）

### 兼容性
- API 对外接口不变
- 现有合盘调用无需修改，输出格式有调整需前端适配
- 缓存 key 因版本号变更自动失效

### 风险
- 低风险：在现有三层架构基础上扩展，不影响核心层
- 需要前端配合调整 JSON 解析逻辑
