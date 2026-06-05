/**
 * AI問診ステップ管理（NAORU整体向け 10ステップ）
 *
 *   step 0     : 未開始
 *   step 1〜9  : 各質問を待っている状態
 *   step 10    : Q10「AI分析中」メッセージを送信 → サマリー生成
 *   step 11以上: 完了
 */

const QUESTIONS = [
  {
    step:  1,
    key:   'fullName',
    label: 'お名前',
    text:  'Q1. お名前（フルネーム）を教えてください。',
  },
  {
    step:  2,
    key:   'symptom',
    label: '症状',
    text:  'Q2. 現在一番気になる症状は何ですか？\n\n① 肩こり・首こり\n② 頭痛\n③ 腰痛\n④ 坐骨神経痛\n⑤ 膝痛\n⑥ 姿勢が気になる\n⑦ 自律神経の乱れ\n⑧ その他\n\n番号またはそのままお答えください。',
  },
  {
    step:  3,
    key:   'symptomDuration',
    label: '症状期間',
    text:  'Q3. その症状はいつ頃からありますか？\n\n① 1週間以内\n② 1か月以内\n③ 3か月以上\n④ 半年以上\n⑤ 1年以上\n\n番号またはそのままお答えください。',
  },
  {
    step:  4,
    key:   'deskWorkRaw',
    label: 'デスクワーク',
    text:  'Q4. お仕事はデスクワーク中心ですか？\n\n① はい\n② いいえ\n\n番号またはそのままお答えください。',
  },
  {
    step:  5,
    key:   'sleepRaw',
    label: '睡眠時間',
    text:  'Q5. 1日の平均睡眠時間は？\n\n① 4時間未満\n② 4〜6時間\n③ 6〜8時間\n④ 8時間以上\n\n番号またはそのままお答えください。',
  },
  {
    step:  6,
    key:   'pain',
    label: '痛みレベル',
    text:  'Q6. 現在の痛みを0〜10で教えてください。\n\n0 = 痛みなし　10 = 激痛\n\n数字1つでお答えください。',
  },
  {
    step:  7,
    key:   'hospital',
    label: '受診歴',
    text:  'Q7. 過去に病院・整形外科・整骨院・整体などに通いましたか？\n\n① はい\n② いいえ\n\n番号またはそのままお答えください。',
  },
  {
    step:  8,
    key:   'stress',
    label: 'ストレスレベル',
    text:  'Q8. 現在のストレスを0〜10で表すと？\n\n0 = ほぼない　10 = 非常に高い\n\n数字1つでお答えください。',
  },
  {
    step:  9,
    key:   'exercise',
    label: '運動習慣',
    text:  'Q9. 運動習慣はありますか？\n\n① 週3回以上\n② 週1〜2回\n③ ほぼしない\n\n番号またはそのままお答えください。',
  },
];

// Q10 は「AI分析開始」メッセージを送るだけ（質問なし）
const ANALYSIS_STEP = 10;

function getQuestion(step) {
  return QUESTIONS.find((q) => q.step === step) ?? null;
}

// step 10 = 分析メッセージ送信、step 11以上 = 完了
function isAnalysisStep(step) {
  return step === ANALYSIS_STEP;
}

function isCompleted(step) {
  return step > ANALYSIS_STEP;
}

/**
 * 回答オブジェクトを読みやすい文字列に変換する（問診内容列・AI送信用）
 */
function formatAnswers(answers) {
  return QUESTIONS.map((q) => `${q.label}: ${answers[q.key] ?? '未回答'}`).join('\n');
}

module.exports = { QUESTIONS, ANALYSIS_STEP, getQuestion, isAnalysisStep, isCompleted, formatAnswers };
