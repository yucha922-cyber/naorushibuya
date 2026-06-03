/**
 * ユーザーの「予約確定」フラグを設定/解除するスクリプト
 *
 * 用途:
 *   予約が確定したユーザーを「予約確定」状態にすると、
 *   そのユーザーには AI が自動返信しなくなり（スタッフ対応のまま）、
 *   有人モードの自動復帰（HUMAN_AUTO_REVERT_HOURS）も無効になる。
 *
 *   → リマインド連絡への「ありがとうございます」等に
 *     AIが不自然に反応してしまうのを防げる。
 *
 * 実行方法（line-api/ ディレクトリで）:
 *   予約確定にする:  node scripts/setReserved.js <LINE_USER_ID> on
 *   解除する:        node scripts/setReserved.js <LINE_USER_ID> off
 *
 *   例:
 *   node scripts/setReserved.js U78ace7b8f704a83ac28b0acf8068d7c1 on
 *
 *   ※ 解除は「#ai」をスタッフが送る方法でも可能です。
 *
 * 前提:
 *   .env に UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN が設定されていること。
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Redis } = require('@upstash/redis');

async function main() {
  const userId = process.argv[2];
  const flag   = (process.argv[3] || 'on').toLowerCase();

  if (!userId || !['on', 'off'].includes(flag)) {
    console.error('❌ 使い方: node scripts/setReserved.js <LINE_USER_ID> <on|off>');
    console.error('   例:    node scripts/setReserved.js U78ace7b8f704a83ac28b0acf8068d7c1 on');
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
  const reserved = flag === 'on';

  console.log('🔍 現在の状態:', JSON.stringify(existing));

  await redis.set(key, {
    ...existing,
    reserved,
    // 予約確定にするときは有人対応のまま固定（AIを起動しない）
    ...(reserved ? { mode: 'human' } : {}),
    lastMessageAt: new Date().toISOString(),
  }, { ex: 86400 });

  if (reserved) {
    console.log(`✅ ${userId} を「予約確定」にしました（AIは起動しません）。`);
  } else {
    console.log(`✅ ${userId} の「予約確定」を解除しました。`);
    console.log('   AIに戻すには #ai を送るか resetUserMode スクリプトを実行してください。');
  }
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
