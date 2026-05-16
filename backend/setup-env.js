// setup-env.js — 自動從 JSON 金鑰檔案建立 .env
// 使用方式: node setup-env.js "C:\路徑\到\你的key.json"
const fs = require('fs');
const path = require('path');

const keyFilePath = process.argv[2];

if (!keyFilePath) {
  console.error('❌ 請提供 JSON 金鑰路徑，例如:');
  console.error('   node setup-env.js "C:\\Users\\Xiao\\Downloads\\daily-496505-xxxxx.json"');
  process.exit(1);
}

if (!fs.existsSync(keyFilePath)) {
  console.error('❌ 找不到檔案:', keyFilePath);
  process.exit(1);
}

const keyJson = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
const keyOneLine = JSON.stringify(keyJson);

// 讀現有 .env
const envPath = path.join(__dirname, '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// 更新或加入 GOOGLE_SERVICE_ACCOUNT_KEY
if (envContent.includes('GOOGLE_SERVICE_ACCOUNT_KEY=')) {
  envContent = envContent.replace(
    /GOOGLE_SERVICE_ACCOUNT_KEY=.*/,
    `GOOGLE_SERVICE_ACCOUNT_KEY=${keyOneLine}`
  );
} else {
  envContent += `\nGOOGLE_SERVICE_ACCOUNT_KEY=${keyOneLine}\n`;
}

fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ .env 已更新！');
console.log('📧 Service Account Email:', keyJson.client_email);
console.log('');
console.log('⚠️  記得把這個 Email 加到試算表的共用名單（Editor 權限）：');
console.log('   ', keyJson.client_email);
console.log('');
console.log('接下來記得填好 GOOGLE_SHEET_ID 和 NEWS_API_KEY，然後跑:');
console.log('   node test-connection.js');
