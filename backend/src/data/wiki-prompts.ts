// INPUT: Wiki 深度解读 Prompt 模板定义（含新增生活领域字段）。
// OUTPUT: 导出各类别条目的专属 Prompt 模板（含深度解读扩展字段）。
// POS: Wiki Prompt 模板源；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

export interface WikiDeepDivePrompt {
  id: string;
  category: 'planets' | 'signs' | 'houses' | 'aspects' | 'elements' | 'modes' | 'angles' | 'asteroids' | 'chart-types';
  zhPrompt: string;
  enPrompt: string;
}

export function buildPlanetPrompt(vars: any, lang: 'zh' | 'en'): string {
  if (lang === 'zh') {
    return `你是一位专业的心理占星师，擅长将占星学与荣格心理学结合。
请针对【${vars.planet_name}】进行深入的 8 步骤分析。

**行星基础信息：**
- 中文名：${vars.zh_name}
- 英文名：${vars.en_name}
- 符号：${vars.symbol}
- 守护星座：${vars.ruling_signs}
- 关联宫位：${vars.associated_houses?.join(', ')}
- 原型：${vars.archetype}
- 核心关键词：${vars.keywords}

**特殊侧重点：**
${vars.focus_points}

**阴影特质重点：**
${vars.shadow_focus}

**整合方向重点：**
${vars.integration_focus}

**成长课题：**
${vars.growth_lessons}

请生成以下内容（JSON 格式）：
1. astronomy_myth：天文与神话背景（150-200 字）
2. psychology：荣格心理学视角解读（200-300 字）
3. shadow：阴影特质与表现（100-150 字）
4. integration：如何整合能量（150-200 字）
5. deep_dive：8 个深度解读步骤，每步包含：
   - step: 步骤序号（1-8）
   - title: 步骤标题
   - description: 详细说明（100-200 字，支持 Markdown）
6. life_areas：至少 2 条生活领域影响，数组元素包含：
   - area: career | love | health | finance | family | spiritual
   - description: 描述该领域的影响（50-80 字）
7. growth_path：成长路径建议（100-150 字）
8. practical_tips：3-5 条实用小贴士（字符串数组）
9. common_misconceptions：2-3 条常见误解澄清（字符串数组）
10. affirmation：1 条正向肯定语（30-60 字）

**格式要求：**
- 使用标准 JSON 格式输出，不要包含任何额外文字
- deep_dive 是对象数组（不是嵌套数组），结构如下：
  \`\`\`json
  "deep_dive": [{"step": 1, "title": "标题", "description": "描述"}, ...]
  \`\`\`
- deep_dive 数组必须包含恰好 8 个步骤对象
- life_areas 至少 2 条且 area 必须为指定枚举
- 不要在 JSON 中使用中文引号，只使用英文双引号 "
- 描述中可以包含 **粗体** 强调重点
- 每个步骤应循序渐进，从基础概念到实践整合`;
  }
  return `You are a professional psychological astrologer who specializes in combining astrology with Jungian psychology.
Please provide an in-depth 8-step analysis of 【${vars.planet_name}】.

**Planet Basic Info:**
- Chinese Name: ${vars.zh_name}
- English Name: ${vars.en_name}
- Symbol: ${vars.symbol}
- Ruling Signs: ${vars.ruling_signs}
- Associated Houses: ${vars.associated_houses?.join(', ')}
- Archetype: ${vars.archetype}
- Core Keywords: ${vars.keywords}

**Special Focus Points:**
${vars.focus_points}

**Shadow Qualities Focus:**
${vars.shadow_focus}

**Integration Direction Focus:**
${vars.integration_focus}

**Growth Lessons:**
${vars.growth_lessons}

Please generate the following content in JSON format:
1. astronomy_myth: Astronomical and mythological background (150-200 words)
2. psychology: Jungian psychology interpretation (200-300 words)
3. shadow: Shadow qualities and manifestations (100-150 words)
4. integration: How to integrate the energy (150-200 words)
5. deep_dive: 8 in-depth interpretation steps, each containing:
   - step: Step number (1-8)
   - title: Step title
   - description: Detailed explanation (100-200 words, supports Markdown)
6. life_areas: At least 2 life domains, each containing:
   - area: career | love | health | finance | family | spiritual
   - description: Impact description (40-60 words)
7. growth_path: Growth path guidance (80-120 words)
8. practical_tips: 3-5 practical tips (string array)
9. common_misconceptions: 2-3 common misconceptions (string array)
10. affirmation: 1 positive affirmation (15-30 words)

**Format Requirements:**
- Output in JSON format only, without any extra text
- deep_dive array must contain exactly 8 steps
- life_areas must include at least 2 entries with allowed area values
- Descriptions can use **bold** for emphasis
- Each step should be progressive, from basic concepts to practical integration`;
}

export function buildSignPrompt(vars: any, lang: 'zh' | 'en'): string {
  if (lang === 'zh') {
    return `你是一位专业的心理占星师，擅长将占星学与荣格心理学结合。
请针对【${vars.zh_name}】进行深入的 8 步骤分析。

**星座基础信息：**
- 中文名：${vars.zh_name}
- 英文名：${vars.en_name}
- 符号：${vars.symbol}
- 元素：${vars.element}
- 模式：${vars.mode}
- 守护星：${vars.ruler}
- 对宫星座：${vars.opposite_sign}
- 身体对应：${vars.body_parts}
- 核心关键词：${vars.keywords}

**特殊侧重点：**
${vars.focus_points}

**阴影特质重点：**
${vars.shadow_focus}

**整合方向重点：**
${vars.integration_focus}

**成长课题：**
${vars.growth_lessons}

请生成以下内容（JSON 格式）：
1. astronomy_myth：天文与神话背景（150-200 字）
2. psychology：荣格心理学视角解读（200-300 字）
3. shadow：阴影特质与表现（100-150 字）
4. integration：如何整合能量（150-200 字）
5. deep_dive：8 个深度解读步骤，每步包含：
   - step: 步骤序号（1-8）
   - title: 步骤标题
   - description: 详细说明（100-200 字，支持 Markdown）
6. life_areas：至少 2 条生活领域影响，数组元素包含：
   - area: career | love | health | finance | family | spiritual
   - description: 描述该领域的影响（50-80 字）
7. growth_path：成长路径建议（100-150 字）
8. practical_tips：3-5 条实用小贴士（字符串数组）
9. common_misconceptions：2-3 条常见误解澄清（字符串数组）
10. affirmation：1 条正向肯定语（30-60 字）

**格式要求：**
- 使用标准 JSON 格式输出，不要包含任何额外文字
- deep_dive 是对象数组（不是嵌套数组），结构如下：
  \`\`\`json
  "deep_dive": [{"step": 1, "title": "标题", "description": "描述"}, ...]
  \`\`\`
- deep_dive 数组必须包含恰好 8 个步骤对象
- life_areas 至少 2 条且 area 必须为指定枚举
- 不要在 JSON 中使用中文引号，只使用英文双引号 "
- 描述中可以包含 **粗体** 强调重点
- 每个步骤应循序渐进，从基础概念到实践整合`;
  }
  return `You are a professional psychological astrologer who specializes in combining astrology with Jungian psychology.
Please provide an in-depth 8-step analysis of 【${vars.en_name}】.

**Sign Basic Info:**
- Chinese Name: ${vars.zh_name}
- English Name: ${vars.en_name}
- Symbol: ${vars.symbol}
- Element: ${vars.element}
- Mode: ${vars.mode}
- Ruling Planet: ${vars.ruler}
- Opposite Sign: ${vars.opposite_sign}
- Body Correspondence: ${vars.body_parts}
- Core Keywords: ${vars.keywords}

**Special Focus Points:**
${vars.focus_points}

**Shadow Qualities Focus:**
${vars.shadow_focus}

**Integration Direction Focus:**
${vars.integration_focus}

**Growth Lessons:**
${vars.growth_lessons}

Please generate the following content in JSON format:
1. astronomy_myth: Astronomical and mythological background (150-200 words)
2. psychology: Jungian psychology interpretation (200-300 words)
3. shadow: Shadow qualities and manifestations (100-150 words)
4. integration: How to integrate the energy (150-200 words)
5. deep_dive: 8 in-depth interpretation steps, each containing:
   - step: Step number (1-8)
   - title: Step title
   - description: Detailed explanation (100-200 words, supports Markdown)
6. life_areas: At least 2 life domains, each containing:
   - area: career | love | health | finance | family | spiritual
   - description: Impact description (40-60 words)
7. growth_path: Growth path guidance (80-120 words)
8. practical_tips: 3-5 practical tips (string array)
9. common_misconceptions: 2-3 common misconceptions (string array)
10. affirmation: 1 positive affirmation (15-30 words)

**Format Requirements:**
- Output in JSON format only, without any extra text
- deep_dive array must contain exactly 8 steps
- life_areas must include at least 2 entries with allowed area values
- Descriptions can use **bold** for emphasis
- Each step should be progressive, from basic concepts to practical integration`;
}

export function buildHousePrompt(vars: any, lang: 'zh' | 'en'): string {
  if (lang === 'zh') {
    return `你是一位专业的心理占星师，擅长将占星学与荣格心理学结合。
请针对【${vars.zh_name}】进行深入的 8 步骤分析。

**宫位基础信息：**
- 中文名：${vars.zh_name}
- 英文名：${vars.en_name}
- 自然守护星座：${vars.natural_sign}
- 自然守护行星：${vars.natural_ruler}
- 对宫：${vars.opposite_house}
- 生活领域：${vars.life_areas}
- 核心关键词：${vars.keywords}

**特殊侧重点：**
${vars.focus_points}

**阴影特质重点：**
${vars.shadow_focus}

**整合方向重点：**
${vars.integration_focus}

**成长课题：**
${vars.growth_lessons}

请生成以下内容（JSON 格式）：
1. astronomy_myth：天文与神话背景（150-200 字）
2. psychology：荣格心理学视角解读（200-300 字）
3. shadow：阴影特质与表现（100-150 字）
4. integration：如何整合能量（150-200 字）
5. deep_dive：8 个深度解读步骤，每步包含：
   - step: 步骤序号（1-8）
   - title: 步骤标题
   - description: 详细说明（100-200 字，支持 Markdown）
6. life_areas：至少 2 条生活领域影响，数组元素包含：
   - area: career | love | health | finance | family | spiritual
   - description: 描述该领域的影响（50-80 字）
7. growth_path：成长路径建议（100-150 字）
8. practical_tips：3-5 条实用小贴士（字符串数组）
9. common_misconceptions：2-3 条常见误解澄清（字符串数组）
10. affirmation：1 条正向肯定语（30-60 字）

**格式要求：**
- 使用标准 JSON 格式输出，不要包含任何额外文字
- deep_dive 是对象数组（不是嵌套数组），结构如下：
  \`\`\`json
  "deep_dive": [{"step": 1, "title": "标题", "description": "描述"}, ...]
  \`\`\`
- deep_dive 数组必须包含恰好 8 个步骤对象
- life_areas 至少 2 条且 area 必须为指定枚举
- 不要在 JSON 中使用中文引号，只使用英文双引号 "
- 描述中可以包含 **粗体** 强调重点
- 每个步骤应循序渐进，从基础概念到实践整合`;
  }
  return `You are a professional psychological astrologer who specializes in combining astrology with Jungian psychology.
Please provide an in-depth 8-step analysis of 【${vars.en_name}】.

**House Basic Info:**
- Chinese Name: ${vars.zh_name}
- English Name: ${vars.en_name}
- Natural Ruling Sign: ${vars.natural_sign}
- Natural Ruling Planet: ${vars.natural_ruler}
- Opposite House: ${vars.opposite_house}
- Life Domain: ${vars.life_areas}
- Core Keywords: ${vars.keywords}

**Special Focus Points:**
${vars.focus_points}

**Shadow Qualities Focus:**
${vars.shadow_focus}

**Integration Direction Focus:**
${vars.integration_focus}

**Growth Lessons:**
${vars.growth_lessons}

Please generate the following content in JSON format:
1. astronomy_myth: Astronomical and mythological background (150-200 words)
2. psychology: Jungian psychology interpretation (200-300 words)
3. shadow: Shadow qualities and manifestations (100-150 words)
4. integration: How to integrate the energy (150-200 words)
5. deep_dive: 8 in-depth interpretation steps, each containing:
   - step: Step number (1-8)
   - title: Step title
   - description: Detailed explanation (100-200 words, supports Markdown)
6. life_areas: At least 2 life domains, each containing:
   - area: career | love | health | finance | family | spiritual
   - description: Impact description (40-60 words)
7. growth_path: Growth path guidance (80-120 words)
8. practical_tips: 3-5 practical tips (string array)
9. common_misconceptions: 2-3 common misconceptions (string array)
10. affirmation: 1 positive affirmation (15-30 words)

**Format Requirements:**
- Output in JSON format only, without any extra text
- deep_dive array must contain exactly 8 steps
- life_areas must include at least 2 entries with allowed area values
- Descriptions can use **bold** for emphasis
- Each step should be progressive, from basic concepts to practical integration`;
}

export function buildAspectPrompt(vars: any, lang: 'zh' | 'en'): string {
  if (lang === 'zh') {
    return `你是一位专业的心理占星师，擅长将占星学与荣格心理学结合。
请针对【${vars.zh_name}】进行深入的 8 步骤分析。

**相位基础信息：**
- 中文名：${vars.zh_name}
- 英文名：${vars.en_name}
- 符号：${vars.symbol}
- 角度：${vars.angle}°
- 容许度：${vars.orb}°
- 性质：${vars.nature}
- 核心关键词：${vars.keywords}

**特殊侧重点：**
${vars.focus_points}

**阴影表现：**
${vars.shadow_focus}

**整合方向：**
${vars.integration_focus}

**实用建议：**
${vars.growth_lessons}

请生成以下内容（JSON 格式）：
1. astronomy_myth：天文与神话背景（150-200 字）
2. psychology：荣格心理学视角解读（200-300 字）
3. shadow：阴影特质与表现（100-150 字）
4. integration：如何整合能量（150-200 字）
5. deep_dive：8 个深度解读步骤，每步包含：
   - step: 步骤序号（1-8）
   - title: 步骤标题
   - description: 详细说明（100-200 字，支持 Markdown）
6. life_areas：至少 2 条生活领域影响，数组元素包含：
   - area: career | love | health | finance | family | spiritual
   - description: 描述该领域的影响（50-80 字）
7. growth_path：成长路径建议（100-150 字）
8. practical_tips：3-5 条实用小贴士（字符串数组）
9. common_misconceptions：2-3 条常见误解澄清（字符串数组）
10. affirmation：1 条正向肯定语（30-60 字）

**格式要求：**
- 使用标准 JSON 格式输出，不要包含任何额外文字
- deep_dive 是对象数组（不是嵌套数组），结构如下：
  \`\`\`json
  "deep_dive": [{"step": 1, "title": "标题", "description": "描述"}, ...]
  \`\`\`
- deep_dive 数组必须包含恰好 8 个步骤对象
- life_areas 至少 2 条且 area 必须为指定枚举
- 不要在 JSON 中使用中文引号，只使用英文双引号 "
- 描述中可以包含 **粗体** 强调重点
- 每个步骤应循序渐进，从基础概念到实践整合`;
  }
  return `You are a professional psychological astrologer who specializes in combining astrology with Jungian psychology.
Please provide an in-depth 8-step analysis of 【${vars.en_name}】.

**Aspect Basic Info:**
- Chinese Name: ${vars.zh_name}
- English Name: ${vars.en_name}
- Symbol: ${vars.symbol}
- Angle: ${vars.angle}°
- Orb: ${vars.orb}°
- Nature: ${vars.nature}
- Core Keywords: ${vars.keywords}

**Special Focus Points:**
${vars.focus_points}

**Shadow Manifestations:**
${vars.shadow_focus}

**Integration Direction:**
${vars.integration_focus}

**Practical Advice:**
${vars.growth_lessons}

Please generate the following content in JSON format:
1. astronomy_myth: Astronomical and mythological background (150-200 words)
2. psychology: Jungian psychology interpretation (200-300 words)
3. shadow: Shadow qualities and manifestations (100-150 words)
4. integration: How to integrate the energy (150-200 words)
5. deep_dive: 8 in-depth interpretation steps, each containing:
   - step: Step number (1-8)
   - title: Step title
   - description: Detailed explanation (100-200 words, supports Markdown)
6. life_areas: At least 2 life domains, each containing:
   - area: career | love | health | finance | family | spiritual
   - description: Impact description (40-60 words)
7. growth_path: Growth path guidance (80-120 words)
8. practical_tips: 3-5 practical tips (string array)
9. common_misconceptions: 2-3 common misconceptions (string array)
10. affirmation: 1 positive affirmation (15-30 words)

**Format Requirements:**
- Output in JSON format only, without any extra text
- deep_dive array must contain exactly 8 steps
- life_areas must include at least 2 entries with allowed area values
- Descriptions can use **bold** for emphasis
- Each step should be progressive, from basic concepts to practical integration`;
}

export function buildElementPrompt(vars: any, lang: 'zh' | 'en'): string {
  if (lang === 'zh') {
    return `你是一位专业的心理占星师，擅长将占星学与荣格心理学结合。
请针对【${vars.zh_name}】进行深入的 8 步骤分析。

**元素基础信息：**
- 名称：${vars.zh_name} (${vars.en_name})
- 符号：${vars.symbol}
- 代表星座：${vars.representing_signs}
- 荣格功能：${vars.jungian_function}
- 能量表现：${vars.energy_manifestation}

**特殊侧重点：**
${vars.focus_points}

**阴影表现：**
${vars.shadow_focus}

**整合方向：**
${vars.integration_focus}

**发展建议：**
${vars.growth_lessons}

请生成以下内容（JSON 格式）：
1. astronomy_myth：天文与神话背景（150-200 字）
2. psychology：荣格心理学视角解读（200-300 字）
3. shadow：阴影特质与表现（100-150 字）
4. integration：如何整合能量（150-200 字）
5. deep_dive：8 个深度解读步骤，每步包含：
   - step: 步骤序号（1-8）
   - title: 步骤标题
   - description: 详细说明（100-200 字，支持 Markdown）
6. life_areas：至少 2 条生活领域影响，数组元素包含：
   - area: career | love | health | finance | family | spiritual
   - description: 描述该领域的影响（50-80 字）
7. growth_path：成长路径建议（100-150 字）
8. practical_tips：3-5 条实用小贴士（字符串数组）
9. common_misconceptions：2-3 条常见误解澄清（字符串数组）
10. affirmation：1 条正向肯定语（30-60 字）

**格式要求：**
- 使用标准 JSON 格式输出，不要包含任何额外文字
- deep_dive 是对象数组（不是嵌套数组），结构如下：
  \`\`\`json
  "deep_dive": [{"step": 1, "title": "标题", "description": "描述"}, ...]
  \`\`\`
- deep_dive 数组必须包含恰好 8 个步骤对象
- life_areas 至少 2 条且 area 必须为指定枚举
- 不要在 JSON 中使用中文引号，只使用英文双引号 "
- 描述中可以包含 **粗体** 强调重点
- 每个步骤应循序渐进，从基础概念到实践整合`;
  }
  return `You are a professional psychological astrologer who specializes in combining astrology with Jungian psychology.
Please provide an in-depth 8-step analysis of 【${vars.en_name}】.

**Element Basic Info:**
- Name: ${vars.zh_name} (${vars.en_name})
- Symbol: ${vars.symbol}
- Representing Signs: ${vars.representing_signs}
- Jungian Function: ${vars.jungian_function}
- Energy Manifestation: ${vars.energy_manifestation}

**Special Focus Points:**
${vars.focus_points}

**Shadow Manifestations:**
${vars.shadow_focus}

**Integration Direction:**
${vars.integration_focus}

**Development Suggestions:**
${vars.growth_lessons}

Please generate the following content in JSON format:
1. astronomy_myth: Astronomical and mythological background (150-200 words)
2. psychology: Jungian psychology interpretation (200-300 words)
3. shadow: Shadow qualities and manifestations (100-150 words)
4. integration: How to integrate the energy (150-200 words)
5. deep_dive: 8 in-depth interpretation steps, each containing:
   - step: Step number (1-8)
   - title: Step title
   - description: Detailed explanation (100-200 words, supports Markdown)
6. life_areas: At least 2 life domains, each containing:
   - area: career | love | health | finance | family | spiritual
   - description: Impact description (40-60 words)
7. growth_path: Growth path guidance (80-120 words)
8. practical_tips: 3-5 practical tips (string array)
9. common_misconceptions: 2-3 common misconceptions (string array)
10. affirmation: 1 positive affirmation (15-30 words)

**Format Requirements:**
- Output in JSON format only, without any extra text
- deep_dive array must contain exactly 8 steps
- life_areas must include at least 2 entries with allowed area values
- Descriptions can use **bold** for emphasis
- Each step should be progressive, from basic concepts to practical integration`;
}

export function buildModePrompt(vars: any, lang: 'zh' | 'en'): string {
  if (lang === 'zh') {
    return `你是一位专业的心理占星师，擅长将占星学与荣格心理学结合。
请针对【${vars.zh_name}】进行深入的 8 步骤分析。

**模式基础信息：**
- 名称：${vars.zh_name} (${vars.en_name})
- 符号：${vars.symbol}
- 代表星座：${vars.representing_signs}
- 季节位置：${vars.seasonal_position}
- 能量特点：${vars.energy_traits}

**特殊侧重点：**
${vars.focus_points}

**阴影表现：**
${vars.shadow_focus}

**整合方向：**
${vars.integration_focus}

**发展建议：**
${vars.growth_lessons}

请生成以下内容（JSON 格式）：
1. astronomy_myth：天文与神话背景（150-200 字）
2. psychology：荣格心理学视角解读（200-300 字）
3. shadow：阴影特质与表现（100-150 字）
4. integration：如何整合能量（150-200 字）
5. deep_dive：8 个深度解读步骤，每步包含：
   - step: 步骤序号（1-8）
   - title: 步骤标题
   - description: 详细说明（100-200 字，支持 Markdown）
6. life_areas：至少 2 条生活领域影响，数组元素包含：
   - area: career | love | health | finance | family | spiritual
   - description: 描述该领域的影响（50-80 字）
7. growth_path：成长路径建议（100-150 字）
8. practical_tips：3-5 条实用小贴士（字符串数组）
9. common_misconceptions：2-3 条常见误解澄清（字符串数组）
10. affirmation：1 条正向肯定语（30-60 字）

**格式要求：**
- 使用标准 JSON 格式输出，不要包含任何额外文字
- deep_dive 是对象数组（不是嵌套数组），结构如下：
  \`\`\`json
  "deep_dive": [{"step": 1, "title": "标题", "description": "描述"}, ...]
  \`\`\`
- deep_dive 数组必须包含恰好 8 个步骤对象
- life_areas 至少 2 条且 area 必须为指定枚举
- 不要在 JSON 中使用中文引号，只使用英文双引号 "
- 描述中可以包含 **粗体** 强调重点
- 每个步骤应循序渐进，从基础概念到实践整合`;
  }
  return `You are a professional psychological astrologer who specializes in combining astrology with Jungian psychology.
Please provide an in-depth 8-step analysis of 【${vars.en_name}】.

**Mode Basic Info:**
- Name: ${vars.zh_name} (${vars.en_name})
- Symbol: ${vars.symbol}
- Representing Signs: ${vars.representing_signs}
- Seasonal Position: ${vars.seasonal_position}
- Energy Traits: ${vars.energy_traits}

**Special Focus Points:**
${vars.focus_points}

**Shadow Manifestations:**
${vars.shadow_focus}

**Integration Direction:**
${vars.integration_focus}

**Development Suggestions:**
${vars.growth_lessons}

Please generate the following content in JSON format:
1. astronomy_myth: Astronomical and mythological background (150-200 words)
2. psychology: Jungian psychology interpretation (200-300 words)
3. shadow: Shadow qualities and manifestations (100-150 words)
4. integration: How to integrate the energy (150-200 words)
5. deep_dive: 8 in-depth interpretation steps, each containing:
   - step: Step number (1-8)
   - title: Step title
   - description: Detailed explanation (100-200 words, supports Markdown)
6. life_areas: At least 2 life domains, each containing:
   - area: career | love | health | finance | family | spiritual
   - description: Impact description (40-60 words)
7. growth_path: Growth path guidance (80-120 words)
8. practical_tips: 3-5 practical tips (string array)
9. common_misconceptions: 2-3 common misconceptions (string array)
10. affirmation: 1 positive affirmation (15-30 words)

**Format Requirements:**
- Output in JSON format only, without any extra text
- deep_dive array must contain exactly 8 steps
- life_areas must include at least 2 entries with allowed area values
- Descriptions can use **bold** for emphasis
- Each step should be progressive, from basic concepts to practical integration`;
}
