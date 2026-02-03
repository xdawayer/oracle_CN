// 微信内容安全服务
// 用于对 AI 生成内容进行安全审核，符合微信小程序审核要求

// 占星领域敏感词替换表
const SENSITIVE_WORD_MAP: Record<string, string> = {
  '算命': '星象分析',
  '命运': '人生趋势',
  '迷信': '传统文化',
  '封建迷信': '古代天文学',
  '鬼神': '宇宙能量',
  '天命': '星象趋势',
  '宿命': '发展方向',
  '前世': '过往经历',
  '来世': '未来发展',
  '转世': '人生转变',
  '灵魂': '内在自我',
  '通灵': '自我觉察',
  '驱邪': '自我调节',
  '风水': '环境影响',
  '法术': '心理技巧',
  '巫术': '古代仪式',
  '占卜': '趋势分析',
  '卦象': '象征分析',
  '神谕': '象征启示',
  '预言': '趋势分析',
  '死亡': '重大转折',
  '大凶': '需要注意',
  '血光之灾': '健康提醒',
  '破财': '财务波动',
  '桃花劫': '感情变化',
};

// 高风险关键词（出现则需要整体审查）
const HIGH_RISK_KEYWORDS = [
  '自杀', '自残', '暴力', '色情', '赌博',
  '毒品', '反动', '邪教', '传销',
];

/**
 * 替换占星领域敏感词
 */
export function replaceSensitiveWords(content: string): string {
  let result = content;
  for (const [sensitive, replacement] of Object.entries(SENSITIVE_WORD_MAP)) {
    result = result.replaceAll(sensitive, replacement);
  }
  return result;
}

/**
 * 检查是否包含高风险关键词
 */
export function containsHighRiskContent(content: string): boolean {
  return HIGH_RISK_KEYWORDS.some(keyword => content.includes(keyword));
}

/**
 * 获取微信 access_token（用于调用内容安全 API）
 * 带缓存，有效期内不重复请求
 */
let _accessTokenCache: { token: string; expiresAt: number } | null = null;

async function getWxAccessToken(): Promise<string | null> {
  // 缓存命中且未过期（提前 5 分钟刷新）
  if (_accessTokenCache && Date.now() < _accessTokenCache.expiresAt - 300_000) {
    return _accessTokenCache.token;
  }

  const appId = process.env.WECHAT_APPID;
  const appSecret = process.env.WECHAT_APPSECRET;
  if (!appId || !appSecret) return null;

  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
    );
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (data.access_token) {
      _accessTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
      };
      return data.access_token;
    }
    return null;
  } catch {
    console.error('[content-security] 获取 access_token 失败');
    return null;
  }
}

/**
 * 调用微信 msgSecCheck 接口检查文本安全
 * 返回 true 表示内容安全，false 表示内容不安全
 */
export async function checkTextSecurity(content: string, openid?: string): Promise<boolean> {
  const accessToken = await getWxAccessToken();
  if (!accessToken) {
    // 无法获取 token 时，仅做本地敏感词检查
    return !containsHighRiskContent(content);
  }

  try {
    const response = await fetch(
      `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 2,
          scene: 1, // 资料：1，评论：2，论坛：3
          openid: openid || '',
          content,
        }),
      }
    );
    const data = await response.json() as { errcode?: number; result?: { suggest?: string } };

    if (data.errcode !== 0) {
      console.warn('[content-security] msgSecCheck 返回错误:', data.errcode);
      return !containsHighRiskContent(content);
    }

    // suggest: "pass" | "review" | "risky"
    return data.result?.suggest === 'pass';
  } catch (error) {
    console.error('[content-security] msgSecCheck 调用失败:', error);
    return !containsHighRiskContent(content);
  }
}

/**
 * 对 AI 生成内容进行安全处理
 * 1. 替换占星领域敏感词
 * 2. 检查高风险内容
 * 3. 可选：调用微信内容安全 API
 */
export async function sanitizeAIContent(content: string, options?: { openid?: string; callWxApi?: boolean }): Promise<{ safe: boolean; content: string }> {
  // 步骤1：替换敏感词
  let sanitized = replaceSensitiveWords(content);

  // 步骤2：检查高风险内容
  if (containsHighRiskContent(sanitized)) {
    console.warn('[content-security] 检测到高风险内容，返回通用内容');
    return {
      safe: false,
      content: '根据星象分析，当前阶段适合自我反思与内在成长。建议关注自身的身心健康，保持积极乐观的心态，在日常生活中寻找平衡与和谐。',
    };
  }

  // 步骤3：可选调用微信 API
  if (options?.callWxApi) {
    const isSafe = await checkTextSecurity(sanitized, options.openid);
    if (!isSafe) {
      console.warn('[content-security] 微信内容安全检查未通过');
      return {
        safe: false,
        content: '根据星象分析，当前阶段适合自我反思与内在成长。建议关注自身的身心健康，保持积极乐观的心态，在日常生活中寻找平衡与和谐。',
      };
    }
  }

  return { safe: true, content: sanitized };
}
