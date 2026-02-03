# Tasks: 首页运势卡片内容与分享优化

## 1. 后端 Prompt 模板

- [x] 1.1 新增 `daily-home-card` Prompt 模板
  - 文件：`backend/src/prompts/templates/daily/home-card.ts`
  - 实现 `PromptTemplate` 接口
  - 输入：score、summary、aspects、lucky 元素
  - 输出：quote（金句 12-18 字）+ body（正文 40-60 字）
  - 语言风格：年轻化网络用语，适度 emoji
  - 验证：`buildPrompt('daily-home-card', context)` 返回有效 system/user

- [x] 1.2 在 daily 模板索引中注册新模板
  - 文件：`backend/src/prompts/templates/daily/index.ts`
  - 导出并添加到模板数组
  - 验证：`getPrompt('daily-home-card')` 返回非空

## 2. 后端 API 扩展

- [x] 2.1 扩展 `/api/daily/transit` 端点
  - 在计算完 transit 数据后，调用 `daily-home-card` Prompt 生成金句+正文
  - 响应新增 `homeCard: { quote: string, body: string }` 字段
  - 降级：AI 调用失败时，使用本地 MOON_THEME 生成兜底文案
  - 验证：curl 测试响应包含 homeCard 字段
  - 注意：不能影响 transit 端点的响应速度，考虑并行调用或缓存策略

## 3. 前端卡片布局优化

- [x] 3.1 重构首页运势卡片 WXML
  - 卡片顶部：大数字评分 + 金句（font-ancient）
  - 中间分隔线 + 正文描述区域（font-body）
  - 底部幸运元素行保持不变
  - 底部新增「分享」+「详情→」操作按钮行
  - 右上角分享按钮保持不变
  - 验证：页面结构匹配设计图 Image 1

- [x] 3.2 更新运势卡片样式 WXSS
  - 评分大数字样式（居中、大号字体）
  - 金句样式（居中、font-ancient）
  - 正文描述样式（左对齐、行高适配 40-60 字）
  - 操作按钮行样式
  - 验证：视觉效果匹配设计图

- [x] 3.3 更新前端数据处理逻辑
  - 解析 API 返回的 `homeCard.quote` 和 `homeCard.body`
  - 更新 `shareData` 增加 quote 和 body 字段
  - 降级：API 无 homeCard 时使用原 summary/description
  - 验证：卡片正确显示金句和正文

## 4. 分享弹窗重构

- [x] 4.1 重构分享弹窗 WXML 为全屏卡片
  - 全屏遮罩层
  - 居中分享卡片：
    - 顶部：用户星座名称
    - 日期 + 运势评分
    - 金句（大字居中）
    - 底部：小程序码/品牌标识区域
  - 底部操作：「复制文案」+「分享给好友」按钮
  - 关闭按钮
  - 验证：弹窗匹配设计图 Image 2

- [x] 4.2 更新分享弹窗样式
  - 全屏遮罩样式（半透明黑色背景）
  - 分享卡片样式（圆角、阴影、居中）
  - 星座名称、日期、评分、金句排版
  - 操作按钮样式
  - 验证：视觉效果匹配设计图

- [x] 4.3 实现分享交互逻辑
  - 「复制文案」：调用 `wx.setClipboardData` 复制金句+评分+日期
  - 「分享给好友」：通过 `button open-type="share"` 触发微信分享
  - 分享消息内容：标题=金句，图片=运势卡片截图或默认图
  - 关闭弹窗逻辑
  - 验证：复制成功提示、分享面板弹出

## 5. 集成验证

- [x] 5.1 端到端测试
  - 首页加载 → 卡片显示评分+金句+正文+幸运元素
  - 点击分享按钮 → 全屏分享卡片弹出
  - 复制文案 → 剪贴板包含正确内容
  - 分享给好友 → 微信分享面板弹出
  - 验证：完整用户流程无错误

- [x] 5.2 降级场景测试
  - AI 不可用时卡片显示兜底文案
  - 网络错误时卡片显示缓存或默认数据
  - 验证：异常场景下页面不崩溃

## 依赖关系

```
1.1 → 1.2 → 2.1（后端链路）
3.1, 3.2 可并行（前端布局，不依赖后端）
3.3 → 依赖 2.1
4.1, 4.2 可并行（分享弹窗布局）
4.3 → 依赖 4.1
5.x → 依赖所有前置任务
```
