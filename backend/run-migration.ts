// 运行数据库迁移脚本
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration(migrationFile: string) {
  console.log(`\n📄 执行迁移: ${migrationFile}`);

  const migrationPath = path.join(__dirname, '../migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ 迁移文件不存在: ${migrationPath}`);
    return false;
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // 如果 exec_sql 函数不存在，尝试直接执行
      console.log('⚠️  exec_sql 函数不可用，请手动在 Supabase SQL 编辑器中执行以下 SQL：');
      console.log('\n' + '='.repeat(80));
      console.log(sql);
      console.log('='.repeat(80) + '\n');
      return false;
    }

    console.log('✅ 迁移执行成功');
    return true;
  } catch (err) {
    console.error('❌ 迁移执行失败:', err);
    console.log('\n请手动在 Supabase SQL 编辑器中执行以下 SQL：');
    console.log('\n' + '='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80) + '\n');
    return false;
  }
}

async function main() {
  console.log('🚀 开始执行数据库迁移...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

  // 执行 002 迁移（添加 user_id 列）
  await runMigration('002_update_free_usage_synthetica.sql');

  console.log('\n✨ 迁移流程完成');
  console.log('\n💡 如果上面显示需要手动执行，请：');
  console.log('   1. 访问 Supabase Dashboard: https://supabase.com/dashboard');
  console.log('   2. 选择你的项目');
  console.log('   3. 进入 SQL Editor');
  console.log('   4. 复制上面的 SQL 语句并执行');
}

main().catch(console.error);
