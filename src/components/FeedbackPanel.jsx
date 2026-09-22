import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Printer, 
  Grid, 
  FileText, 
  ArrowRight, 
  Lightbulb, 
  Heart,
  BookOpen,
  HelpCircle,
  TrendingUp,
  Bookmark
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function FeedbackPanel({ 
  feedback, 
  selectedGrade,
  originalText,
  studentName = '',
  essayTitle = '',
  onOpenRulesModal 
}) {
  const [activeViewTab, setActiveViewTab] = useState('diff'); // 'diff' | 'wongoji' | 'clean' | 'print'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('전체');
  const [copied, setCopied] = useState(false);

  // 첨삭 완료 시 기분 좋은 축하 콘페티 효과 발생
  useEffect(() => {
    if (feedback) {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [feedback]);

  if (!feedback) return null;

  const { 
    stamp = '참 잘했어요', 
    score7 = {}, 
    overallPraise = '', 
    keyAdvice = '', 
    sentenceCorrections = [], 
    finalPolishedEssay = '' 
  } = feedback;

  // 클립보드 복사
  const handleCopyClean = () => {
    navigator.clipboard.writeText(finalPolishedEssay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 7대 항목 한글 레이블 및 아이콘 매핑
  const CRITERIA_MAP = [
    { key: 'subjectPredicate', name: '1. 주술 호응', icon: '🎯', desc: '주어와 서술어의 짝' },
    { key: 'noRepetition', name: '2. 반복 줄이기', icon: '🔄', desc: '같은 낱말/접속어 중복' },
    { key: 'writtenStyle', name: '3. 글말(문어체)', icon: '💬', desc: '말하듯 쓴 구어체 교정' },
    { key: 'subjectObject', name: '4. 주어·목적어', icon: '🔍', desc: '누락된 문장 성분 보충' },
    { key: 'trickyKorean', name: '5. 헷갈리는 우리말', icon: '💡', desc: '돼/되, 의/에, 낫다/낳다 등' },
    { key: 'splitLongSentence', name: '6. 긴 문장 자르기', icon: '✂️', desc: '숨찬 만연체 분할' },
    { key: 'spacing', name: '7. 또박 띄어쓰기', icon: '✏️', desc: '조사/의존명사 바른 띄어쓰기' },
  ];

  // 문장별 첨삭 필터링
  const categoriesList = ['전체', ...new Set(sentenceCorrections.map(c => c.category).filter(Boolean))];

  const filteredCorrections = sentenceCorrections.filter(item => {
    if (selectedCategoryFilter === '전체') return true;
    return item.category === selectedCategoryFilter;
  });

  // 200자 원고지 칸 배열 변환 (20자 1줄 기준)
  const renderWongojiGrid = () => {
    const chars = finalPolishedEssay.replace(/\n+/g, ' \n ').split('');
    const totalCells = Math.max(100, Math.ceil(chars.length / 20) * 20);

    return (
      <div className="bg-white p-6 rounded-3xl border-2 border-red-300 shadow-sm overflow-x-auto">
        <div className="text-center mb-4 border-b border-red-200 pb-3">
          <span className="text-xs font-bold text-red-700 uppercase tracking-widest">
            200자 원고지 양식 미리보기 (20자 × {Math.ceil(totalCells / 20)}줄)
          </span>
        </div>
        <div className="wongoji-grid min-w-[720px]">
          {Array.from({ length: totalCells }).map((_, idx) => {
            const char = chars[idx] || '';
            const isNewline = char === '\n';
            return (
              <div 
                key={idx} 
                className="wongoji-cell select-none"
              >
                <span className="z-10 font-bold text-slate-800">
                  {isNewline ? '↵' : char}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. 상단 칭찬 도장 & 다정한 총평 배너 (화면 전용) */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden no-print">
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute right-12 top-6 text-7xl opacity-20 pointer-events-none select-none">
          🌸
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-amber-100">
              <Award className="w-4 h-4 text-yellow-300" />
              <span>{selectedGrade} 맞춤 글쓰기 진단 완료</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span>{overallPraise ? '참 훌륭한 생각과 표현이에요!' : '글쓰기 첨삭 결과'}</span>
            </h2>

            <p className="text-sm sm:text-base leading-relaxed text-amber-50 font-medium">
              {overallPraise}
            </p>

            {keyAdvice && (
              <div className="bg-black/15 backdrop-blur-xs p-3.5 rounded-2xl border border-white/20 flex items-start gap-2.5 text-xs sm:text-sm">
                <Lightbulb className="w-5 h-5 text-yellow-300 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong className="text-yellow-200">글쌤의 핵심 꿀팁:</strong> {keyAdvice}
                </div>
              </div>
            )}
          </div>

          {/* 칭찬 스탬프 도장 */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-dashed border-white/80 bg-white/20 backdrop-blur-md flex flex-col items-center justify-center p-3 text-center shadow-lg rotate-3 transform hover:rotate-0 transition-transform cursor-default">
              <span className="text-2xl sm:text-3xl mb-1">💮</span>
              <span className="text-xs sm:text-sm font-black text-yellow-200 tracking-wider">
                {stamp}
              </span>
              <span className="text-[10px] text-white/80 font-bold mt-0.5">우현글쌤 인증</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. 7대 핵심 기준 정밀 진단표 (화면 전용) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 no-print">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <span>7대 글쓰기 핵심 기준 진단표</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            초등 교육과정 국어 글쓰기 평가 기준
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CRITERIA_MAP.map(item => {
            const result = score7[item.key] || { status: '좋아요', comment: '잘 작성되었습니다.' };
            const isGood = result.status === '좋아요';
            const isCaution = result.status === '주의';

            return (
              <div 
                key={item.key} 
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isGood 
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                    : isCaution 
                      ? 'bg-amber-50/60 border-amber-200 text-amber-950' 
                      : 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <span className="text-base">{item.icon}</span>
                      {item.name}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      isGood 
                        ? 'bg-emerald-600 text-white' 
                        : isCaution 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-indigo-600 text-white'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2 font-medium">
                    {item.desc}
                  </p>
                </div>
                
                <p className="text-xs leading-relaxed font-semibold mt-1">
                  {result.comment}
                </p>
              </div>
            );
          })}

          {/* 헷갈리는 우리말 백과 바로가기 배너 */}
          <div 
            onClick={onOpenRulesModal}
            className="p-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-100/60 transition-colors cursor-pointer flex flex-col justify-center items-center text-center group"
          >
            <BookOpen className="w-6 h-6 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-amber-900">헷갈리는 우리말 12선</span>
            <span className="text-[11px] text-amber-700 mt-0.5">공식 백과 열기 & 퀴즈 ➔</span>
          </div>
        </div>
      </div>

      {/* 3. 뷰 모드 탭 (문장별 1:1 대조 / 완성본 줄글 / 200자 원고지) - 화면 전용 */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 no-print">
        
        {/* 상단 탭 전환 바 (화면 전용) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveViewTab('diff')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeViewTab === 'diff'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <span>문장별 1:1 첨삭 대조 ({sentenceCorrections.length})</span>
            </button>

            <button
              onClick={() => setActiveViewTab('clean')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeViewTab === 'clean'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>최종 완성본 읽기</span>
            </button>

            <button
              onClick={() => setActiveViewTab('wongoji')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeViewTab === 'wongoji'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid className="w-4 h-4 text-rose-500" />
              <span>200자 원고지 격자</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyClean}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              title="완성본 텍스트 복사"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사 완료!' : '완성본 복사'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>학습지 인쇄</span>
            </button>
          </div>
        </div>

        {/* 탭 1: 문장별 1:1 첨삭 대조표 (화면용) */}
        {activeViewTab === 'diff' && (
          <div className="space-y-4">
            
            {/* 카테고리 필터 태그 */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs pb-1">
              <span className="text-slate-400 font-medium text-[11px]">항목별 모아보기:</span>
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    selectedCategoryFilter === cat
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredCorrections.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                선택한 항목의 교정 문장이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCorrections.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-300 shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-xs font-black bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-lg border border-amber-300/70">
                        <Bookmark className="w-3 h-3 text-amber-600" />
                        {item.category || '문장 다듬기'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        문장 #{idx + 1}
                      </span>
                    </div>

                    {/* 원래 문장 */}
                    <div className="flex items-start gap-2 text-xs sm:text-sm bg-rose-50/70 border border-rose-200/80 p-2.5 sm:p-3 rounded-xl">
                      <span className="shrink-0 bg-rose-200 text-rose-800 font-bold px-1.5 py-0.5 rounded text-[11px]">
                        원래 글 ❌
                      </span>
                      <p className="text-slate-700 leading-relaxed font-medium break-keep">
                        {item.original}
                      </p>
                    </div>

                    {/* 다듬은 문장 */}
                    <div className="flex items-start gap-2 text-xs sm:text-sm bg-emerald-50/80 border border-emerald-200/80 p-2.5 sm:p-3 rounded-xl">
                      <span className="shrink-0 bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[11px]">
                        고친 글 ⭕
                      </span>
                      <p className="text-slate-900 leading-relaxed font-bold break-keep">
                        {item.corrected}
                      </p>
                    </div>

                    {/* 선생님의 친절한 설명 말풍선 */}
                    {item.teacherTip && (
                      <div className="bg-amber-50/80 border-l-4 border-amber-400 p-2.5 sm:p-3 rounded-r-xl text-xs text-amber-950 flex items-start gap-2 leading-relaxed">
                        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="break-keep">
                          <strong className="text-amber-800">우현글쌤의 다정한 조언:</strong> {item.teacherTip}
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* 탭 2: 최종 완성본 깔끔한 줄글 보기 */}
        {activeViewTab === 'clean' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-indigo-100 text-slate-800 leading-loose text-base font-medium whitespace-pre-line shadow-inner">
              {finalPolishedEssay}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 px-2">
              <span>공백 포함 {finalPolishedEssay.length}자</span>
              <span className="text-indigo-600 font-semibold">
                ✨ 7대 기준으로 단정하고 매끄럽게 완성된 글입니다.
              </span>
            </div>
          </div>
        )}

        {/* 탭 3: 200자 원고지 격자 보기 */}
        {activeViewTab === 'wongoji' && (
          <div className="space-y-4">
            {renderWongojiGrid()}
          </div>
        )}

      </div>

      {/* 4. A4 인쇄용 전용 템플릿: 초등 글쓰기 완성 첨삭 학습지 (학생 배포용 완벽 2페이지 구성) */}
      <div className="hidden print:block p-2 bg-white text-slate-900">
        
        {/* [1쪽] 총평, 7대 성취도 진단, 문장별 1:1 첨삭 클리닉 ("위의 것" 완벽 반영) */}
        <div>
          {/* 1쪽 상단 공식 헤더 */}
          <div className="border-b-2 border-slate-900 pb-2 mb-2.5 flex justify-between items-end">
            <div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                초등 국어 7대 역량 진단 리포트 & 첨삭본
              </span>
              <h1 className="text-xl font-black mt-1 text-slate-900">
                [우현글쌤] 초등 글쓰기 완성 첨삭 학습지
              </h1>
              <p className="text-[11px] text-slate-600 mt-0.5">
                글 제목: {essayTitle ? `『${essayTitle}』` : '제목 없음'}
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-600 leading-tight space-y-0.5">
              <p><strong>학생:</strong> {studentName || '학생'} ({selectedGrade})</p>
              <p><strong>발행일:</strong> {new Date().toLocaleDateString('ko-KR')}</p>
            </div>
          </div>

          {/* 총평 & 스탬프 */}
          <div className="border border-slate-300 p-2.5 rounded-xl mb-2 flex justify-between items-center bg-amber-50/40">
            <div className="space-y-1 flex-1 pr-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">🌸 글쌤의 다정한 총평</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-700 font-medium break-keep">
                {overallPraise}
              </p>
              {keyAdvice && (
                <p className="text-[10.5px] leading-snug font-bold text-amber-900 bg-amber-100/70 p-1.5 rounded-lg border border-amber-200 break-keep">
                  💡 <strong>핵심 조언:</strong> {keyAdvice}
                </p>
              )}
            </div>
            <div className="border-2 border-dashed border-red-500 p-1.5 rounded-full text-center text-red-600 text-xs font-bold w-18 h-18 flex flex-col justify-center items-center shrink-0 bg-white shadow-xs">
              <span className="text-[11px] font-black">참잘했어요</span>
              <span className="text-[9.5px] text-red-500">{stamp}</span>
            </div>
          </div>

          {/* 7대 핵심 기준 성취도 진단 종합 요약표 */}
          <div className="mb-2">
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              {CRITERIA_MAP.map(item => {
                const result = score7[item.key] || { status: '좋아요' };
                const isGood = result.status === '좋아요';
                const isCaution = result.status === '주의';
                return (
                  <div key={item.key} className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 flex items-center justify-between">
                    <span className="font-bold text-slate-700 truncate mr-1">{item.name}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black shrink-0 ${
                      isGood ? 'bg-emerald-600 text-white' : isCaution ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                );
              })}
              <div className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 flex items-center justify-between">
                <span className="font-bold text-slate-700">총 교정 문장</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-slate-700 text-white shrink-0">
                  {sentenceCorrections.length}문장 완료
                </span>
              </div>
            </div>
          </div>

          {/* 문장별 1:1 맞춤 첨삭 리뷰 (학생 전달용 "위의 것" 카드 디자인 완벽 복원) */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1.5">
              <h2 className="font-bold text-xs text-slate-900 flex items-center gap-1">
                <span>✏️ 문장별 1:1 맞춤 첨삭 클리닉</span>
                <span className="text-[10px] text-slate-500 font-normal">({sentenceCorrections.length}개 교정 내용)</span>
              </h2>
              <span className="text-[10px] text-amber-800 font-medium">
                원래 문장 ❌ 과 고친 문장 ⭕ 을 비교하며 읽어보세요!
              </span>
            </div>

            <div className="space-y-1.5">
              {sentenceCorrections.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50/40 space-y-1 print-avoid-break break-inside-avoid"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-300/70">
                      <Bookmark className="w-2.5 h-2.5 text-amber-600" />
                      {item.category || '문장 다듬기'}
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      문장 #{idx + 1}
                    </span>
                  </div>

                  {/* 원래 문장 */}
                  <div className="flex items-start gap-1.5 text-[10.5px] bg-rose-50/70 border border-rose-200/80 p-1.5 rounded-lg">
                    <span className="shrink-0 bg-rose-200 text-rose-800 font-bold px-1.5 py-0.2 rounded text-[9px]">
                      원래 글 ❌
                    </span>
                    <p className="text-slate-700 leading-snug font-medium break-keep line-through decoration-rose-400">
                      {item.original}
                    </p>
                  </div>

                  {/* 다듬은 문장 */}
                  <div className="flex items-start gap-1.5 text-[10.5px] bg-emerald-50/80 border border-emerald-200/80 p-1.5 rounded-lg">
                    <span className="shrink-0 bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.2 rounded text-[9px]">
                      고친 글 ⭕
                    </span>
                    <p className="text-slate-900 leading-snug font-bold break-keep">
                      {item.corrected}
                    </p>
                  </div>

                  {/* 선생님의 친절한 조언 */}
                  {item.teacherTip && (
                    <div className="bg-amber-50/80 border-l-2 border-amber-400 p-1.5 rounded-r-lg text-[10px] text-amber-950 flex items-start gap-1.5 leading-snug">
                      <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                      <div className="break-keep">
                        <strong className="text-amber-800">우현글쌤 조언:</strong> {item.teacherTip}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* [2쪽] 완성된 모범 글 & 200자 원고지 연습 (새 페이지로 시작) */}
        <div className="print-page-break break-before-page pt-3">
          
          {/* 2쪽 상단 헤더 */}
          <div className="border-b-2 border-slate-900 pb-2 mb-3.5 flex justify-between items-end">
            <div>
              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-300">
                우현글쌤 7대 기준 최종 완성본 & 원고지
              </span>
              <h1 className="text-lg font-black mt-0.5 text-slate-900">
                [우현글쌤] 완성된 모범 글 & 200자 원고지 연습
              </h1>
              <p className="text-[11px] text-slate-600">
                글 제목: {essayTitle ? `『${essayTitle}』` : '제목 없음'} · 학생: {studentName || '학생'}
              </p>
            </div>
            <div className="text-right text-[10.5px] text-slate-500">
              공백 포함 {finalPolishedEssay.length}자
            </div>
          </div>

          {/* 완성된 모범 글 */}
          <div className="border-2 border-indigo-200 rounded-2xl p-3.5 bg-indigo-50/20 mb-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2 mb-2">
              <h2 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                <span>✨ 7대 기준으로 매끄럽게 완성된 모범 글</span>
              </h2>
              <span className="text-[10px] text-indigo-600 font-semibold">
                단정하고 바른 표현으로 다듬어진 최종 완성 글입니다
              </span>
            </div>
            <div className="text-[12px] text-slate-900 leading-loose font-medium whitespace-pre-line break-keep">
              {finalPolishedEssay}
            </div>
          </div>

          {/* 200자 원고지 양식 미리보기 (학생이 직접 써보는 연습 칸) */}
          <div className="border border-slate-300 rounded-2xl p-3 bg-white">
            <div className="text-center mb-2.5 pb-1.5 border-b border-slate-200">
              <h3 className="text-xs font-bold text-red-700">
                📝 200자 원고지 바른 글쓰기 양식 (20자 × 1줄)
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                원고지 칸에 맞추어 띄어쓰기와 문장 부호를 바르게 쓰는 연습을 해보세요.
              </p>
            </div>
            <div className="wongoji-grid text-xs">
              {(() => {
                const chars = finalPolishedEssay.replace(/\n+/g, ' \n ').split('');
                const totalCells = Math.min(160, Math.max(80, Math.ceil(chars.length / 20) * 20));
                return Array.from({ length: totalCells }).map((_, idx) => {
                  const char = chars[idx] || '';
                  const isNewline = char === '\n';
                  return (
                    <div key={idx} className="wongoji-cell select-none text-xs">
                      <span className="z-10 font-bold text-slate-800 text-[11px]">
                        {isNewline ? '↵' : char}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
