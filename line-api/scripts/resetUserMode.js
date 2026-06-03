/**
 * ユーザーの対応モードを AIモードへリセットするスクリプト
 *
 * 用途:
 *   スタッフが LINE OA Manager から手動対応したあと、
 *   そのユーザーを再び「AI対応中」に戻したいときに使う。
 *
 *   ※ LINE OA Manager からスタッフが送る「#ai」などのメッセージは
 *     webhook に届かないため、コマンドでのリセットができません。
 *     このスクリプトで Redis の状態を直接リセットします。
 *
 * 実行方法（line-api/ ディレクトリで）:
 *   node scripts/resetUserMode.js <LINE_USER_ID>
 *
 *   例:
 *   node scripts/resetUserMode.js U78ace7b8f704a83ac28b0acf8068d7c1
 *
 * 引数を省略すると、対象ユーザーIDの入力を促します。
 *
 * 前提:
 *   .env に UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN が設定されていること。
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Redis } = require('@upstash/redis');

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('❌ 使い方: node scripts/resetUserMode.js <LINE_USER_ID>');
    console.error('   例:    node scripts/resetUserMode.js U78ace7b8f704a83ac28b0acf8068d7c1');
    process.exit(1);
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('❌ UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN が未設定です。');
    process.exit(1);
  }

  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const key      = `user:${userId}`;
  const existing = (await redis.get(key)) ?? {};

  console.log('🔍 現在の状態:', JSON.stringify(existing));

  // モードを 'ai' に戻し、問診状態もリセットする
  await redis.set(key, {
    ...existing,
    mode:           'ai',
    inquiryStep:    0,
    inquiryAnswers: {},
    lastMessageAt:  new Date().toISOString(),
  }, { ex: 86400 });

  console.log(`✅ ${userId} を AIモードにリセットしました。`);
  console.log('   ユーザーが「簡単AI診断」を押すと問診が始まります。');
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
