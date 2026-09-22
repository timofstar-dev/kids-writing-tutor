/**
 * 국어/원고지 편집 표준 교정 부호(수정 기호) 분석 및 토큰 생성 엔진
 * 
 * 지원 교정 부호:
 * 1. 띄어 쓸 때 (SPACE_INSERT): 쐐기표(∨)
 * 2. 붙여 쓸 때 (SPACE_DELETE): 잇기표/호선(⌒)
 * 3. 한 글자 고칠 때 (REPLACE_CHAR): 원형 교정부호(⚬) + 바른 글자
 * 4. 여러 글자 고칠 때 (REPLACE_WORD): 꺾은 밑줄(└─┘) + 바른 단어
 * 5. 글자를 끼워 넣을 때 (INSERT): 삽입표(∨) + 삽입 낱말
 */

/**
 * 두 문자열 간의 문자 단위 Longest Common Subsequence (LCS) Diff 계산
 */
function computeCharDiff(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 역추적으로 diff 연산(EQUAL, DELETE, INSERT) 추출
  let i = m;
  let j = n;
  const diff = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
      diff.unshift({ type: 'equal', char: str1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'insert', char: str2[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({ type: 'delete', char: str1[i - 1] });
      i--;
    }
  }

  return diff;
}

/**
 * 문자 단위 diff 스트림을 연속된 덩어리(chunk)로 그룹화
 */
function groupDiffChunks(diffList) {
  const chunks = [];
  let currentChunk = null;

  for (const item of diffList) {
    if (!currentChunk || currentChunk.type !== item.type) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = { type: item.type, text: item.char };
    } else {
      currentChunk.text += item.char;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return chunks;
}

/**
 * 인접한 delete + insert 덩어리를 교체(replace) 또는 띄어쓰기(space) 기호로 변환
 */
function parseSentenceProofreadTokens(origSentence, corrSentence, tip = '', category = '') {
  if (!origSentence || !corrSentence) {
    return [{ type: 'text', text: origSentence || '' }];
  }

  const rawDiff = computeCharDiff(origSentence, corrSentence);
  const chunks = groupDiffChunks(rawDiff);
  const tokens = [];

  for (let idx = 0; idx < chunks.length; idx++) {
    const curr = chunks[idx];
    const next = chunks[idx + 1];

    // 1. DELETE 뒤에 바로 INSERT가 오는 경우 -> 교체(REPLACE) 또는 띄어쓰기 변화 분석
    if (curr.type === 'delete' && next && next.type === 'insert') {
      const delText = curr.text;
      const insText = next.text;

      // 1-A: 원문에 공백이 있고 교정문에 공백이 사라진 경우 -> 붙여 쓰기 (⌒)
      if (delText.trim() === '' && insText === '') {
        tokens.push({
          type: 'space_delete',
          symbol: '⌒',
          original: ' ',
          replacement: '',
          tip: tip || '불필요한 띄어쓰기는 붙여 써야 해요.',
          category: '붙여쓰기'
        });
        idx++; // next 소비
        continue;
      }

      // 1-B: 원문에 공백이 포함되어 있고 교정문이 공백 없이 붙은 경우 (예: '좋아 하는' -> '좋아하는')
      if (delText.replace(/\s+/g, '') === insText.replace(/\s+/g, '') && delText.includes(' ') && !insText.includes(' ')) {
        tokens.push({
          type: 'space_delete',
          symbol: '⌒',
          original: delText,
          replacement: insText,
          tip: tip || '앞말과 뒷말을 이어 붙여 써야 해요.',
          category: '붙여쓰기'
        });
        idx++;
        continue;
      }

      // 1-C: 단일 글자 교체 (한 글자 고칠 때 ⚬)
      if (delText.length === 1 && insText.length === 1) {
        tokens.push({
          type: 'replace_char',
          symbol: '⚬',
          original: delText,
          replacement: insText,
          tip: tip || `글자 '${delText}'를 '${insText}'(으)로 바르게 고쳐요.`,
          category: category || '맞춤법'
        });
        idx++;
        continue;
      }

      // 1-D: 여러 글자 교체 (여러 글자 고칠 때 └─┘)
      tokens.push({
        type: 'replace_word',
        symbol: '└─┘',
        original: delText,
        replacement: insText,
        tip: tip || `'${delText}' ➔ '${insText}' 바른 표현으로 다듬어요.`,
        category: category || '낱말 교체'
      });
      idx++;
      continue;
    }

    // 2. 순수 INSERT만 있는 경우 -> 띄어 쓰기 (∨) 또는 글자 끼워넣기 (∨+글자)
    if (curr.type === 'insert') {
      if (curr.text === ' ') {
        tokens.push({
          type: 'space_insert',
          symbol: '∨',
          original: '',
          replacement: ' ',
          tip: tip || '이곳은 단어와 단어 사이를 띄어 써야 해요.',
          category: '띄어쓰기'
        });
      } else {
        tokens.push({
          type: 'insert_word',
          symbol: '∨',
          original: '',
          replacement: curr.text,
          tip: tip || `빠진 내용 '${curr.text}'을(를) 쏙 끼워 넣어요.`,
          category: category || '문장 성분 보충'
        });
      }
      continue;
    }

    // 3. 순수 DELETE만 있는 경우 (불필요한 글자나 공백 삭제)
    if (curr.type === 'delete') {
      if (curr.text === ' ') {
        tokens.push({
          type: 'space_delete',
          symbol: '⌒',
          original: ' ',
          replacement: '',
          tip: tip || '이곳은 띄어쓰지 않고 붙여 써야 해요.',
          category: '붙여쓰기'
        });
      } else {
        tokens.push({
          type: 'delete_word',
          symbol: '✕',
          original: curr.text,
          replacement: '',
          tip: tip || `불필요한 '${curr.text}'은(는) 지워요.`,
          category: category || '군더더기 삭제'
        });
      }
      continue;
    }

    // 4. 일반 일치 텍스트 (EQUAL)
    tokens.push({
      type: 'text',
      text: curr.text
    });
  }

  return tokens;
}

/**
 * 원글 전체 텍스트와 sentenceCorrections 목록을 정밀 매칭하여
 * 원글 전체에 대한 교정 부호 토큰 스트림 생성
 */
export function generateFullProofreadTokens(originalText = '', sentenceCorrections = []) {
  if (!originalText) return [];

  // 줄바꿈을 보존하기 위해 문단/줄 단위로 분할
  const lines = originalText.split('\n');
  const resultLines = [];

  // 교정할 문장 목록 정규화
  const remainingCorrections = sentenceCorrections.map(c => ({
    original: (c.original || '').trim(),
    corrected: (c.corrected || '').trim(),
    teacherTip: c.teacherTip || '',
    category: c.category || '',
    matched: false
  })).filter(c => c.original.length > 0);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    if (!rawLine.trim()) {
      resultLines.push([{ type: 'newline' }]);
      continue;
    }

    // 해당 줄 안에 포함된 교정 문장 찾기
    let lineTokens = [];
    let processedIndex = 0;

    // 해당 라인에 매칭되는 correction 찾기
    const matchingInLine = [];
    for (const corr of remainingCorrections) {
      if (!corr.matched) {
        const pos = rawLine.indexOf(corr.original);
        if (pos !== -1) {
          matchingInLine.push({ ...corr, start: pos, end: pos + corr.original.length });
          corr.matched = true;
        }
      }
    }

    // 위치 순서대로 정렬
    matchingInLine.sort((a, b) => a.start - b.start);

    for (const match of matchingInLine) {
      // 매칭 이전의 일반 텍스트
      if (match.start > processedIndex) {
        lineTokens.push({
          type: 'text',
          text: rawLine.substring(processedIndex, match.start)
        });
      }

      // 교정 부호 토큰들 파싱
      const subTokens = parseSentenceProofreadTokens(
        match.original,
        match.corrected,
        match.teacherTip,
        match.category
      );
      lineTokens.push(...subTokens);
      processedIndex = match.end;
    }

    // 남은 줄 끝 부분 텍스트
    if (processedIndex < rawLine.length) {
      lineTokens.push({
        type: 'text',
        text: rawLine.substring(processedIndex)
      });
    }

    // 만약 라인 단위 매칭이 안 된 경우라도 남은 교정문장과 유사도 검사
    if (matchingInLine.length === 0) {
      const cleanLine = rawLine.trim();
      const nearMatch = remainingCorrections.find(c => !c.matched && (cleanLine.includes(c.original) || c.original.includes(cleanLine)));
      if (nearMatch) {
        nearMatch.matched = true;
        lineTokens = parseSentenceProofreadTokens(
          rawLine,
          nearMatch.corrected,
          nearMatch.teacherTip,
          nearMatch.category
        );
      }
    }

    resultLines.push(lineTokens);
  }

  return resultLines;
}

/**
 * 교정 부호 통계 집계 (띄어쓰기 N건, 붙여쓰기 N건, 맞춤법/단어 교정 N건)
 */
export function getProofreadStats(tokenLines = []) {
  let spaceInsertCount = 0;
  let spaceDeleteCount = 0;
  let replaceCount = 0;
  let insertCount = 0;

  for (const line of tokenLines) {
    for (const tok of line) {
      if (tok.type === 'space_insert') spaceInsertCount++;
      else if (tok.type === 'space_delete') spaceDeleteCount++;
      else if (tok.type === 'replace_char' || tok.type === 'replace_word') replaceCount++;
      else if (tok.type === 'insert_word') insertCount++;
    }
  }

  return {
    spaceInsertCount,
    spaceDeleteCount,
    replaceCount,
    insertCount,
    totalCount: spaceInsertCount + spaceDeleteCount + replaceCount + insertCount
  };
}

/**
 * 띄어쓰기(∨) 및 붙여쓰기(⌒) 항목만 전용으로 추출하여 상세 카드 데이터로 구성
 */
export function extractSpacingIssues(tokenLines = []) {
  const issues = [];
  let issueId = 1;

  for (let lineIdx = 0; lineIdx < tokenLines.length; lineIdx++) {
    const line = tokenLines[lineIdx];
    for (let tokIdx = 0; tokIdx < line.length; tokIdx++) {
      const tok = line[tokIdx];

      if (tok.type === 'space_insert' || tok.type === 'space_delete') {
        // 앞뒤 문맥 텍스트 수집 (최대 10글자 내외)
        const prevTok = line[tokIdx - 1];
        const nextTok = line[tokIdx + 1];

        const beforeText = (prevTok && prevTok.type === 'text')
          ? prevTok.text.trim().slice(-8)
          : (prevTok ? (prevTok.original || prevTok.text || '') : '');

        const afterText = (nextTok && nextTok.type === 'text')
          ? nextTok.text.trim().slice(0, 8)
          : (nextTok ? (nextTok.original || nextTok.text || '') : '');

        const isInsert = tok.type === 'space_insert';

        issues.push({
          id: issueId++,
          type: tok.type,
          symbol: isInsert ? '∨' : '⌒',
          title: isInsert ? '띄어 쓸 곳' : '붙여 쓸 곳',
          beforeSnippet: beforeText,
          afterSnippet: afterText,
          exampleBefore: isInsert ? `${beforeText}${afterText}` : `${beforeText} ${afterText}`,
          exampleMarked: isInsert ? `${beforeText} ∨ ${afterText}` : `${beforeText} ⌒ ${afterText}`,
          exampleFixed: isInsert ? `${beforeText} ${afterText}` : `${beforeText}${afterText}`,
          tip: tok.tip || (isInsert ? '단어와 단어 사이는 띄어 써야 해요.' : '앞말과 뒷말을 붙여 써야 해요.'),
          category: tok.category || (isInsert ? '띄어쓰기' : '붙여쓰기')
        });
      }
    }
  }

  return issues;
}

/**
 * 국어 표준 원고지 작성 규정(20자 1줄)에 맞추어 전체 텍스트를 원고지 칸 행(Row) 배열로 변환
 * - 200자 고정이 아닌, 전체 글자수와 문단 수에 맞춰 동적으로 행(Row) 생성
 * - 새 문단 시작 시 첫 칸 들여쓰기 (1칸 비움)
 * - 낱말 사이 띄어쓰기는 1칸 비움 (단, 줄 첫 칸에는 띄어쓰기 공백 제외)
 * - 문장부호(. , ! ? ” ’)가 줄 첫 칸에 오지 않도록 직전 줄 20번째 칸에 결합
 * - 문단 끝남 시 남은 칸은 비우고 다음 줄로 이동
 */
export function formatTextToWongojiRows(text = '') {
  if (!text || !text.trim()) {
    return Array.from({ length: 5 }, () =>
      Array.from({ length: 20 }, () => ({ char: '', type: 'empty' }))
    );
  }

  const paragraphs = text.split('\n');
  const rows = [];
  let currentRow = [];

  const PUNC_CANNOT_START_LINE = ['.', ',', '!', '?', '”', '’', ':', ';', '~'];

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const rawP = paragraphs[pIdx];
    const p = rawP.trim();
    if (!p) continue;

    // 새 문단 시작 시 1번째 칸 들여쓰기 (1칸 비움)
    currentRow.push({ char: '', type: 'indent', label: '들여쓰기' });

    for (let i = 0; i < p.length; i++) {
      const ch = p[i];

      // 20칸이 차면 다음 줄로
      if (currentRow.length === 20) {
        rows.push(currentRow);
        currentRow = [];
      }

      // 문장부호가 줄 첫머리에 오는 것 방지: 직전 줄 20번째 칸 글자 뒤에 병합
      if (PUNC_CANNOT_START_LINE.includes(ch) && currentRow.length === 0 && rows.length > 0) {
        const prevRow = rows[rows.length - 1];
        const lastCell = prevRow[19];
        if (lastCell) {
          lastCell.char = (lastCell.char || '') + ch;
          continue;
        }
      }

      if (ch === ' ') {
        // 줄 첫머리(0번째 칸)에는 띄어쓰기 빈칸을 두지 않음
        if (currentRow.length === 0) {
          continue;
        }
        currentRow.push({ char: '', type: 'space', label: '띄어쓰기' });
      } else {
        currentRow.push({ char: ch, type: 'char' });
      }
    }

    // 문단 끝남: 남은 칸들을 빈 칸으로 채우고 줄 마감
    if (currentRow.length > 0) {
      while (currentRow.length < 20) {
        currentRow.push({ char: '', type: 'empty' });
      }
      rows.push(currentRow);
      currentRow = [];
    }
  }

  // 최소 1줄의 여유 빈 연습 줄 추가
  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    if (lastRow.some(c => c.char)) {
      rows.push(Array.from({ length: 20 }, () => ({ char: '', type: 'empty' })));
    }
  }

  return rows;
}
