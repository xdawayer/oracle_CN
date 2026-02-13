import { WECHAT_CONFIG } from '../config/auth.js';
import https from 'https';
import http from 'http';

interface WechatCode2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

class WechatService {
  private readonly timeoutMs: number = (() => {
    const value = Number(process.env.WECHAT_API_TIMEOUT_MS);
    return Number.isFinite(value) && value > 0 ? value : 8000;
  })();

  private formatNetworkError(error: unknown): string {
    const err = error as {
      message?: string;
      code?: string;
      errno?: string | number;
      cause?: { code?: string; errno?: string | number; message?: string };
    };
    const message = err?.message || 'unknown network error';
    const code = err?.code || err?.cause?.code;
    const errno = err?.errno || err?.cause?.errno;
    const causeMessage = err?.cause?.message;
    const suffixParts = [code, errno, causeMessage].filter(Boolean).map((part) => String(part));
    return suffixParts.length > 0 ? `${message} (${suffixParts.join(', ')})` : message;
  }

  private httpGetJson<T>(url: string): Promise<{ statusCode: number; data: T }> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const transport = isHttps ? https : http;
      const req = transport.request(
        {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: `${parsed.pathname}${parsed.search}`,
          method: 'GET',
          family: 4,
          timeout: this.timeoutMs,
          headers: {
            Accept: 'application/json',
          },
        },
        (res) => {
          let raw = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            raw += chunk;
          });
          res.on('end', () => {
            const statusCode = res.statusCode || 0;
            try {
              const data = JSON.parse(raw) as T;
              resolve({ statusCode, data });
            } catch {
              reject(new Error(`WeChat API returned non-JSON response: ${raw.slice(0, 200)}`));
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error(`Request timeout after ${this.timeoutMs}ms`));
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

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

    let statusCode = 0;
    let data: WechatCode2SessionResponse;
    try {
      // 微信云托管内部设置 WECHAT_API_BASE_URL=http://api.weixin.qq.com 走内网
      // 本地开发默认走 HTTPS 公网
      const wechatApiBase = process.env.WECHAT_API_BASE_URL || 'https://api.weixin.qq.com';
      const result = await this.httpGetJson<WechatCode2SessionResponse>(
        `${wechatApiBase}/sns/jscode2session?${params.toString()}`
      );
      statusCode = result.statusCode;
      data = result.data;
    } catch (error) {
      throw new Error(`WeChat API network error: ${this.formatNetworkError(error)}`);
    }

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`WeChat API request failed: ${statusCode}`);
    }

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
