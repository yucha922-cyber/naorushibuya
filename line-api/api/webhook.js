const express = require('express');
const line = require('@line/bot-sdk');
const { appendToSheet } = require('../utils/sheets');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const RESERVE_URL = 'https://reserve.naoru.info/';
const TEL = '070-8519-6347';

const client = new line.Client(config);
const app = express();

app.get('/api/webhook', (_req, res) => {
  res.status(200).send('NAORU LINE webhook is running.');
});

app.post('/api/webhook', line.middleware(config), async (req, res) => {
  try {
    await Promise.all((req.body.events || []).map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

const symptomQuickReply = {
  items: [
    { type: 'action', action: { type: 'message', label: '肩こり', text: '肩こり' } },
    { type: 'action', action: { type: 'message', label: '腰痛', text: '腰痛' } },
    { type: 'action', action: { type: 'message', label: '頭痛', text: '頭痛' } },
    { type: 'action', action: { type: 'message', label: '姿勢改善', text: '姿勢改善' } },
    { type: 'action', action: { type: 'message', label: '予約したい', text: '予約' } },
  ],
};

function reply(token, text, withQuickReply = false) {
  const message = { type: 'text', text };
  if (withQuickReply) message.quickReply = symptomQuickReply;
  return client.replyMessage(token, message);
}

/**
 * スプレッドシートへの保存をバックグラウンドで実行する
 * 保存失敗でもLINE返信は止めないようにエラーを握りつぶす
 *
 * ※ OpenAI 問診へ拡張する際は、ここで AI の分析結果を inquiry に含めるか、
 *    appendToSheet の params に新しいフィールドを追加してください。
 */
function saveToSheet(params) {
  appendToSheet(params).catch((err) => {
    console.error('[webhook] スプレッドシートへの保存に失敗しました:', err.message);
  });
}

/**
 * LINEユーザーの表示名を取得する
 * グループ・ルームでは取得できないため、失敗時は '不明' を返す
 */
async function getDisplayName(userId) {
  if (!userId) return '不明';
  try {
    const profile = await client.getProfile(userId);
    return profile.displayName;
  } catch {
    return '不明';
  }
}

async function handleEvent(event) {
  // フォロー（友だち追加）イベント
  if (event.type === 'follow') {
    const displayName = await getDisplayName(event.source?.userId);

    // スプレッドシートに友だち追加を記録
    saveToSheet({
      displayName,
      symptom: '（友だち追加）',
      inquiry: '',
      reservationStatus: '未予約',
    });

    return reply(
      event.replyToken,
      'NAORU整体 渋谷院です。\n友だち追加ありがとうございます！\n\n現在気になっているお悩みを選んでください。AI姿勢分析で原因を可視化し、根本改善をご提案します。',
      true,
    );
  }

  // テキストメッセージ以外は無視
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const text = event.message.text;
  const displayName = await getDisplayName(event.source?.userId);

  // ---- 症状・問い合わせ別のハンドリング --------------------------------

  if (text.includes('肩こり')) {
    saveToSheet({ displayName, symptom: '肩こり', inquiry: text, reservationStatus: '未予約' });
    return reply(
      event.replyToken,
      '肩こりですね。デスクワーク中心の生活ですか？\n\nNAORU整体では、AI姿勢分析で原因を可視化し、根本改善を目指します。\n初回限定3,500円（通常13,200円）でお試しいただけます。\n\n▼ご予約\n' + RESERVE_URL,
    );
  }

  if (text.includes('腰痛')) {
    saveToSheet({ displayName, symptom: '腰痛', inquiry: text, reservationStatus: '未予約' });
    return reply(
      event.replyToken,
      '腰痛ですね。立っている時と座っている時、どちらがつらいですか？\n\n姿勢の歪みが原因のことが多く、AI姿勢分析で数値化して確認できます。\n\n▼ご予約\n' + RESERVE_URL,
    );
  }

  if (text.includes('頭痛')) {
    saveToSheet({ displayName, symptom: '頭痛', inquiry: text, reservationStatus: '未予約' });
    return reply(
      event.replyToken,
      '頭痛ですね。首・肩こりからくる緊張型頭痛の可能性があります。\n一度AI姿勢分析で全身のバランスをチェックされることをおすすめします。\n\n▼ご予約\n' + RESERVE_URL,
    );
  }

  if (text.includes('姿勢') || text.includes('猫背') || text.includes('スマホ首')) {
    saveToSheet({ displayName, symptom: '姿勢改善', inquiry: text, reservationStatus: '未予約' });
    return reply(
      event.replyToken,
      '姿勢改善ご希望ですね。\nAI姿勢分析で現在の姿勢を数値化し、ビフォーアフターでご確認いただけます。\n\n▼ご予約\n' + RESERVE_URL,
    );
  }

  if (text.includes('予約') || text.includes('よやく')) {
    saveToSheet({ displayName, symptom: '予約希望', inquiry: text, reservationStatus: '予約希望' });
    return reply(
      event.replyToken,
      'ご予約はこちらから承っております。\n\n▼Web予約\n' + RESERVE_URL + '\n\n▼お電話\n' + TEL + '\n\n初回限定3,500円キャンペーン実施中です。',
    );
  }

  if (text.includes('料金') || text.includes('値段') || text.includes('価格')) {
    saveToSheet({ displayName, symptom: '料金問い合わせ', inquiry: text, reservationStatus: '未予約' });
    return reply(
      event.replyToken,
      '初回限定 3,500円（通常 13,200円・税込）\nAI姿勢分析つき・所要約60分\n\n▼ご予約\n' + RESERVE_URL,
    );
  }

  if (text.includes('場所') || text.includes('アクセス') || text.includes('住所')) {
    saveToSheet({ displayName, symptom: 'アクセス問い合わせ', inquiry: text, reservationStatus: '未予約' });
    return reply(
      event.replyToken,
      'NAORU整体 渋谷院\n渋谷駅から徒歩圏内です。\n詳しいアクセスはLPをご覧ください。\n\nお電話：' + TEL,
    );
  }

  // どのキーワードにも該当しない場合（その他）
  saveToSheet({ displayName, symptom: 'その他', inquiry: text, reservationStatus: '未予約' });
  return reply(
    event.replyToken,
    'お問い合わせありがとうございます。\n下記から該当するお悩みを選んでいただくと、詳しい情報をお送りします。\n\nお急ぎの方はお電話（' + TEL + '）またはWeb予約（' + RESERVE_URL + '）をご利用ください。',
    true,
  );
}

module.exports = app;
