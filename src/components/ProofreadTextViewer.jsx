import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Bookmark,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  Lightbulb
} from 'lucide-react';
import { 
  generateFullProofreadTokens, 
  getProofreadStats, 
  extractSpacingIssues 
} from '../services/proofreadingEngine';

export default function ProofreadTextViewer({ 
  originalText = '', 
  sentenceCorrections = [],
  essayTitle = '',
  studentName = '' 
}) {
  // 필터 모드: 'all' (전체 교정 부호) | 'spacing' (띄어쓰기·붙여쓰기만) | 'replace' (맞춤법·글자교체) | 'insert' (끼워넣기)
  const [filterMode, setFilterMode] = useState('all');
  // 범례 안내 아코디언 열림 여부
  const [showLegend, setShowLegend] = useState(true);
  // 클릭된 특정 토큰 팝오버 정보
  const [selectedTokenInfo, setSelectedTokenInfo] = useState(null);

  // 1. 교정 부호 토큰 스트림 파싱
  const tokenLines = useMemo(() => {
    return generateFullProofreadTokens(originalText, sentenceCorrections);
  }, [originalText, sentenceCorrections]);

  // 2. 통계 집계
  const stats = useMemo(() => {
    return getProofreadStats(tokenLines);
  }, [tokenLines]);

  // 3. 띄어쓰기/붙여쓰기 전용 항목 추출
  const spacingIssues = useMemo(() => {
    return extractSpacingIssues(tokenLines);
  }, [tokenLines]);

  // 토큰 렌더링 헬퍼
  const renderToken = (tok, lineIdx, tokIdx) => {
    const key = `tok-${lineIdx}-${tokIdx}`;

    // 줄바꿈
    if (tok.type === 'newline') {
      return <div key={key} className="h-6" />;
    }

    // 일반 일치 텍스트
    if (tok.type === 'text') {
      return (
        <span key={key} className="text-slate-800 tracking-wide font-medium">
          {tok.text}
        </span>
      );
    }

    // 필터링 적용 여부 체크
    const isSpacingType = tok.type === 'space_insert' || tok.type === 'space_delete';
    const isReplaceType = tok.type === 'replace_char' || tok.type === 'replace_word';
    const isInsertType = tok.type === 'insert_word';

    let isHighlighted = false;
    let isDimmed = false;

    if (filterMode === 'spacing') {
      if (isSpacingType) isHighlighted = true;
      else isDimmed = true;
    } else if (filterMode === 'replace') {
      if (isReplaceType) isHighlighted = true;
      else isDimmed = true;
    } else if (filterMode === 'insert') {
      if (isInsertType) isHighlighted = true;
      else isDimmed = true;
    }

    const dimClass = isDimmed ? 'opacity-30 grayscale-[50%]' : 'opacity-100';

    // 1. 띄어 쓸 때 (∨ 쐐기표)
    if (tok.type === 'space_insert') {
      return (
        <span
          key={key}
          onClick={() => setSelectedTokenInfo(tok)}
          className={`inline-block align-baseline relative cursor-pointer group mx-1 select-none ${dimClass}`}
          title="[띄어 쓸 때 ∨] 클릭하면 우현글쌤의 조언을 볼 수 있어요"
        >
          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-rose-600 bg-rose-50 border border-rose-300 text-xs shadow-2xs transition-all ${
            isHighlighted || filterMode === 'spacing'
              ? 'proof-pulse-highlight ring-2 ring-rose-500 bg-rose-100 font-extrabold scale-110'
              : 'hover:scale-110 hover:bg-rose-100'
          }`}>
            ∨
          </span>
          <span className="sr-only">(띄어쓰기)</span>
        </span>
      );
    }

    // 2. 붙여 쓸 때 (⌒ 호선표)
    if (tok.type === 'space_delete') {
      return (
        <span
          key={key}
          onClick={() => setSelectedTokenInfo(tok)}
          className={`inline-block align-baseline relative cursor-pointer group mx-1 select-none ${dimClass}`}
          title="[붙여 쓸 때 ⌒] 클릭하면 우현글쌤의 조언을 볼 수 있어요"
        >
          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-rose-600 bg-rose-50 border border-rose-300 text-xs shadow-2xs transition-all ${
            isHighlighted || filterMode === 'spacing'
              ? 'proof-pulse-highlight ring-2 ring-rose-500 bg-rose-100 font-extrabold scale-110'
              : 'hover:scale-110 hover:bg-rose-100'
          }`}>
            ⌒
          </span>
          <span className="sr-only">(붙여쓰기)</span>
        </span>
      );
    }

    // 3. 한 글자 고칠 때 (⚬ 동그라미 교정부호 + 상단 바른 글자)
    if (tok.type === 'replace_char') {
      return (
        <span
          key={key}
          onClick={() => setSelectedTokenInfo(tok)}
          className={`relative inline-block align-baseline mx-1 cursor-pointer group ${dimClass}`}
          title={`[한 글자 고칠 때 ⚬] '${tok.original}' ➔ '${tok.replacement}'`}
        >
          {/* 글자 상단에 플로팅되는 바른 글자 (원고지 교정 첨삭) */}
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-black text-rose-600 leading-none px-1.5 py-0.5 rounded-md bg-white border border-rose-400 shadow-xs pointer-events-none group-hover:scale-110 transition-transform z-10 flex items-center gap-0.5">
            <span>{tok.replacement}</span>
            <span className="text-[9px] text-rose-400">⚬</span>
          </span>
          {/* 동그라미 친 원래 글자 - 본문 베이스라인 완벽 유지 */}
          <span className="inline-block px-1 border-2 border-rose-500 rounded-full text-slate-900 font-semibold bg-rose-50/50 group-hover:bg-rose-100 transition-colors">
            {tok.original}
          </span>
        </span>
      );
    }

    // 4. 여러 글자 고칠 때 (└─┘ 꺾은 밑줄 + 상단 바른 단어)
    if (tok.type === 'replace_word') {
      return (
        <span
          key={key}
          onClick={() => setSelectedTokenInfo(tok)}
          className={`relative inline-block align-baseline mx-1.5 cursor-pointer group ${dimClass}`}
          title={`[여러 글자 고칠 때 └─┘] '${tok.original}' ➔ '${tok.replacement}'`}
        >
          {/* 상단 플로팅 바른 단어 */}
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-black text-rose-600 leading-none px-1.5 py-0.5 rounded-md bg-white border border-rose-400 shadow-xs pointer-events-none group-hover:scale-110 transition-transform z-10">
            {tok.replacement}
          </span>
          {/* 하단 꺾은 밑줄 교정부호 - 본문 베이스라인 완벽 유지 */}
          <span className="inline-block px-1 border-b-2 border-l-2 border-r-2 border-rose-500 text-slate-900 font-semibold bg-rose-50/30 group-hover:bg-rose-100 transition-colors">
            {tok.original}
          </span>
        </span>
      );
    }

    // 5. 글자를 끼워 넣을 때 (∨ + 상단 단어)
    if (tok.type === 'insert_word') {
      return (
        <span
          key={key}
          onClick={() => setSelectedTokenInfo(tok)}
          className={`relative inline-block align-baseline mx-1 cursor-pointer group ${dimClass}`}
          title={`[글자 끼워 넣을 때 ∨] 끼워 넣을 낱말: '${tok.replacement}'`}
        >
          {/* 상단 끼워 넣을 낱말 */}
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-black text-rose-600 leading-none px-1.5 py-0.5 rounded-md bg-white border border-rose-400 shadow-xs pointer-events-none group-hover:scale-110 transition-transform z-10">
            {tok.replacement}
          </span>
          {/* 쐐기 삽입표 */}
          <span className="inline-flex items-center justify-center px-1 text-rose-600 font-black text-xs">
            ∨
          </span>
        </span>
      );
    }

    // 6. 삭제 (✕)
    if (tok.type === 'delete_word') {
      return (
        <span
          key={key}
          onClick={() => setSelectedTokenInfo(tok)}
          className={`relative inline-block align-baseline mx-1 line-through decoration-rose-500 decoration-2 text-rose-400 cursor-pointer ${dimClass}`}
          title={`[지울 때] 불필요한 '${tok.original}' 삭제`}
        >
          {tok.original}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. 상단 안내 헤더 & 컨트롤 바 */}
      <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 border border-amber-200 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                원고지 표준 교정부호
              </span>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <span>✏️ 원글 즉시 교정부호(수정기호) 첨삭</span>
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              학생이 작성한 원글 위에 표준 교정 부호(띄어쓰기 <strong>∨</strong>, 붙여쓰기 <strong>⌒</strong>, 글자고침 <strong>⚬</strong>/<strong>└─┘</strong>)가 직접 표시되어 어디를 어떻게 고쳐야 하는지 한눈에 보입니다.
            </p>
          </div>

          {/* 범례표 토글 버튼 */}
          <button
            onClick={() => setShowLegend(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-700 text-xs font-bold rounded-xl border border-amber-300 shadow-xs transition-all shrink-0"
          >
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>5대 교정 부호 규칙표</span>
            {showLegend ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 교정 부호 표준 범례 안내 카드 (사용자 첨부 이미지 100% 매칭) */}
        {showLegend && (
          <div className="mt-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-white/90 rounded-2xl p-3 border border-amber-200/90 shadow-xs overflow-x-auto">
              <div className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1">
                <span>📖 국어 원고지 5대 교정 부호(수정 기호) 읽는 법</span>
                <span className="text-[10px] font-normal text-slate-500">(교정 부호를 누르면 다정한 조언을 볼 수 있어요)</span>
              </div>
              <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-amber-100/60 text-amber-950 font-bold border-b border-amber-200 text-[11px]">
                    <th className="py-1.5 px-2.5 w-16 text-center">교정 부호</th>
                    <th className="py-1.5 px-3 w-28">기능</th>
                    <th className="py-1.5 px-3">교정하기 전 (원글 표시)</th>
                    <th className="py-1.5 px-3">교정하고 난 후 (바른 글)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 font-medium text-slate-700">
                  <tr className="hover:bg-amber-50/50">
                    <td className="py-2 px-2.5 text-center font-black text-rose-600 text-base">∨</td>
                    <td className="py-2 px-3 font-bold text-slate-900">띄어 쓸 때</td>
                    <td className="py-2 px-3">
                      나의<span className="text-rose-600 font-bold bg-rose-50 px-1 rounded border border-rose-200">∨</span>역할을 다 하겠어.
                    </td>
                    <td className="py-2 px-3 font-semibold text-emerald-800">
                      나의 역할을 다 하겠어.
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/50">
                    <td className="py-2 px-2.5 text-center font-black text-rose-600 text-base">⌒</td>
                    <td className="py-2 px-3 font-bold text-slate-900">붙여 쓸 때</td>
                    <td className="py-2 px-3">
                      내가 좋아<span className="text-rose-600 font-bold bg-rose-50 px-1 rounded border border-rose-200">⌒</span>하는 책
                    </td>
                    <td className="py-2 px-3 font-semibold text-emerald-800">
                      내가 좋아하는 책
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/50">
                    <td className="py-2 px-2.5 text-center font-black text-rose-600 text-base">⚬</td>
                    <td className="py-2 px-3 font-bold text-slate-900">한 글자를 고칠 때</td>
                    <td className="py-2 px-3">
                      <span className="text-rose-600 font-bold text-[10px] bg-rose-100 px-1 rounded mr-0.5">숙</span>
                      <span className="border-2 border-rose-500 rounded-full px-1 text-slate-900">수</span>제가 너무 많다.
                    </td>
                    <td className="py-2 px-3 font-semibold text-emerald-800">
                      숙제가 너무 많다.
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/50">
                    <td className="py-2 px-2.5 text-center font-black text-rose-600 text-base">└─┘</td>
                    <td className="py-2 px-3 font-bold text-slate-900">여러 글자를 고칠 때</td>
                    <td className="py-2 px-3">
                      <span className="text-rose-600 font-bold text-[10px] bg-rose-100 px-1 rounded mr-0.5">같이</span>
                      <span className="border-b-2 border-l-2 border-r-2 border-rose-500 px-1 text-slate-900">가치</span> 놀자.
                    </td>
                    <td className="py-2 px-3 font-semibold text-emerald-800">
                      같이 놀자.
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/50">
                    <td className="py-2 px-2.5 text-center font-black text-rose-600 text-base">∨</td>
                    <td className="py-2 px-3 font-bold text-slate-900">글자를 끼워 넣을 때</td>
                    <td className="py-2 px-3">
                      학교 <span className="text-rose-600 font-bold text-[10px] bg-rose-100 px-1 rounded mr-0.5">갈</span><span className="text-rose-600 font-black">∨</span>시간이다.
                    </td>
                    <td className="py-2 px-3 font-semibold text-emerald-800">
                      학교 갈 시간이다.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. 교정 부호 필터 & 띄어쓰기 바로 보기 퀵 스위치 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-amber-200/70">
          
          {/* 보기 필터 버튼 그룹 */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-2xl border border-amber-200 shadow-2xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              전체 교정 부호 ({stats.totalCount})
            </button>

            {/* ★ 사용자의 핵심 요청: 띄어쓰기 별도 바로 표시 퀵 필터 ★ */}
            <button
              onClick={() => setFilterMode('spacing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterMode === 'spacing'
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>✨ 띄어쓰기·붙여쓰기 (∨, ⌒)만 바로 보기 ({stats.spaceInsertCount + stats.spaceDeleteCount})</span>
            </button>

            <button
              onClick={() => setFilterMode('replace')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'replace'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              맞춤법·글자 교체 ({stats.replaceCount})
            </button>
          </div>

          {/* 통계 요약 뱃지들 */}
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-xl border border-slate-200 text-slate-700 font-semibold shadow-2xs">
              <span className="text-rose-600 font-black">∨</span> 띄어쓰기: <strong>{stats.spaceInsertCount}곳</strong>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-xl border border-slate-200 text-slate-700 font-semibold shadow-2xs">
              <span className="text-rose-600 font-black">⌒</span> 붙여쓰기: <strong>{stats.spaceDeleteCount}곳</strong>
            </span>
          </div>

        </div>

      </div>

      {/* 2. 교정 부호 선택 시 나타나는 인터랙티브 조언 팝오버 카드 */}
      {selectedTokenInfo && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm animate-in zoom-in-95 duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl p-2 bg-white rounded-xl border border-amber-300 shadow-xs shrink-0">
              {selectedTokenInfo.symbol || '✏️'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
                  {selectedTokenInfo.category || '교정 안내'}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  수정 부호: <strong>{selectedTokenInfo.symbol}</strong>
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {selectedTokenInfo.tip || '바른 글쓰기 규칙에 맞춰 교정해요.'}
              </p>
              {selectedTokenInfo.original && selectedTokenInfo.replacement && (
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
                  <span className="text-rose-700 line-through">❌ {selectedTokenInfo.original}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-emerald-700 font-bold">⭕ {selectedTokenInfo.replacement}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelectedTokenInfo(null)}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-amber-300 shadow-2xs transition-colors shrink-0"
          >
            닫기 ✕
          </button>
        </div>
      )}

      {/* 3. 원글 교정 부호 인라인 뷰어 (원고지/노트 줄글 양식) */}
      <div className="border-2 border-amber-200 rounded-3xl p-6 md:p-8 shadow-sm bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-amber-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-bold text-slate-900">
              {essayTitle ? `『${essayTitle}』` : '학생 원글 첨삭본'}
            </h4>
            <span className="text-xs text-slate-500 font-medium">
              (작성자: {studentName || '학생'})
            </span>
          </div>

          {filterMode === 'spacing' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full animate-pulse border border-rose-300">
              <Sparkles className="w-3 h-3" />
              띄어쓰기·붙여쓰기 집중 모드 작동 중
            </span>
          )}
        </div>

        {/* 원고지/노트 줄글 배경 텍스트 영역 */}
        <div className="proofread-paper-container rounded-2xl p-6 sm:p-8 text-base md:text-lg font-medium select-text break-keep">
          {tokenLines.map((lineTokens, lineIdx) => (
            <div key={`line-${lineIdx}`} className="min-h-[4rem] py-3 flex flex-wrap items-baseline">
              {lineTokens.map((tok, tokIdx) => renderToken(tok, lineIdx, tokIdx))}
            </div>
          ))}
        </div>

        <div className="text-right text-[11px] text-slate-400 mt-3">
          * 붉은색 교정 부호를 클릭하면 우현글쌤의 상세한 첨삭 팁이 열립니다.
        </div>
      </div>

      {/* 4. ★ 띄어쓰기·붙여쓰기 별도 바로 보기 전용 섹션 ★ */}
      <div className="bg-white border border-rose-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-rose-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-100 text-rose-700 rounded-xl text-base">✏️</span>
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>띄어쓰기 & 붙여쓰기 즉시 확인 클리닉</span>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  총 {spacingIssues.length}곳
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                글에서 잘못 띄어 쓰거나 붙여 쓴 곳만 따로 모아서 바로 교정할 수 있어요.
              </p>
            </div>
          </div>
        </div>

        {spacingIssues.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-emerald-50/50 rounded-2xl border border-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-emerald-900">
              우와! 띄어쓰기와 붙여쓰기가 모두 완벽해요! 🎉
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              조사와 낱말을 규정에 맞게 아주 또박또박 잘 썼습니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {spacingIssues.map((issue) => (
              <div 
                key={issue.id}
                className="p-4 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/40 via-white to-amber-50/30 hover:border-rose-300 transition-all space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black bg-rose-600 text-white shadow-2xs">
                    <span className="text-sm">{issue.symbol}</span>
                    <span>{issue.title}</span>
                  </span>
                  <span className="text-[11px] font-bold text-rose-700">
                    #{issue.id}
                  </span>
                </div>

                {/* 교정 전 / 교정 기호 / 교정 후 대조 */}
                <div className="bg-white p-3 rounded-xl border border-rose-100/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">교정하기 전:</span>
                    <span className="text-rose-700 font-bold">
                      {issue.exampleBefore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                    <span className="text-slate-400 font-medium">원고지 기호:</span>
                    <span className="text-rose-600 font-black text-sm">
                      {issue.exampleMarked}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                    <span className="text-slate-400 font-medium">교정하고 난 후:</span>
                    <span className="text-emerald-700 font-black">
                      {issue.exampleFixed}
                    </span>
                  </div>
                </div>

                {/* 우현글쌤의 조언 */}
                <p className="text-xs text-slate-700 leading-relaxed font-semibold flex items-start gap-1">
                  <span className="text-amber-500 shrink-0">💡</span>
                  <span>{issue.tip}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
