/**
 * スプレッドシート初期セットアップ（一度だけ実行）
 *
 * 役割:
 *   CRM 2シート構成のヘッダー行を自動で作成する。
 *   - 患者マスター（1患者1行・upsert）
 *   - 対応履歴（全ログ・append）
 *
 * 実行方法（line-api/ ディレクトリで）:
 *   node scripts/setupSheets.js
 *
 * 前提:
 *   .env に SPREADSHEET_ID と認証情報（GOOGLE_CREDENTIALS_PATH か
 *   GOOGLE_CREDENTIALS_JSON）が設定されていること。
 *
 * 注意:
 *   スプレッドシートに「患者マスター」「対応履歴」という名前の
 *   シート(タブ)を事前に作成しておいてください。
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { google } = require('googleapis');
const path       = require('path');
const { PATIENT_COLUMNS } = require('../utils/sheets');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function getSheets() {
  let auth;
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_CREDENTIALS_PATH
        ? path.resolve(process.env.GOOGLE_CREDENTIALS_PATH)
        : path.resolve(__dirname, '../credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

async function main() {
  if (!SPREADSHEET_ID) {
    console.error('❌ SPREADSHEET_ID が未設定です。');
    process.exit(1);
  }

  const sheets = await getSheets();

  // 患者マスターのヘッダー（utils/sheets.js の定義から自動生成）
  const patientHeaders = PATIENT_COLUMNS.map((c) => c.header);

  // 対応履歴のヘッダー
  const historyHeaders = ['日時', 'LINE User ID', 'LINE表示名', 'イベント種別', '内容'];

  console.log('📋 患者マスターのヘッダーを設定中...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: '患者マスター!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [patientHeaders] },
  });
  console.log('✅ 患者マスター:', patientHeaders.join(' / '));

  console.log('📋 対応履歴のヘッダーを設定中...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: '対応履歴!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [historyHeaders] },
  });
  console.log('✅ 対応履歴:', historyHeaders.join(' / '));

  console.log('\n🎉 セットアップ完了！');
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  console.error('   「患者マスター」「対応履歴」シートが存在するか確認してください。');
  process.exit(1);
});
