const { google } = require('googleapis');

let _sheetsClient = null;

function getSheets() {
  if (_sheetsClient) return _sheetsClient;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 未設定');

  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

const sheetId = () => {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('GOOGLE_SHEET_ID 未設定');
  return id;
};

/**
 * 在指定 sheet 末尾追加一行
 * @param {string} sheetName - Sheet 分頁名稱
 * @param {Array} values - 欄位值陣列
 */
async function appendRow(sheetName, values) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId(),
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

/**
 * 取得指定 sheet 所有資料列
 * @param {string} sheetName - Sheet 分頁名稱
 * @returns {Array<Array>} 二維陣列
 */
async function getRows(sheetName) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${sheetName}!A:Z`,
  });
  return res.data.values || [];
}

/**
 * 更新指定 sheet 的單一儲存格
 * @param {string} sheetName
 * @param {number} rowIndex - 0-based row index
 * @param {number} colIndex - 0-based column index
 * @param {*} value
 */
async function updateCell(sheetName, rowIndex, colIndex, value) {
  const sheets = getSheets();
  const col = String.fromCharCode(65 + colIndex); // 0 -> A, 1 -> B ...
  const row = rowIndex + 1; // 轉為 1-based
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${sheetName}!${col}${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

// 快取各分頁的 integer sheetId（不是 spreadsheetId）
let _sheetTabIds = null;

async function getSheetTabId(sheetName) {
  if (!_sheetTabIds) {
    const sheets = getSheets();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId() });
    _sheetTabIds = {};
    meta.data.sheets.forEach(s => {
      _sheetTabIds[s.properties.title] = s.properties.sheetId;
    });
  }
  if (_sheetTabIds[sheetName] === undefined) {
    throw new Error(`找不到分頁：${sheetName}`);
  }
  return _sheetTabIds[sheetName];
}

/**
 * 刪除指定 sheet 的一整行
 * @param {string} sheetName
 * @param {number} rowIndex - 0-based row index
 */
async function deleteRow(sheetName, rowIndex) {
  const sheets   = getSheets();
  const tabId    = await getSheetTabId(sheetName);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId:    tabId,
            dimension:  'ROWS',
            startIndex: rowIndex,      // 0-based inclusive
            endIndex:   rowIndex + 1,  // 0-based exclusive
          },
        },
      }],
    },
  });
}

module.exports = { appendRow, getRows, updateCell, deleteRow };
