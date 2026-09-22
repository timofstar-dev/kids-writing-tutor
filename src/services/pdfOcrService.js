import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { GoogleGenAI } from '@google/genai';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const STABLE_MODELS_CASCADE = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash'
];

/**
 * PDF 파일의 모든 페이지(또는 최대 N페이지)를 고해상도 이미지(DataURL) 배열로 일괄 렌더링
 */
export async function renderAllPagesFromPdf(file, maxPages = 15, scale = 1.8) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = Math.min(pdf.numPages, maxPages);

  const pages = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    pages.push({
      pageNum: i,
      dataUrl: canvas.toDataURL('image/png'),
      width: viewport.width,
      height: viewport.height,
      totalPages: pdf.numPages
    });
  }

  return pages;
}

/**
 * 단일 이미지에서 Gemini Vision을 통해 마크다운 형식으로 텍스트 추출 (OCR)
 */
export async function extractMarkdownFromImage({
  apiKey,
  base64Image,
  mode = 'preserve',
  modelName = 'gemini-3.1-flash-lite',
  pageNum = 1
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API 키가 필요합니다. 상단 [키 등록]에서 API 키를 입력해주세요.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  let prompt = '';
  if (mode === 'preserve') {
    prompt = `
이 이미지는 초등학생이 공책이나 원고지에 손으로 쓴 글(또는 출력된 글쓰기 과제)입니다.
[필수 지침 - 원문 100% 충실 보존]:
1. 학생이 쓴 글씨가 삐뚤빼뚤하거나 맞춤법, 띄어쓰기 오류가 있더라도 **절대로 임의로 고치지 말고 학생이 쓴 원래 글자 그대로** 정확하게 마크다운(Markdown) 문서로 옮겨 적어주세요.
2. 제목이 있다면 \`# 제목\` 형식으로 작성하세요.
3. 글쓴이(이름), 학년, 날짜 등이 적혀 있다면 \`**글쓴이:** 이름 | **날짜:** 날짜\` 와 같이 첫머리에 메타데이터로 마크다운 표기하세요.
4. 문단과 줄바꿈(원고지 줄바꿈이나 공책 단락)을 자연스러운 마크다운 단락(빈 줄 1개로 문단 구분)으로 유지하세요.
5. 다른 인사말이나 부연 설명, 설명 코멘트는 일체 출력하지 말고 오직 변환된 마크다운 본문만 출력하세요.
`;
  } else {
    prompt = `
이 이미지는 초등학생의 글쓰기 과제입니다.
[필수 지침 - 정돈된 마크다운 서식 변환]:
1. 학생이 작성한 글의 전체 맥락과 내용을 존중하면서, 읽기 편하고 깔끔한 마크다운(Markdown) 문서로 변환해주세요.
2. 제목은 \`# 제목\`, 소제목은 \`## 소제목\`을 사용하세요.
3. 학생 이름, 학년, 날짜는 상단에 명확히 표기하세요.
4. 단락 구분을 명확히 하고, 심한 글자 판독 오류는 자연스럽게 다듬되 학생의 독창적인 문장 표현은 그대로 유지하세요.
5. 오직 마크다운 결과물만 깔끔하게 출력하세요. (인사말이나 사족 제외)
`;
  }

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
              mimeType: 'image/png'
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
        console.warn(`[PDF OCR] ${currentModel} 트래픽 초과. ${modelsToTry[i + 1]} 모델로 재시도...`);
        await new Promise(res => setTimeout(res, 800));
        continue;
      }
      if (err.message?.includes('404') && i < modelsToTry.length - 1) {
        continue;
      }
      break;
    }
  }

  console.error('PDF OCR 최종 실패:', lastError);
  throw new Error(lastError?.message || '손글씨 마크다운 변환에 실패했습니다.');
}

/**
 * 여러 페이지를 순차적으로 OCR하여 하나의 통합 마크다운 문서로 합성
 */
export async function extractMarkdownFromMultiplePages({
  apiKey,
  pages,
  mode = 'preserve',
  modelName = 'gemini-3.1-flash-lite',
  onProgress
}) {
  const total = pages.length;
  const results = [];

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        percentage: Math.round(((i + 1) / total) * 100),
        status: `${i + 1}/${total}쪽 손글씨 판독 및 마크다운 변환 중...`
      });
    }

    try {
      const markdown = await extractMarkdownFromImage({
        apiKey,
        base64Image: page.dataUrl,
        mode,
        modelName,
        pageNum: page.pageNum
      });
      results.push({
        pageNum: page.pageNum,
        markdown
      });
    } catch (err) {
      console.error(`${page.pageNum}쪽 판독 실패:`, err);
      results.push({
        pageNum: page.pageNum,
        markdown: `<!-- ${page.pageNum}쪽 판독 오류: ${err.message} -->`
      });
    }

    if (i < total - 1) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  if (results.length === 1) {
    return results[0].markdown;
  }

  return results.map((res, idx) => {
    if (idx === 0) return res.markdown;
    return `\n\n<!-- 📄 제 ${res.pageNum}쪽 시작 -->\n\n` + res.markdown;
  }).join('');
}

/**
 * 마크다운 텍스트를 구글 문서(Google Docs) 붙여넣기 최적화 Rich-Text HTML로 변환
 */
export function markdownToGoogleDocsHtml(markdownText) {
  if (!markdownText) return '';

  const lines = markdownText.split('\n');
  let html = '';
  let inList = false;

  const escapeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const formatInline = (str) => {
    return escapeHtml(str)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`(.+?)`/g, '<code style="background-color:#f1f3f4;padding:2px 4px;border-radius:3px;font-family:Consolas,monospace;">$1</code>');
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    // 주석 행 (<!-- ... -->)
    if (line.startsWith('<!--') && line.endsWith('-->')) {
      const commentText = line.replace(/^<!--\s*/, '').replace(/\s*-->$/, '');
      html += `<div style="margin: 18px 0; padding: 6px 12px; background-color: #e8f0fe; color: #1a73e8; font-size: 9.5pt; font-weight: bold; border-left: 3px solid #1a73e8; font-family: Arial, sans-serif;">${escapeHtml(commentText)}</div>`;
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      const text = line.substring(2);
      html += `<h1 style="font-family: Arial, sans-serif; font-size: 22pt; font-weight: bold; color: #1a73e8; margin-top: 18pt; margin-bottom: 8pt; line-height: 1.3;">${formatInline(text)}</h1>`;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      const text = line.substring(3);
      html += `<h2 style="font-family: Arial, sans-serif; font-size: 16pt; font-weight: bold; color: #202124; margin-top: 14pt; margin-bottom: 6pt; line-height: 1.3;">${formatInline(text)}</h2>`;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      const text = line.substring(4);
      html += `<h3 style="font-family: Arial, sans-serif; font-size: 13pt; font-weight: bold; color: #3c4043; margin-top: 10pt; margin-bottom: 4pt; line-height: 1.3;">${formatInline(text)}</h3>`;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      if (inList) { html += '</ul>'; inList = false; }
      const text = line.substring(2);
      html += `<blockquote style="border-left: 3px solid #dadce0; margin: 10pt 0 10pt 16pt; padding-left: 10pt; color: #5f6368; font-style: italic;">${formatInline(text)}</blockquote>`;
      continue;
    }

    // Unordered List
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        html += '<ul style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.8; margin-bottom: 10pt; padding-left: 24pt;">';
        inList = true;
      }
      const text = line.substring(2);
      html += `<li style="margin-bottom: 4pt;">${formatInline(text)}</li>`;
      continue;
    }

    if (inList) {
      html += '</ul>';
      inList = false;
    }

    // Horizontal Rule
    if (line === '---' || line === '***') {
      html += '<hr style="border: none; border-top: 1px solid #dadce0; margin: 18pt 0;" />';
      continue;
    }

    // Regular Paragraph
    html += `<p style="font-family: Arial, sans-serif; font-size: 11pt; color: #202124; line-height: 1.8; margin-bottom: 10pt;">${formatInline(line)}</p>`;
  }

  if (inList) {
    html += '</ul>';
  }

  return `<div style="background-color: #ffffff; padding: 24px; color: #202124; font-family: Arial, sans-serif;">${html}</div>`;
}

/**
 * 구글 문서 전용 Rich-Text 클립보드 복사
 */
export async function copyGoogleDocsRichText(htmlContent, plainText) {
  if (!navigator.clipboard) {
    throw new Error('클립보드 API가 지원되지 않는 브라우저입니다.');
  }

  try {
    if (window.ClipboardItem) {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      const item = new window.ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      await navigator.clipboard.write([item]);
      return true;
    } else {
      await navigator.clipboard.writeText(plainText);
      return true;
    }
  } catch (err) {
    console.warn('Rich-Text 복사 실패, 일반 텍스트로 대체 복사:', err);
    await navigator.clipboard.writeText(plainText);
    return true;
  }
}

/**
 * 마크다운 텍스트로부터 제목, 학생 이름, 본문 추출
 */
export function parseStudentMetadata(markdownText) {
  if (!markdownText) return { title: '', studentName: '', body: '' };

  let title = '';
  let studentName = '';
  const lines = markdownText.split('\n');
  const bodyLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!title && trimmed.startsWith('# ')) {
      title = trimmed.replace(/^#+\s*/, '').trim();
      continue;
    }
    // 글쓴이 / 이름 탐지
    if (!studentName && (trimmed.includes('글쓴이') || trimmed.includes('이름') || trimmed.includes('학생'))) {
      const match = trimmed.match(/(?:글쓴이|이름|학생)\s*[:：]\s*([^|\n\r*]+)/);
      if (match && match[1]) {
        studentName = match[1].trim();
      }
    }
    // 페이지 주석 제외
    if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
      continue;
    }
    bodyLines.push(line);
  }

  let cleanBody = bodyLines.join('\n').trim();

  return {
    title: title || '초등 글쓰기 과제',
    studentName: studentName || '',
    body: cleanBody
  };
}
