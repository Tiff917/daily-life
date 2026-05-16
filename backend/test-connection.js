// test-connection.js — 測試 Google Sheets 連線
// 執行方式: node test-connection.js
require('dotenv').config();
const { getRows, appendRow } = require('./lib/sheets');

async function test() {
  console.log('\n🍵 Daily NPC Mode — 連線測試\n');

  // 確認環境變數
  if (!process.env.GOOGLE_SHEET_ID) {
    console.error('❌ GOOGLE_SHEET_ID 未設定，請檢查 .env');
    process.exit(1);
  }
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY 未設定，請檢查 .env');
    process.exit(1);
  }

  console.log('📋 Sheet ID:', process.env.GOOGLE_SHEET_ID);
  console.log('🔑 Service Account:', JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY).client_email);
  console.log('');

  // 測試讀取三個分頁
  const sheets = ['Expenses', 'Tasks', 'Inspiration'];
  for (const name of sheets) {
    try {
      const rows = await getRows(name);
      console.log(`✅ ${name}: 讀取成功，共 ${rows.length} 筆資料`);
    } catch (err) {
      console.error(`❌ ${name}: 讀取失敗 → ${err.message}`);
      if (err.message.includes('403')) {
        console.error('   ⚠️  權限不足！請把試算表共用給 Service Account Email（Editor 權限）');
      }
      if (err.message.includes('404')) {
        console.error(`   ⚠️  找不到分頁「${name}」！請在試算表新增這個分頁`);
      }
    }
  }

  console.log('\n📝 測試寫入一筆 Tasks 資料...');
  try {
    await appendRow('Tasks', [new Date().toISOString(), '🧪 連線測試用任務', 'FALSE']);
    console.log('✅ 寫入成功！去試算表確認看看');
  } catch (err) {
    console.error('❌ 寫入失敗:', err.message);
  }

  console.log('\n🎉 測試完成！如果都是 ✅ 就可以啟動後端了\n');
}

test().catch(console.error);
