/**
 * 첨삭 기록을 새 창(새 탭)에서 바로 열람하고 인쇄할 수 있는 독립 HTML 문서 생성기
 */

import { generateFullProofreadTokens } from './proofreadingEngine';

export function openRecordInNewWindow(item) {
  const newWin = window.open('', '_blank');
  if (!newWin) {
    alert('브라우저에서 팝업이 차단되었습니다. 주소창 우측에서 팝업 허용을 선택해주세요.');
    return;
  }

  const date = new Date(item.createdAt);
  const formattedDate = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  const feedback = item.feedback || {};
  const score7 = feedback.score7 || {};
  const corrections = feedback.sentenceCorrections || [];
  const stamp = feedback.stamp || '참 잘했어요';

  // 원글 교정 부호 토큰 및 HTML 생성
  const tokenLines = generateFullProofreadTokens(item.essayText || '', corrections);
  let proofreadTokensHtml = '';
  for (let lineIdx = 0; lineIdx < tokenLines.length; lineIdx++) {
    const line = tokenLines[lineIdx];
    let lineHtml = '';
    for (let tokIdx = 0; tokIdx < line.length; tokIdx++) {
      const tok = line[tokIdx];
      if (tok.type === 'newline') {
        lineHtml += '<div style="height:12px;width:100%;"></div>';
      } else if (tok.type === 'text') {
        lineHtml += `<span>${tok.text}</span>`;
      } else if (tok.type === 'space_insert') {
        lineHtml += `<span style="display:inline-block;vertical-align:baseline;margin:0 2px;"><span style="display:inline-flex;padding:1px 4px;border-radius:4px;font-weight:900;color:#e11d48;background:#ffe4e6;border:1px solid #fda4af;font-size:11px;line-height:1;">∨</span></span>`;
      } else if (tok.type === 'space_delete') {
        lineHtml += `<span style="display:inline-block;vertical-align:baseline;margin:0 2px;"><span style="display:inline-flex;padding:1px 4px;border-radius:4px;font-weight:900;color:#e11d48;background:#ffe4e6;border:1px solid #fda4af;font-size:11px;line-height:1;">⌒</span></span>`;
      } else if (tok.type === 'replace_char') {
        lineHtml += `<span style="position:relative;display:inline-block;vertical-align:baseline;margin:0 2px;"><span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;font-weight:900;color:#e11d48;background:#ffffff;border:1px solid #fda4af;padding:1px 3px;border-radius:4px;margin-bottom:2px;line-height:1;">${tok.replacement}⚬</span><span style="display:inline-block;padding:0 3px;border:1.5px solid #e11d48;border-radius:9999px;font-weight:bold;background:rgba(255,228,230,0.4);">${tok.original}</span></span>`;
      } else if (tok.type === 'replace_word') {
        lineHtml += `<span style="position:relative;display:inline-block;vertical-align:baseline;margin:0 3px;"><span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;font-weight:900;color:#e11d48;background:#ffffff;border:1px solid #fda4af;padding:1px 3px;border-radius:4px;margin-bottom:2px;line-height:1;">${tok.replacement}</span><span style="display:inline-block;padding:0 3px;border-bottom:2px solid #e11d48;border-left:2px solid #e11d48;border-right:2px solid #e11d48;font-weight:bold;background:rgba(255,228,230,0.3);">${tok.original}</span></span>`;
      } else if (tok.type === 'insert_word') {
        lineHtml += `<span style="position:relative;display:inline-block;vertical-align:baseline;margin:0 3px;"><span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;font-weight:900;color:#e11d48;background:#ffffff;border:1px solid #fda4af;padding:1px 3px;border-radius:4px;margin-bottom:2px;line-height:1;">${tok.replacement}</span><span style="color:#e11d48;font-weight:900;font-size:11px;">∨</span></span>`;
      } else if (tok.type === 'delete_word') {
        lineHtml += `<span style="text-decoration:line-through;color:#fda4af;text-decoration-color:#e11d48;margin:0 2px;">${tok.original}</span>`;
      }
    }
    proofreadTokensHtml += `<div style="min-height:2.8rem;padding:4px 0;display:flex;flex-wrap:wrap;align-items:baseline;">${lineHtml}</div>`;
  }

  // 200자 원고지 셀 생성
  const polishedText = feedback.finalPolishedEssay || item.essayText || '';
  const chars = polishedText.replace(/\n+/g, ' \n ').split('');
  const totalCells = Math.max(100, Math.ceil(chars.length / 20) * 20);
  let wongojiCellsHtml = '';
  for (let i = 0; i < totalCells; i++) {
    const ch = chars[i] || '';
    const isNewline = ch === '\n';
    wongojiCellsHtml += `<div class="wongoji-cell">${isNewline ? '↵' : ch}</div>`;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>[우현글쌤 첨삭표] ${item.title || '글쓰기 첨삭 리포트'} - ${item.studentName || '학생'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Gowun Dodum', 'Noto Sans KR', sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
      padding: 30px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      border: 2px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #f59e0b, #ea580c, #e11d48);
      color: #ffffff;
      padding: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 26px; font-weight: 800; margin-bottom: 6px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .stamp {
      border: 3px dashed rgba(255, 255, 255, 0.9);
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 100px;
      height: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-weight: 800;
      color: #fef08a;
      transform: rotate(4deg);
      flex-shrink: 0;
    }
    .stamp span:first-child { font-size: 24px; }
    .stamp span:last-child { font-size: 13px; }
    .meta-bar {
      background: #fef3c7;
      padding: 12px 30px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 13px;
      font-weight: 600;
      color: #92400e;
      border-bottom: 1px solid #fde68a;
    }
    .content { padding: 30px; }
    .section-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 15px;
      padding-left: 10px;
      border-left: 4px solid #f59e0b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .praise-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .praise-box p { font-size: 15px; color: #78350f; line-height: 1.8; margin-bottom: 10px; }
    .advice-tag {
      background: rgba(245, 158, 11, 0.15);
      color: #b45309;
      font-size: 13px;
      font-weight: bold;
      padding: 8px 12px;
      border-radius: 10px;
      display: inline-block;
    }
    .score-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 30px;
    }
    .score-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px;
    }
    .score-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .badge-status {
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10px;
      color: white;
      background: #10b981;
    }
    .badge-status.warning { background: #f59e0b; }
    .badge-status.fixed { background: #6366f1; }
    .score-card p { font-size: 12px; color: #475569; }

    .diff-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 35px; }
    .diff-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .diff-badge {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .diff-line {
      display: flex;
      gap: 10px;
      margin-bottom: 8px;
      font-size: 14px;
      align-items: flex-start;
    }
    .diff-tag {
      font-size: 11px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .diff-tag.orig { background: #fee2e2; color: #991b1b; }
    .diff-tag.corr { background: #dcfce7; color: #166534; }
    .orig-text { color: #64748b; text-decoration: line-through; }
    .corr-text { color: #0f172a; font-weight: 700; }
    .tip-box {
      background: #fef9c3;
      border-left: 3px solid #eab308;
      padding: 8px 12px;
      font-size: 12px;
      color: #713f12;
      border-radius: 0 8px 8px 0;
      margin-top: 6px;
    }

    .essays-comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 35px;
    }
    @media(max-width: 700px) { .essays-comparison { grid-template-columns: 1fr; } }
    .essay-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 18px;
      font-size: 14px;
      line-height: 1.9;
      white-space: pre-wrap;
    }
    .essay-box.final {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1e3a8a;
      font-weight: 500;
    }

    .wongoji-container {
      margin-bottom: 30px;
      overflow-x: auto;
      background: white;
      padding: 15px;
      border-radius: 16px;
      border: 2px solid #fca5a5;
    }
    .wongoji-grid {
      display: grid;
      grid-template-columns: repeat(20, minmax(28px, 1fr));
      gap: 1px;
      background-color: #ef4444;
      border: 2px solid #ef4444;
      padding: 1px;
      min-width: 600px;
    }
    .wongoji-cell {
      aspect-ratio: 1 / 1;
      background-color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-family: 'Gowun Dodum', monospace;
      font-weight: bold;
      color: #1e293b;
    }

    .action-bar {
      position: sticky;
      bottom: 20px;
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 30px;
      z-index: 100;
    }
    .btn {
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.1s;
    }
    .btn:hover { transform: translateY(-2px); }
    .btn-print { background: #0f172a; color: white; }
    .btn-close { background: #e2e8f0; color: #334155; }

    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
      body {
        background: white !important;
        padding: 0 !important;
        font-size: 10pt !important;
        line-height: 1.35 !important;
      }
      .container {
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      .action-bar { display: none !important; }
      .page-break {
        page-break-before: always !important;
        break-before: page !important;
        clear: both;
      }
      .diff-card {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        padding: 10px 14px !important;
        margin-bottom: 8px !important;
        border-radius: 10px !important;
      }
      .diff-line {
        font-size: 12px !important;
        margin-bottom: 4px !important;
      }
      .tip-box {
        font-size: 11px !important;
        padding: 5px 10px !important;
        margin-top: 4px !important;
      }
      .diff-list {
        gap: 8px !important;
        margin-bottom: 20px !important;
      }
      .praise-box {
        padding: 14px !important;
        margin-bottom: 18px !important;
      }
      .score-grid {
        gap: 8px !important;
        margin-bottom: 18px !important;
      }
      .score-card {
        padding: 10px !important;
      }
    }
  </style>
</head>
<body>

  <div class="container">
    
    <div class="header">
      <div>
        <h1>[우현글쌤] 초등 글쓰기 첨삭 리포트</h1>
        <p>7대 핵심 기준 정밀 진단 및 1:1 맞춤 교정 결과지</p>
      </div>
      <div class="stamp">
        <span>💮</span>
        <span>${stamp}</span>
      </div>
    </div>

    <div class="meta-bar">
      <span><strong>글 제목:</strong> ${item.title || '제목 없음'}</span>
      <span><strong>학생 이름:</strong> ${item.studentName || '미지정'}</span>
      <span><strong>학년:</strong> ${item.grade || '초등'}</span>
      <span><strong>첨삭 일시:</strong> ${formattedDate}</span>
    </div>

    <div class="content">

      <!-- 총평 -->
      <div class="praise-box">
        <h2 class="section-title" style="border-color:#f59e0b; margin-top:0;">🌟 글쌤의 칭찬 총평</h2>
        <p>${feedback.overallPraise || '아주 훌륭한 생각과 표현이 돋보이는 글입니다!'}</p>
        ${feedback.keyAdvice ? `<div class="advice-tag">💡 핵심 성장 조언: ${feedback.keyAdvice}</div>` : ''}
      </div>

      <!-- 7대 영역 진단 -->
      <h2 class="section-title">📊 7대 글쓰기 핵심 기준 진단</h2>
      <div class="score-grid">
        ${[
          { key: 'subjectPredicate', name: '1. 주술 호응' },
          { key: 'noRepetition', name: '2. 반복 줄이기' },
          { key: 'writtenStyle', name: '3. 글말(문어체)' },
          { key: 'subjectObject', name: '4. 주어·목적어' },
          { key: 'trickyKorean', name: '5. 헷갈리는 우리말' },
          { key: 'splitLongSentence', name: '6. 긴 문장 자르기' },
          { key: 'spacing', name: '7. 또박 띄어쓰기' }
        ].map(cat => {
          const sc = score7[cat.key] || { status: '좋아요', comment: '양호함' };
          const badgeClass = sc.status === '주의' ? 'warning' : sc.status === '고쳤어요' ? 'fixed' : '';
          return `
            <div class="score-card">
              <div class="score-card-header">
                <span>${cat.name}</span>
                <span class="badge-status ${badgeClass}">${sc.status}</span>
              </div>
              <p>${sc.comment || ''}</p>
            </div>
          `;
        }).join('')}
      </div>

      <!-- 원글 교정 부호(수정 기호) 첨삭본 -->
      <h2 class="section-title">✏️ 원글 교정 부호(수정 기호) 첨삭본</h2>
      <div style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:16px;padding:18px;margin-bottom:30px;line-height:2.8rem;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.02);break-inside:avoid;page-break-inside:avoid;">
        <div style="font-size:11.5px;color:#e11d48;font-weight:bold;margin-bottom:10px;border-bottom:1px solid #f1f5f9;padding-bottom:6px;">
          * 국어 표준 교정 기호: ∨ 띄어 쓸 때 · ⌒ 붙여 쓸 때 · ⚬ 한 글자 고침 · └─┘ 여러 글자 고침 · ∨ 끼워 넣음
        </div>
        ${proofreadTokensHtml}
      </div>

      <!-- 문장별 1:1 대조 첨삭 -->
      <h2 class="section-title">✏️ 문장별 1:1 대조 첨삭 (${corrections.length}건)</h2>
      <div class="diff-list">
        ${corrections.map((c, i) => `
          <div class="diff-card">
            <span class="diff-badge">#${i + 1} ${c.category || '문장 교정'}</span>
            <div class="diff-line">
              <span class="diff-tag orig">원래 문장 ❌</span>
              <span class="orig-text">${c.original}</span>
            </div>
            <div class="diff-line">
              <span class="diff-tag corr">고친 문장 ⭕</span>
              <span class="corr-text">${c.corrected}</span>
            </div>
            ${c.teacherTip ? `<div class="tip-box">💡 <strong>우현글쌤의 꿀팁:</strong> ${c.teacherTip}</div>` : ''}
          </div>
        `).join('')}
      </div>

      <!-- 원본 글 vs 최종 완성본 비교 -->
      <h2 class="section-title">📖 원본 글과 교정 완성본 비교</h2>
      <div class="essays-comparison">
        <div>
          <h3 style="font-size:14px; font-weight:bold; margin-bottom:8px; color:#64748b;">[학생이 쓴 원래 글]</h3>
          <div class="essay-box">${item.essayText}</div>
        </div>
        <div>
          <h3 style="font-size:14px; font-weight:bold; margin-bottom:8px; color:#2563eb;">[7대 기준으로 다듬어진 완성본]</h3>
          <div class="essay-box final">${polishedText}</div>
        </div>
      </div>

      <!-- 200자 원고지 양식 -->
      <h2 class="section-title page-break">📝 200자 원고지 양식 미리보기</h2>
      <div class="wongoji-container">
        <div class="wongoji-grid">
          ${wongojiCellsHtml}
        </div>
      </div>

    </div>

  </div>

  <div class="action-bar">
    <button class="btn btn-print" onclick="window.print()">🖨️ 학습지 인쇄하기</button>
    <button class="btn btn-close" onclick="window.close()">창 닫기</button>
  </div>

</body>
</html>
  `;

  newWin.document.open();
  newWin.document.write(htmlContent);
  newWin.document.close();
}
