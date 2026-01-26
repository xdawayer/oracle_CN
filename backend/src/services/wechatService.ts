import { WECHAT_CONFIG } from '../config/auth.js';

interface WechatCode2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

class WechatService {
  async code2Session(code: string): Promise<{ openid: string; sessionKey: string; unionid?: string }> {
    if (!WECHAT_CONFIG.APP_ID || !WECHAT_CONFIG.APP_SECRET) {
      throw new Error('WeChat config not set');
    }

    const params = new URLSearchParams({
      appid: WECHAT_CONFIG.APP_ID,
      secret: WECHAT_CONFIG.APP_SECRET,
      js_code: code,
      grant_type: 'authorization_code',
    });

    const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`WeChat API request failed: ${response.status}`);
    }

    const data = (await response.json()) as WechatCode2SessionResponse;

    if (data.errcode) {
      throw new Error(`WeChat API error ${data.errcode}: ${data.errmsg || 'unknown'}`);
    }

    if (!data.openid || !data.session_key) {
      throw new Error('WeChat API response missing openid or session_key');
    }

    return {
      openid: data.openid,
      sessionKey: data.session_key,
      unionid: data.unionid,
    };
  }
}

export const wechatService = new WechatService();
export default wechatService;
