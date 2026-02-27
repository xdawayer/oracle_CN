// MySQL database abstraction layer (replaces Supabase)
import mysql, { Pool, PoolOptions, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
];
envPaths.forEach((p) => dotenv.config({ path: p }));

// ============================================
// 连接池配置
// ============================================

const poolConfig: PoolOptions = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'oracle_cn',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // JSON 字段自动反序列化
  typeCast: function (field: { type: string; string: () => string | null }, next: () => unknown) {
    if (field.type === 'JSON') {
      const val = field.string();
      if (val === null) return null;
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return next();
  },
};

let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
  }
  return pool;
}

// ============================================
// 数据库配置检查
// ============================================

export function isDatabaseConfigured(): boolean {
  return !!(
    process.env.MYSQL_HOST &&
    process.env.MYSQL_DATABASE
  );
}

// ============================================
// ISO 日期 → MySQL DATETIME 格式转换
// ============================================

/** 将 ISO 8601 字符串转为 MySQL DATETIME 格式：'2026-03-06T15:23:08.871Z' → '2026-03-06 15:23:08.871' */
function toMySQLDatetime(value: string): string {
  return value.replace('T', ' ').replace('Z', '');
}

/** ISO 日期字符串正则：匹配 YYYY-MM-DDTHH:mm:ss 格式 */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/** 序列化值：JSON 对象转字符串，ISO 日期转 MySQL 格式 */
function serializeValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return toMySQLDatetime(v.toISOString());
  if (typeof v === 'string' && ISO_DATE_RE.test(v)) return toMySQLDatetime(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

// ============================================
// 通用查询方法
// ============================================

/** 执行任意 SQL，返回行数组 */
export async function query<T = RowDataPacket>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await getPool().execute<RowDataPacket[]>(sql, params as (string | number | boolean | null | Buffer)[]);
  return rows as T[];
}

/** 查询单行，无结果返回 null */
export async function getOne<T = RowDataPacket>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** 插入一行，返回插入后的完整行（通过 SELECT 回读） */
export async function insert<T = RowDataPacket>(
  table: string,
  data: Record<string, unknown>
): Promise<T> {
  // 自动生成 id（如果调用方未提供）
  if (!('id' in data) || data.id === undefined) {
    data = { id: uuidv4(), ...data };
  }
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => serializeValue(data[k]));

  const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
  await getPool().execute(sql, values as (string | number | boolean | null | Buffer)[]);

  // 回读刚插入的行（通过 id 字段）
  if ('id' in data) {
    const row = await getOne<T>(`SELECT * FROM \`${table}\` WHERE id = ?`, [data.id]);
    if (row) return row;
  }

  // 如果没有 id 或回读失败，返回原始数据
  return data as unknown as T;
}

/** 更新行，返回受影响行数 */
export async function update(
  table: string,
  data: Record<string, unknown>,
  where: string,
  whereParams: unknown[]
): Promise<number> {
  const keys = Object.keys(data);
  const setClauses = keys.map(k => `\`${k}\` = ?`).join(', ');
  const values = keys.map(k => serializeValue(data[k]));

  const sql = `UPDATE \`${table}\` SET ${setClauses} WHERE ${where}`;
  const [result] = await getPool().execute<ResultSetHeader>(sql, [...values, ...whereParams] as (string | number | boolean | null | Buffer)[]);
  return result.affectedRows;
}

/** 更新行并返回更新后的完整行 */
export async function updateAndReturn<T = RowDataPacket>(
  table: string,
  data: Record<string, unknown>,
  where: string,
  whereParams: unknown[]
): Promise<T | null> {
  await update(table, data, where, whereParams);
  const row = await getOne<T>(`SELECT * FROM \`${table}\` WHERE ${where}`, whereParams);
  return row;
}

/** 删除行，返回受影响行数 */
export async function remove(
  table: string,
  where: string,
  whereParams: unknown[]
): Promise<number> {
  const sql = `DELETE FROM \`${table}\` WHERE ${where}`;
  const [result] = await getPool().execute<ResultSetHeader>(sql, whereParams as (string | number | boolean | null | Buffer)[]);
  return result.affectedRows;
}

/** Upsert: INSERT ... ON DUPLICATE KEY UPDATE */
export async function upsert<T = RowDataPacket>(
  table: string,
  data: Record<string, unknown>,
  updateFields?: string[]
): Promise<T> {
  // 自动生成 id（如果调用方未提供）
  if (!('id' in data) || data.id === undefined) {
    data = { id: uuidv4(), ...data };
  }
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => serializeValue(data[k]));

  // 默认更新所有非 id 字段
  const fieldsToUpdate = updateFields || keys.filter(k => k !== 'id');
  const updateClauses = fieldsToUpdate.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');

  const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClauses}`;
  await getPool().execute(sql, values as (string | number | boolean | null | Buffer)[]);

  // 回读行
  if ('id' in data) {
    const row = await getOne<T>(`SELECT * FROM \`${table}\` WHERE id = ?`, [data.id]);
    if (row) return row;
  }

  return data as unknown as T;
}

/** 检查是否为重复键错误（MySQL errno 1062） */
export function isDuplicateKeyError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'errno' in error) {
    return (error as { errno: number }).errno === 1062;
  }
  return false;
}

// ============================================
// 类型定义（从 supabase.ts 迁移）
// ============================================

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: 'google' | 'apple' | 'email' | 'wechat';
  provider_id: string | null;
  password_hash: string | null;
  wechat_openid?: string | null;
  wechat_unionid?: string | null;
  wechat_session_key?: string | null;
  birth_profile: BirthProfile | null;
  preferences: UserPreferences;
  email_verified: boolean;
  trial_ends_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BirthProfile {
  birthDate: string;
  birthTime?: string;
  birthCity: string;
  lat?: number;
  lon?: number;
  timezone: string;
  accuracyLevel: 'exact' | 'time_unknown' | 'approximate';
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  language: 'zh' | 'en';
}

export interface DbSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_price_id: string | null;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'past_due' | 'expired' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  usage: SubscriptionUsage;
  payment_channel: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
  synastryReads: number;
  monthlyReportClaimed: boolean;
}

export interface DbPurchase {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  product_type: 'ask' | 'detail_pack' | 'synastry' | 'cbt_analysis' | 'report';
  product_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  quantity: number;
  consumed: number;
  created_at: string;
}

export interface DbReport {
  id: string;
  user_id: string;
  report_type: string;
  title: string | null;
  content: Record<string, unknown> | null;
  pdf_url: string | null;
  birth_profile: BirthProfile | null;
  partner_profile: BirthProfile | null;
  generated_at: string;
  created_at: string;
}

export interface DbFreeUsage {
  id: string;
  user_id: string | null;
  device_fingerprint: string | null;
  ip_address: string | null;
  ask_used: number;
  ask_reset_at: string | null;
  detail_used: number;
  synastry_used: number;
  synastry_total_used: number;
  synthetica_used: number;
  synthetica_reset_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PurchaseScope = 'permanent' | 'daily' | 'per_synastry' | 'per_month' | 'consumable';

export interface DbPurchaseRecord {
  id: string;
  user_id: string;
  feature_type: string;
  feature_id: string | null;
  scope: PurchaseScope;
  price_cents: number;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  valid_until: string | null;
  quantity: number;
  consumed: number;
  created_at: string;
}

export interface DbSynastryRecord {
  id: string;
  user_id: string;
  synastry_hash: string;
  person_a_info: SynastryPersonInfo;
  person_b_info: SynastryPersonInfo;
  relationship_type: string | null;
  is_free: boolean;
  created_at: string;
}

export interface SynastryPersonInfo {
  name: string;
  birthDate: string;
  birthTime?: string;
  birthCity: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface DbSubscriptionUsage {
  id: string;
  user_id: string;
  week_start: string;
  ask_used: number;
  synastry_used: number;
  created_at: string;
  updated_at: string;
}
