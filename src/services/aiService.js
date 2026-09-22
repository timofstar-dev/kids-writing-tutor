import { GoogleGenAI } from '@google/genai';

/**
 * 7대 핵심 첨삭 기준:
 * 1. 문장의 뼈대가 되는 주술 호응관계 확인
 * 2. 반복되는 단어와 구절은 이제 그만!
 * 3. 일상에서 쓰는 말(구어체) vs 글에서 쓰는 문장(문어체)
 * 4. 문장에 주어와 목적어가 없어서 이해가 안돼요
 * 5. 헷갈리는 우리말 바로써요 (의/에, 돼/되, 안/않, 로서/로써, 다르다/틀리다, 가르치다/가리키다, 맞히다/맞추다, 띄다/띠다, 낫다/낳다, 이었다/이였다, 체하다/채하다, 같은/같이 띄어쓰기 등)
 * 6. 긴문장 자르기
 * 7. 띄어쓰기
 */

// 안정적인 3.x 모델 우선 순위 목록 (트래픽 폭주 시 자동 폴백)
const STABLE_MODELS_CASCADE = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash'
];

/**
 * 사용자 친화적인 한국어 에러 메시지로 정제
 */
function formatErrorMessage(err) {
  const errMsg = err?.message || String(err);
  
  if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
    return '현재 구글 AI 서버에 일시적인 접속 폭주(503)가 발생했습니다. 잠시 후(약 5~10초 뒤) 다시 시도해주시면 정상 작동합니다.';
  }
  if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
    return '단시간에 너무 많은 요청이 발생했습니다(429). 5초 정도 잠시 기다린 후 다시 눌러주세요.';
  }
  if (errMsg.includes('404') || errMsg.includes('not found')) {
    return '선택한 AI 모델을 사용할 수 없습니다. 상단 설정에서 최신 모델(Gemini 3.1 Flash Lite)로 변경해주세요.';
  }
  if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
    return 'Gemini API 키가 올바르지 않습니다. 상단 [키 등록 필요]에서 키를 다시 확인해주세요.';
  }
  if (errMsg.includes('JSON') || errMsg.includes('SyntaxError') || errMsg.includes('position') || errMsg.includes('non-whitespace character')) {
    return 'AI 응답 형식을 처리하는 중 일시적인 문자 오류가 발생했습니다. 상단의 [⚡ 안정적인 모델로 재시도] 또는 [첨삭 받기]를 한 번 더 눌러주세요.';
  }
  
  return errMsg;
}

/**
 * AI 응답 텍스트에서 순수한 JSON 객체를 정밀 추출하고 파싱
 * (Gemini가 JSON 본문 앞뒤에 마크다운이나 사족을 덧붙이는 현상을 100% 방어)
 */
function parseAiJsonResponse(rawText) {
  if (!rawText || !rawText.trim()) {
    throw new Error('AI 응답 내용이 비어 있습니다.');
  }

  let text = rawText.trim();

  // 1. 마크다운 코드 블록 표기 제거
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
  text = text.replace(/\s*```$/i, '');

  // 2. 가장 바깥쪽의 시작 중괄호 '{' 와 끝 중괄호 '}'를 찾아 그 사이의 순수 JSON만 슬라이스
  // (예: Unexpected non-whitespace character after JSON at position ... 방지)
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // 3. 1차 표준 JSON 파싱 시도
  try {
    return JSON.parse(text);
  } catch (err1) {
    // 4. 후행 쉼표(trailing comma: `,}` 또는 `,]`) 등 문법 결함 정제 후 2차 시도
    try {
      const sanitized = text
        .replace(/,\s*([}\]])/g, '$1') // trailing comma 제거
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, (ch) => {
          if (ch === '\n' || ch === '\r' || ch === '\t') return ch;
          return '';
        });
      return JSON.parse(sanitized);
    } catch (err2) {
      console.warn('JSON 정밀 파싱 실패, 원본 발췌:', text.slice(0, 300));
      throw new Error(`AI 응답 형식(JSON) 파싱 오류: ${err1.message}`);
    }
  }
}

export async function evaluateKidsEssay({ apiKey, essayText, grade = '초등 전학년', modelName = 'gemini-3.1-flash-lite' }) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API 키가 입력되지 않았습니다. 상단에서 API 키를 확인해주세요.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
당신은 대한민국 최고의 초등학교 국어 전문 교사이자 다정한 어린이 글쓰기 첨삭 선생님 '아이글쌤'입니다.
다음은 초등학생(${grade})이 작성한 글입니다:

[학생의 글]
"""
${essayText}
"""

어린이의 눈높이에 맞추어 친절하고 다정하며 격려 넘치는 말투(~해요, ~해보아요)로 다음 [7대 핵심 첨삭 기준]을 꼼꼼하게 점검하고 첨삭해주세요.

[7대 핵심 첨삭 기준]
1. 주술 호응 관계: 주어와 서술어가 자연스럽게 짝을 이루는지 확인 (예: '내 꿈은 의사가 되고 싶다' ➔ '내 꿈은 의사가 되는 것이다' 또는 '나는 의사가 되고 싶다')
2. 반복되는 단어와 구절 점검: '그리고', '그래서', '진짜', '너무' 등의 잦은 접속사와 단어 남발을 줄이고 다채로운 어휘/표현으로 대체
3. 구어체 vs 문어체: 일상 대화체나 유행어, 말줄임(엄청, 짱, ~했거든요, ~했슴, 근데, 되게)을 단정하고 바른 글말(매우, 무척, ~했습니다, 그런데)로 다듬기
4. 주어와 목적어 보충: 문장에서 '누가', '무엇을' 했는지 빠져서 읽는 사람이 어리둥절한 문장에 주어와 목적어를 명확히 채워주기
5. 헷갈리는 우리말 바로쓰기:
   - 의/에, 돼/되, 안/않, 로서/로써, 다르다/틀리다, 가르치다/가리키다, 맞히다/맞추다, 띄다/띠다, 낫다/낳다, 이었다/이였다, 체하다/채하다, 같은/같이 띄어쓰기 등 핵심 맞춤법 오류를 정확히 짚고 쉬운 공식 팁 전달
6. 긴 문장 자르기: 마침표 없이 접속어나 연결어미(~하고, ~했는데, ~해서)로 숨차게 길게 이어진 복합문을 2~3개의 깔끔한 단문으로 분할
7. 띄어쓰기: 조사 붙여쓰기, 의존명사(할 수 있다, 것 같다 등) 띄어쓰기를 규정에 맞게 바르게 교정

[★첨삭 개수 필수 지침 - 매우 중요★]:
- 글 전체를 문장별·어구별로 꼼꼼하게 살피고, 한 문장에 여러 문제가 있다면 각각의 교정 포인트별로 분리하여 다정하게 짚어주세요.
- **반드시 최소 5개 이상(권장 6개~10개 내외)**의 교정 카드를 'sentenceCorrections' 목록에 생성해야 합니다.
- 만약 문법적 오류가 5개 미만인 우수한 글이라도, 더 풍부하고 품격 있는 어휘 제안, 접속어 다듬기, 주어·목적어 보충, 문장 호흡 조절 등 글의 완성도를 높이는 발전 제안을 포함하여 **반드시 최소 5개 이상**을 채워주세요.

[반드시 준수할 출력 형식 (JSON 앞뒤에 마크다운이나 인사말 없이 오직 순수한 JSON만 출력)]:
{
  "stamp": "참 잘했어요" | "생각이 반짝여요" | "표현력이 쑥쑥" | "최고의 글솜씨",
  "score7": {
    "subjectPredicate": { "status": "좋아요" | "주의" | "고쳤어요", "comment": "주술 호응 한줄 코멘트" },
    "noRepetition": { "status": "좋아요" | "주의" | "고쳤어요", "comment": "반복 표현 한줄 코멘트" },
    "writtenStyle": { "status": "좋아요" | "주의" | "고쳤어요", "comment": "글말(문어체) 한줄 코멘트" },
    "subjectObject": { "status": "좋아요" | "주의" | "고쳤어요", "comment": "주어/목적어 한줄 코멘트" },
    "trickyKorean": { "status": "좋아요" | "주의" | "고쳤어요", "comment": "헷갈리는 우리말 한줄 코멘트" },
    "splitLongSentence": { "status": "좋아요" | "주의" | "고쳤어요", "comment": "긴 문장 자르기 한줄 코멘트" },
    "spacing": { "status": "좋아요" | "주의" | "고쳤어요", "comment": "띄어쓰기 한줄 코멘트" }
  },
  "overallPraise": "학생이 쓴 글의 기특한 점과 반짝이는 생각을 먼저 듬뿍 칭찬해주는 다정한 3~4문장 총평",
  "keyAdvice": "글쓰기 실력을 한 단계 더 높이기 위해 꼭 기억해야 할 핵심 꿀팁 1~2가지",
  "sentenceCorrections": [
    // ★필수: 최소 5개 이상(5~10개)의 첨삭 객체를 반드시 작성하세요★
    {
      "original": "학생이 쓴 원래 문장 (오류나 개선이 필요한 부분)",
      "corrected": "7대 기준에 맞춰 바르고 아름답게 다듬어진 모범 문장",
      "category": "주술 호응" | "반복 줄이기" | "구어체→문어체" | "주어/목적어 채우기" | "헷갈리는 우리말" | "긴 문장 자르기" | "띄어쓰기",
      "teacherTip": "어린이가 이해하기 쉬운 다정하고 명쾌한 첨삭 이유 및 꿀팁 (예: '돼/되'에는 '해/하'를 대입해보면 바로 알 수 있어요!)"
    }
  ],
  "finalPolishedEssay": "모든 문장이 7대 기준에 맞추어 매끄럽고 아름답게 교정된 학생 글의 최종 완성본"
}
`;

  // 요청 모델을 우선으로 하고, 오류 발생 시 대체 모델들로 순차적 자동 시도
  const modelsToTry = [modelName, ...STABLE_MODELS_CASCADE.filter(m => m !== modelName)];
  let lastError = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const rawText = response.text;
      const result = parseAiJsonResponse(rawText);

      // 필수 프로퍼티 안전 검증 및 기본값 보장
      if (!result.score7) result.score7 = {};
      if (!Array.isArray(result.sentenceCorrections)) result.sentenceCorrections = [];
      if (!result.finalPolishedEssay) result.finalPolishedEssay = essayText;

      return result;

    } catch (err) {
      lastError = err;
      const isHighDemand = err.message?.includes('503') || err.message?.includes('high demand') || err.message?.includes('UNAVAILABLE') || err.message?.includes('429');
      const isJsonParseError = err.message?.includes('JSON') || err.name === 'SyntaxError' || err.message?.includes('position');
      const isModelNotFound = err.message?.includes('404');
      
      // 재시도 가능한 오류(트래픽 초과, 모델 미지원, 일시적 JSON 파싱 결함)일 경우 다음 모델로 자동 폴백
      if ((isHighDemand || isJsonParseError || isModelNotFound) && i < modelsToTry.length - 1) {
        console.warn(`[아이글쌤] ${currentModel} 오류 (${err.message}). 다음 안정 모델(${modelsToTry[i + 1]})로 자동 전환 재시도 중...`);
        // 짧은 대기 후 다음 모델 시도
        await new Promise(res => setTimeout(res, 600));
        continue;
      }

      // 다른 심각한 에러이거나 마지막 모델인 경우 루프 종료
      break;
    }
  }

  console.error('AI 첨삭 최종 오류:', lastError);
  throw new Error(formatErrorMessage(lastError));
}

/**
 * 손글씨/스캔 이미지(또는 PDF 렌더링 캔버스)를 Gemini Vision으로 텍스트 추출 (OCR)
 */
export async function extractTextFromImage({ apiKey, base64Image, mimeType = 'image/jpeg', modelName = 'gemini-3.1-flash-lite' }) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API 키가 필요합니다.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Base64 header prefix 제거
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const prompt = `
이 이미지는 초등학생이 공책이나 원고지에 손으로 쓴 글(또는 인쇄된 글)입니다.
글씨가 삐뚤빼뚤하거나 오타가 있더라도 원래 학생이 쓴 글자 그대로 한국어 텍스트로 정확하게 판독(OCR)하여 옮겨 적어주세요.
- 줄바꿈과 문단 구분을 최대한 원본 그대로 유지하세요.
- 다른 부가 설명이나 인사말 없이 오직 판독된 글 텍스트만 출력하세요.
`;

  const modelsToTry = [modelName, ...STABLE_MODELS_CASCADE.filter(m => m !== modelName)];
  let lastError = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType
            }
          },
          prompt
        ]
      });

      return response.text ? response.text.trim() : '';
    } catch (err) {
      lastError = err;
      const isHighDemand = err.message?.includes('503') || err.message?.includes('high demand') || err.message?.includes('UNAVAILABLE') || err.message?.includes('429');
      if (isHighDemand && i < modelsToTry.length - 1) {
        console.warn(`[아이글쌤 OCR] ${currentModel} 모델 트래픽 초과. 대체 모델(${modelsToTry[i + 1]})로 시도...`);
        await new Promise(res => setTimeout(res, 800));
        continue;
      }
      if (err.message?.includes('404') && i < modelsToTry.length - 1) {
        continue;
      }
      break;
    }
  }

  console.error('손글씨 판독 최종 오류:', lastError);
  throw new Error(formatErrorMessage(lastError) || '손글씨 이미지 인식에 실패했습니다. 직접 타이핑하시거나 텍스트 파일로 입력해주세요.');
}
