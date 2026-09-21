import React from 'react';
import { BookOpen, Key, Sparkles, Printer, GraduationCap, FolderOpen } from 'lucide-react';

export default function Header({ 
  selectedGrade, 
  onSelectGrade, 
  onOpenRulesModal, 
  onOpenApiModal, 
  onOpenHistoryModal,
  historyCount = 0,
  apiKey,
  hasFeedback,
  onPrint
}) {
  const GRADES = ['초등 1~2학년', '초등 3~4학년', '초등 5~6학년'];

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-amber-100 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* 로고 & 슬로건 */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-amber-400 to-orange-400 rounded-2xl flex items-center justify-center shadow-md shadow-amber-200 text-2xl rotate-2">
              ✏️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                  아이글쌤
                  <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300/60">
                    초등 글쓰기 완성
                  </span>
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                7대 핵심 기준으로 꼼꼼하게 다듬어주는 어린이 글쓰기 첨삭 교실
              </p>
            </div>
          </div>

          {/* 모바일용 백과 단축 버튼 */}
          <button
            onClick={onOpenRulesModal}
            className="md:hidden p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200"
            title="헷갈리는 우리말 백과"
          >
            <BookOpen className="w-5 h-5" />
          </button>
        </div>

        {/* 학년 선택 탭 */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
          <div className="flex items-center px-2 py-1 text-slate-400 text-[11px]">
            <GraduationCap className="w-3.5 h-3.5 mr-1" /> 학년:
          </div>
          {GRADES.map(grade => (
            <button
              key={grade}
              onClick={() => onSelectGrade(grade)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedGrade === grade
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>

        {/* 우측 버튼 모음 */}
        <div className="flex items-center space-x-2">
          
          {/* 기록 보관함 버튼 */}
          <button
            onClick={onOpenHistoryModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 font-bold text-xs rounded-xl shadow-xs transition-all"
            title="이전에 첨삭한 글과 평가 리포트 보관함 열기"
          >
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <span>기록 보관함</span>
            {historyCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-1.5 py-0.2 rounded-full border border-amber-300">
                {historyCount}
              </span>
            )}
          </button>

          {/* 헷갈리는 우리말 백과 버튼 */}
          <button
            onClick={onOpenRulesModal}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all hover:shadow-md"
          >
            <BookOpen className="w-4 h-4" />
            <span>헷갈리는 우리말 12선</span>
            <Sparkles className="w-3 h-3 text-yellow-200 animate-pulse" />
          </button>

          {/* 인쇄 버튼 (결과가 있을 때 표시) */}
          {hasFeedback && (
            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              title="첨삭 결과 및 원고지 인쇄하기"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>학습지 인쇄</span>
            </button>
          )}

          {/* API 키 설정 버튼 */}
          <button
            onClick={onOpenApiModal}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              apiKey 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse'
            }`}
            title="Gemini API 설정"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey ? 'AI 연결됨' : '키 등록 필요'}</span>
          </button>

        </div>

      </div>
    </header>
  );
}
