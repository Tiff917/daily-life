// 執行這個腳本來複製 icon 檔案
// node copy-icons.js
const fs = require('fs');
const path = require('path');

const src = path.join(
  'C:\\Users\\Xiao\\.gemini\\antigravity\\brain\\980bf62c-c4f6-41c6-8ed7-8d6ce134346f',
  'npc_icon_1778910169892.png'
);
const dest192 = path.join(__dirname, '..', 'frontend', 'icon-192.png');
const dest512 = path.join(__dirname, '..', 'frontend', 'icon-512.png');

fs.copyFileSync(src, dest192);
fs.copyFileSync(src, dest512);
console.log('✅ Icons copied!');
