// 微信支付服务
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { wxpayConfig, isWxPayConfigured, generateNonceStr, generateOrderId, VIP_PLANS, POINTS_PACKAGES } from '../config/wxpay.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';

interface CreateOrderParams {
  userId: string;
  orderType: 'subscription' | 'points';
  plan?: 'monthly' | 'quarterly' | 'yearly';
  amount?: number; // 积分数
  totalFee?: number; // 支付金额（分）
}

interface PayParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

interface WxPayOrder {
  orderId: string;
  userId: string;
  orderType: 'subscription' | 'points';
  plan?: string;
  pointsAmount?: number;
  totalFee: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'refund_failed' | 'closed';
  transactionId?: string;
  createdAt: Date;
  paidAt?: Date;
}

// 内存缓存（加速查询，DB 为权威数据源，最多保留 500 条，LRU 淘汰）
const ORDER_CACHE_MAX = 500;
const orderCache = new Map<string, WxPayOrder>();

function orderCacheSet(key: string, value: WxPayOrder) {
  if (orderCache.size >= ORDER_CACHE_MAX) {
    // 删除最早插入的条目（Map 保持插入顺序）
    const firstKey = orderCache.keys().next().value;
    if (firstKey) orderCache.delete(firstKey);
  }
  orderCache.set(key, value);
}

// RSA-SHA256 签名
function signWithRSA(message: string): string {
  if (!wxpayConfig.privateKey) return '';
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(wxpayConfig.privateKey, 'base64');
}

// 生成微信支付 V3 Authorization 头
function getAuthorizationHeader(method: string, url: string, body: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = signWithRSA(message);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${wxpayConfig.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${wxpayConfig.serialNo}",signature="${signature}"`;
}

// 微信支付 API 通用请求函数（含指数退避重试）
async function wxpayRequest<T = Record<string, unknown>>(
  method: 'GET' | 'POST',
  urlPath: string,
  body?: string,
): Promise<{ ok: boolean; status: number; data: T }> {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const authorization = getAuthorizationHeader(method, urlPath, body || '');
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Authorization': authorization,
    };
    if (body) headers['Content-Type'] = 'application/json';

    try {
      const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
        method,
        headers,
        ...(body ? { body } : {}),
      });

      // 4xx 错误不重试，直接返回
      if (response.status >= 400 && response.status < 500) {
        const data = await response.json() as T;
        return { ok: false, status: response.status, data };
      }

      // 5xx 错误触发重试
      if (response.status >= 500) {
        if (attempt < MAX_RETRIES) {
          console.warn(`[wxpay] API ${urlPath} 返回 ${response.status}，${RETRY_DELAYS[attempt]}ms 后重试 (${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
          continue;
        }
        const data = await response.json().catch(() => ({}) as T);
        return { ok: false, status: response.status, data };
      }

      const data = await response.json().catch(() => ({}) as T);
      return { ok: true, status: response.status, data };
    } catch (error) {
      // 网络错误触发重试
      if (attempt < MAX_RETRIES) {
        console.warn(`[wxpay] API ${urlPath} 网络错误，${RETRY_DELAYS[attempt]}ms 后重试 (${attempt + 1}/${MAX_RETRIES}):`, error);
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw error;
    }
  }

  // 不应到达此处，但 TypeScript 需要返回值
  throw new Error(`[wxpay] API ${urlPath} 重试 ${MAX_RETRIES} 次后仍失败`);
}

// 统一下单（JSAPI）
async function createPrepayOrder(description: string, outTradeNo: string, totalFee: number, openid: string): Promise<string | null> {
  if (!isWxPayConfigured()) return null;

  const url = '/v3/pay/transactions/jsapi';
  const body = JSON.stringify({
    appid: wxpayConfig.appId,
    mchid: wxpayConfig.mchId,
    description,
    out_trade_no: outTradeNo,
    notify_url: wxpayConfig.notifyUrl,
    amount: { total: totalFee, currency: 'CNY' },
    payer: { openid },
  });

  try {
    const result = await wxpayRequest<{ prepay_id?: string }>(
      'POST', url, body,
    );
    return result.data.prepay_id || null;
  } catch (error) {
    console.error('微信支付统一下单失败:', error);
    return null;
  }
}

// 生成前端支付参数
function generatePayParams(prepayId: string): PayParams {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  const pkg = `prepay_id=${prepayId}`;
  const message = `${wxpayConfig.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  const paySign = signWithRSA(message);

  return {
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'RSA',
    paySign,
  };
}

// 平台证书缓存（serial -> PEM 公钥）及过期管理
const platformCertCache = new Map<string, string>();
let platformCertCacheTime = 0;
const CERT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时
const CERTS_DIR = path.resolve(process.cwd(), 'certs');

// 下载并缓存微信支付平台证书
async function fetchPlatformCertificates(): Promise<void> {
  if (!isWxPayConfigured()) return;

  const url = '/v3/certificates';

  try {
    const result = await wxpayRequest<{
      data?: Array<{
        serial_no: string;
        encrypt_certificate: { ciphertext: string; nonce: string; associated_data: string };
      }>;
    }>('GET', url);

    if (!result.data.data) {
      console.error('[wxpay] 下载平台证书失败: 响应格式错误');
      return;
    }

    const certs = result.data.data!;

    for (const cert of certs) {
      // 平台证书密文解密后是 PEM 字符串（非 JSON），直接手动 AES-256-GCM 解密
      try {
        const key = Buffer.from(wxpayConfig.apiKeyV3);
        const iv = Buffer.from(cert.encrypt_certificate.nonce);
        const aad = Buffer.from(cert.encrypt_certificate.associated_data);
        const ciphertextBuf = Buffer.from(cert.encrypt_certificate.ciphertext, 'base64');
        const authTag = ciphertextBuf.subarray(ciphertextBuf.length - 16);
        const encData = ciphertextBuf.subarray(0, ciphertextBuf.length - 16);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        decipher.setAAD(aad);
        const pemBuffer = Buffer.concat([decipher.update(encData), decipher.final()]);
        const pem = pemBuffer.toString('utf8');

        platformCertCache.set(cert.serial_no, pem);
        platformCertCacheTime = Date.now();

        // 持久化到本地文件
        try {
          if (!fs.existsSync(CERTS_DIR)) {
            fs.mkdirSync(CERTS_DIR, { recursive: true });
          }
          fs.writeFileSync(path.join(CERTS_DIR, `wechatpay_${cert.serial_no}.pem`), pem, 'utf8');
        } catch { /* 写入失败不影响主流程 */ }

        console.log(`[wxpay] 平台证书已缓存: serial=${cert.serial_no}`);
      } catch (certError) {
        console.error(`[wxpay] 解密平台证书失败: serial=${cert.serial_no}`, certError);
      }
    }
  } catch (error) {
    console.error('[wxpay] 下载平台证书失败:', error);
  }
}

// 获取平台证书公钥
async function getPlatformCertPem(serial: string): Promise<string | null> {
  // 缓存过期时重新下载
  if (platformCertCacheTime > 0 && Date.now() - platformCertCacheTime > CERT_CACHE_TTL) {
    platformCertCache.clear();
    platformCertCacheTime = 0;
    await fetchPlatformCertificates();
  }

  // 先查内存缓存
  if (platformCertCache.has(serial)) {
    return platformCertCache.get(serial)!;
  }

  // 尝试从本地文件加载
  const certPath = path.join(CERTS_DIR, `wechatpay_${serial}.pem`);
  try {
    if (fs.existsSync(certPath)) {
      const pem = fs.readFileSync(certPath, 'utf8');
      platformCertCache.set(serial, pem);
      platformCertCacheTime = Date.now();
      return pem;
    }
  } catch { /* ignore */ }

  // 从微信 API 下载
  await fetchPlatformCertificates();
  return platformCertCache.get(serial) || null;
}

// 验证回调签名（完整 RSA-SHA256 验签）
async function verifyNotifySignature(timestamp: string, nonce: string, body: string, signature: string, serial: string): Promise<boolean> {
  if (!timestamp || !nonce || !body || !signature) return false;

  if (isWxPayConfigured()) {
    const certPem = await getPlatformCertPem(serial);
    if (!certPem) {
      console.error(`[wxpay] 未找到平台证书: serial=${serial}`);
      return false;
    }

    try {
      const message = `${timestamp}\n${nonce}\n${body}\n`;
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(message);
      const isValid = verify.verify(certPem, signature, 'base64');

      if (!isValid) {
        console.error('[wxpay] 回调签名验证失败');
      }
      return isValid;
    } catch (error) {
      console.error('[wxpay] 验签异常:', error);
      return false;
    }
  }

  // 开发模式跳过验签
  return true;
}

// 解密回调通知数据
function decryptNotifyData(ciphertext: string, nonce: string, associatedData: string): Record<string, unknown> | null {
  if (!wxpayConfig.apiKeyV3) return null;
  try {
    const key = Buffer.from(wxpayConfig.apiKeyV3);
    const iv = Buffer.from(nonce);
    const aad = Buffer.from(associatedData);
    const ciphertextBuf = Buffer.from(ciphertext, 'base64');
    const authTag = ciphertextBuf.subarray(ciphertextBuf.length - 16);
    const data = ciphertextBuf.subarray(0, ciphertextBuf.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(aad);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.error('解密回调数据失败:', error);
    return null;
  }
}

// 持久化订单到数据库
async function saveOrderToDB(order: WxPayOrder): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('wxpay_orders').upsert({
      order_id: order.orderId,
      user_id: order.userId,
      order_type: order.orderType,
      plan: order.plan || null,
      points_amount: order.pointsAmount || null,
      total_fee: order.totalFee,
      status: order.status,
      transaction_id: order.transactionId || null,
      created_at: order.createdAt.toISOString(),
      paid_at: order.paidAt?.toISOString() || null,
    }, { onConflict: 'order_id' });
  } catch (err) {
    console.error('保存订单到数据库失败:', err);
  }
}

// 从数据库加载订单
async function loadOrderFromDB(orderId: string): Promise<WxPayOrder | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase
      .from('wxpay_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();
    if (!data) return null;
    return {
      orderId: data.order_id,
      userId: data.user_id,
      orderType: data.order_type,
      plan: data.plan || undefined,
      pointsAmount: data.points_amount || undefined,
      totalFee: data.total_fee,
      status: data.status,
      transactionId: data.transaction_id || undefined,
      createdAt: new Date(data.created_at),
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
    };
  } catch {
    return null;
  }
}

// 获取用户 openid
async function getUserOpenid(userId: string): Promise<string> {
  if (!isSupabaseConfigured()) return 'dev_openid';
  try {
    const { data } = await supabase
      .from('users')
      .select('wechat_openid')
      .eq('id', userId)
      .single();
    return data?.wechat_openid || '';
  } catch {
    return '';
  }
}

const wxpayService = {
  getUserOpenid,

  // 创建订单
  async createOrder(params: CreateOrderParams): Promise<{ orderId: string; payParams: PayParams } | null> {
    const { userId, orderType, plan, amount, totalFee } = params;

    let description = '';
    let fee = 0;
    let orderId = '';
    let pointsAmount = 0;

    if (orderType === 'subscription') {
      if (!plan || !(plan in VIP_PLANS)) return null;
      const planConfig = VIP_PLANS[plan];
      description = `星智 ${planConfig.label}`;
      fee = planConfig.price;
      orderId = generateOrderId('VIP');
    } else if (orderType === 'points') {
      if (!amount || !totalFee) return null;
      const pkg = POINTS_PACKAGES.find(p => p.amount === amount);
      if (!pkg || pkg.price !== totalFee) return null;
      description = `星智积分充值 ${amount} 积分`;
      fee = totalFee;
      orderId = generateOrderId('PTS');
      pointsAmount = amount;
    } else {
      return null;
    }

    // 获取用户 openid
    const openid = await getUserOpenid(userId);

    // 创建订单记录
    const order: WxPayOrder = {
      orderId,
      userId,
      orderType,
      plan,
      pointsAmount: pointsAmount || undefined,
      totalFee: fee,
      status: 'pending',
      createdAt: new Date(),
    };

    // 持久化到数据库和缓存
    orderCacheSet(orderId, order);
    await saveOrderToDB(order);

    // 调用微信支付统一下单
    const prepayId = await createPrepayOrder(description, orderId, fee, openid);
    if (!prepayId) {
      // 开发模式：返回模拟支付参数
      if (!isWxPayConfigured()) {
        return {
          orderId,
          payParams: {
            timeStamp: Math.floor(Date.now() / 1000).toString(),
            nonceStr: generateNonceStr(),
            package: 'prepay_id=dev_mock',
            signType: 'RSA',
            paySign: 'dev_mock_sign',
          },
        };
      }
      return null;
    }

    const payParams = generatePayParams(prepayId);
    return { orderId, payParams };
  },

  // 处理支付回调
  async handleNotify(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
    serial: string
  ): Promise<{ success: boolean; orderId?: string; order?: WxPayOrder }> {
    // 验证签名
    if (!(await verifyNotifySignature(timestamp, nonce, body, signature, serial))) {
      return { success: false };
    }

    let bodyObj: Record<string, unknown>;
    try {
      bodyObj = JSON.parse(body);
    } catch {
      console.error('[wxpay] 回调 body 解析失败');
      return { success: false };
    }
    const resource = bodyObj.resource as Record<string, string> | undefined;
    if (!resource) return { success: false };

    const decrypted = decryptNotifyData(resource.ciphertext, resource.nonce, resource.associated_data);
    if (!decrypted) return { success: false };

    const outTradeNo = decrypted.out_trade_no as string;
    const tradeState = decrypted.trade_state as string;

    // 先查缓存，再查数据库
    let order = orderCache.get(outTradeNo) || await loadOrderFromDB(outTradeNo);
    if (!order) return { success: false };

    // 幂等处理
    if (order.status === 'paid') {
      return { success: true, orderId: outTradeNo, order };
    }

    if (tradeState === 'SUCCESS') {
      order.status = 'paid';
      order.transactionId = decrypted.transaction_id as string;
      order.paidAt = new Date();
    } else {
      order.status = 'failed';
    }

    // 更新缓存和数据库
    orderCacheSet(outTradeNo, order);
    await saveOrderToDB(order);

    if (order.status === 'paid') {
      return { success: true, orderId: outTradeNo, order };
    }
    return { success: false, orderId: outTradeNo };
  },

  // 查询订单（缓存 + DB）
  async getOrder(orderId: string): Promise<WxPayOrder | undefined> {
    return orderCache.get(orderId) || await loadOrderFromDB(orderId) || undefined;
  },

  // 申请退款
  async refundOrder(orderId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const order = orderCache.get(orderId) || await loadOrderFromDB(orderId);
    if (!order) return { success: false, message: '订单不存在' };
    if (order.userId !== userId) return { success: false, message: '无权操作' };
    if (order.status !== 'paid') return { success: false, message: '订单状态不支持退款' };

    // 检查退款时间限制（7天内）
    const daysSincePaid = order.paidAt
      ? (Date.now() - order.paidAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (order.orderType === 'subscription' && daysSincePaid > 7) {
      return { success: false, message: 'VIP 订阅仅支持购买后 7 天内退款' };
    }

    // 计算退款金额
    let refundAmount = order.totalFee;
    if (order.orderType === 'subscription' && order.plan) {
      // VIP 按剩余天数比例退
      const planDays = order.plan === 'monthly' ? 30 : order.plan === 'quarterly' ? 90 : 365;
      const remainingDays = Math.max(0, planDays - Math.ceil(daysSincePaid));
      refundAmount = Math.floor(order.totalFee * (remainingDays / planDays));
    }
    // 积分退款：需要检查未使用积分（交由调用方处理）

    if (refundAmount <= 0) {
      return { success: false, message: '退款金额为0，无法退款' };
    }

    if (isWxPayConfigured() && order.transactionId) {
      // 调用微信退款 API
      const refundNo = generateOrderId('REF');
      const url = '/v3/refund/domestic/refunds';
      const refundNotifyUrl = wxpayConfig.notifyUrl.replace(/\/notify$/, '/refund-notify');
      const body = JSON.stringify({
        transaction_id: order.transactionId,
        out_refund_no: refundNo,
        reason: '用户申请退款',
        notify_url: refundNotifyUrl,
        amount: {
          refund: refundAmount,
          total: order.totalFee,
          currency: 'CNY',
        },
      });

      try {
        const result = await wxpayRequest<{ status?: string; code?: string; message?: string }>(
          'POST', url, body,
        );
        if (result.data.status === 'SUCCESS' || result.data.status === 'PROCESSING') {
          // 不立即更新状态为 refunded，等待退款回调确认后再更新
          // 退款是异步的，PROCESSING 表示退款进行中
          return { success: true, message: `退款 ¥${(refundAmount / 100).toFixed(2)} 已提交，请等待退款到账` };
        }
        return { success: false, message: result.data.message || '微信退款失败' };
      } catch (error) {
        console.error('微信退款 API 调用失败:', error);
        return { success: false, message: '退款服务暂不可用' };
      }
    }

    // 开发模式：直接标记退款
    order.status = 'refunded' as WxPayOrder['status'];
    orderCacheSet(orderId, order);
    await saveOrderToDB(order);
    return { success: true, message: `退款 ¥${(refundAmount / 100).toFixed(2)} 已处理（开发模式）` };
  },

  // 获取用户订单列表
  async getUserOrders(userId: string): Promise<WxPayOrder[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('wxpay_orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        return (data || []).map((item: Record<string, unknown>) => ({
          orderId: item.order_id as string,
          userId: item.user_id as string,
          orderType: item.order_type as 'subscription' | 'points',
          plan: (item.plan as string) || undefined,
          pointsAmount: (item.points_amount as number) || undefined,
          totalFee: item.total_fee as number,
          status: item.status as WxPayOrder['status'],
          transactionId: (item.transaction_id as string) || undefined,
          createdAt: new Date(item.created_at as string),
          paidAt: item.paid_at ? new Date(item.paid_at as string) : undefined,
        }));
      } catch {
        return [];
      }
    }

    // 开发模式：从缓存获取
    return Array.from(orderCache.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // 开发模式：模拟支付成功
  async devConfirmOrder(orderId: string): Promise<WxPayOrder | null> {
    let order = orderCache.get(orderId) || await loadOrderFromDB(orderId);
    if (!order || order.status === 'paid') return order || null;
    order.status = 'paid';
    order.paidAt = new Date();
    order.transactionId = `dev_tx_${Date.now()}`;
    orderCacheSet(orderId, order);
    await saveOrderToDB(order);
    return order;
  },

  // 处理退款结果通知回调
  async handleRefundNotify(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
    serial: string
  ): Promise<{ success: boolean; orderId?: string; order?: WxPayOrder; refundStatus?: string }> {
    if (!(await verifyNotifySignature(timestamp, nonce, body, signature, serial))) {
      return { success: false };
    }

    let bodyObj: Record<string, unknown>;
    try {
      bodyObj = JSON.parse(body);
    } catch {
      console.error('[wxpay] 退款回调 body 解析失败');
      return { success: false };
    }

    const resource = bodyObj.resource as Record<string, string> | undefined;
    if (!resource) return { success: false };

    const decrypted = decryptNotifyData(resource.ciphertext, resource.nonce, resource.associated_data);
    if (!decrypted) return { success: false };

    const outTradeNo = decrypted.out_trade_no as string;
    const refundStatus = decrypted.refund_status as string;

    let order = orderCache.get(outTradeNo) || await loadOrderFromDB(outTradeNo);
    if (!order) return { success: false };

    // 幂等处理
    if (order.status === 'refunded' || order.status === 'refund_failed') {
      return { success: true, orderId: outTradeNo, order, refundStatus };
    }

    if (refundStatus === 'SUCCESS') {
      order.status = 'refunded';
    } else {
      order.status = 'refund_failed';
      console.warn(`[wxpay] 退款失败: orderId=${outTradeNo}, status=${refundStatus}, reason=${decrypted.user_received_account || 'unknown'}`);
    }

    orderCacheSet(outTradeNo, order);
    await saveOrderToDB(order);

    return { success: true, orderId: outTradeNo, order, refundStatus };
  },

  // 主动查询微信订单状态
  async queryWxPayOrder(outTradeNo: string): Promise<{ success: boolean; tradeState?: string; order?: WxPayOrder }> {
    let order = orderCache.get(outTradeNo) || await loadOrderFromDB(outTradeNo);
    if (!order) return { success: false };

    if (!isWxPayConfigured()) {
      return { success: true, tradeState: order.status === 'paid' ? 'SUCCESS' : 'NOTPAY', order };
    }

    const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${wxpayConfig.mchId}`;
    try {
      const result = await wxpayRequest<{ trade_state?: string; transaction_id?: string }>('GET', url);
      const tradeState = result.data.trade_state;

      // 微信已支付但本地仍为 pending，自动修正
      if (tradeState === 'SUCCESS' && order.status === 'pending') {
        order.status = 'paid';
        order.transactionId = result.data.transaction_id as string;
        order.paidAt = new Date();
        orderCacheSet(outTradeNo, order);
        await saveOrderToDB(order);
      }

      return { success: true, tradeState, order };
    } catch (error) {
      console.error(`[wxpay] 查询订单失败: ${outTradeNo}`, error);
      return { success: false };
    }
  },

  // 关闭超时未支付订单
  async closeExpiredOrders(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    try {
      const { data: pendingOrders } = await supabase
        .from('wxpay_orders')
        .select('order_id')
        .eq('status', 'pending')
        .lt('created_at', thirtyMinAgo)
        .limit(50);

      if (!pendingOrders || pendingOrders.length === 0) return 0;

      let closedCount = 0;
      for (const row of pendingOrders) {
        const orderId = row.order_id as string;
        try {
          // 先查询微信确认订单确实未支付
          const queryResult = await this.queryWxPayOrder(orderId);
          if (queryResult.tradeState === 'SUCCESS') {
            // 已支付，queryWxPayOrder 已自动修正状态
            continue;
          }

          // 调用微信关闭订单 API
          if (isWxPayConfigured()) {
            const url = `/v3/pay/transactions/out-trade-no/${orderId}/close`;
            const body = JSON.stringify({ mchid: wxpayConfig.mchId });
            await wxpayRequest('POST', url, body);
          }

          // 更新本地状态为 closed
          const order = orderCache.get(orderId) || await loadOrderFromDB(orderId);
          if (order && order.status === 'pending') {
            order.status = 'closed';
            orderCacheSet(orderId, order);
            await saveOrderToDB(order);
            closedCount++;
          }
        } catch (error) {
          console.error(`[wxpay] 关闭超时订单失败: ${orderId}`, error);
        }
      }

      if (closedCount > 0) {
        console.log(`[wxpay] 已关闭 ${closedCount} 笔超时订单`);
      }
      return closedCount;
    } catch (error) {
      console.error('[wxpay] 查询超时订单失败:', error);
      return 0;
    }
  },
};

export default wxpayService;
