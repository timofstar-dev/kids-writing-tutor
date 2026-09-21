import React, { useState } from 'react';
import { X, BookOpen, CheckCircle2, HelpCircle, Sparkles, Search } from 'lucide-react';
import { KOREAN_TRICKY_RULES } from '../data/koreanRules';

export default function KoreanRulesModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [quizAnswers, setQuizAnswers] = useState({});

  if (!isOpen) return null;

  const categories = ['전체', ...new Set(KOREAN_TRICKY_RULES.map(r => r.category))];

  const filteredRules = KOREAN_TRICKY_RULES.filter(rule => {
    const matchesSearch = rule.pair.includes(searchTerm) || 
                          rule.summary.includes(searchTerm) || 
                          rule.explanation.includes(searchTerm);
    const matchesCat = selectedCategory === '전체' || rule.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleQuizSelect = (ruleId, optionIdx) => {
    setQuizAnswers(prev => ({
      ...prev,
      [ruleId]: optionIdx
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border-4 border-amber-200">
        
        {/* 모달 상단 헤더 */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 p-6 text-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/90 p-3 rounded-2xl shadow-sm">
              <BookOpen className="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                헷갈리는 우리말 쏙쏙 백과
                <span className="text-xs bg-white/90 text-amber-800 font-bold px-2.5 py-1 rounded-full shadow-xs">
                  초등 필수 12선
                </span>
              </h2>
              <p className="text-amber-950/80 text-sm font-medium mt-0.5">
                아이들이 가장 자주 틀리는 12가지 맞춤법 공식을 한눈에 배워요!
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/10 rounded-full transition-colors text-slate-800"
            title="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 검색 및 카테고리 필터 */}
        <div className="p-4 bg-amber-50/60 border-b border-amber-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="예: 돼/되, 다르다, 로서, 띄어쓰기..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-amber-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === cat 
                    ? 'bg-amber-500 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 규칙 목록 카드 스크롤 영역 */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {filteredRules.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              검색 결과가 없습니다. 다른 단어로 검색해 보세요.
            </div>
          ) : (
            filteredRules.map((rule) => {
              const userAnswer = quizAnswers[rule.id];
              const isQuizAnswered = userAnswer !== undefined;
              const isCorrect = userAnswer === rule.quiz.answer;

              return (
                <div 
                  key={rule.id} 
                  className="bg-white rounded-2xl p-5 border-2 border-slate-200 hover:border-amber-300 shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                        {rule.pair}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
                        {rule.category}
                      </span>
                    </div>
                    <span className="text-xs text-amber-700 font-bold bg-amber-100/60 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      초등 비법 공식
                    </span>
                  </div>

                  {/* 공식 요약 배너 */}
                  <div className="bg-amber-50/80 border-l-4 border-amber-400 p-3 rounded-r-xl mb-4">
                    <p className="text-sm font-bold text-amber-900 leading-snug">
                      💡 {rule.summary}
                    </p>
                    <p className="text-xs text-amber-700 mt-1 font-medium">
                      규칙 공식: {rule.formula}
                    </p>
                  </div>

                  {/* 틀린 예 vs 맞은 예 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-xs">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <span className="font-bold text-rose-700 flex items-center gap-1 mb-1">
                        ❌ 자주 하는 실수
                      </span>
                      <p className="text-slate-700 line-through decoration-rose-400">{rule.wrongExample}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <span className="font-bold text-emerald-700 flex items-center gap-1 mb-1">
                        ⭕ 이렇게 바르게 써요!
                      </span>
                      <p className="text-slate-800 font-semibold">{rule.rightExample}</p>
                    </div>
                  </div>

                  {/* 다정한 설명 */}
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-4">
                    {rule.explanation}
                  </p>

                  {/* 미니 퀴즈 코너 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 mb-2">
                      <HelpCircle className="w-4 h-4 text-blue-500" />
                      직접 맞춰보는 미니 퀴즈
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mb-2.5">
                      Q. {rule.quiz.question}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {rule.quiz.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuizSelect(rule.id, idx)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            userAnswer === idx
                              ? idx === rule.quiz.answer
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-rose-500 text-white border-rose-500 shadow-sm'
                              : 'bg-white text-slate-700 border-blue-200 hover:bg-blue-100/50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    {isQuizAnswered && (
                      <div className={`mt-2.5 text-xs font-semibold p-2 rounded-lg flex items-center gap-1.5 ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>딩동댕! 정답입니다! {rule.quiz.why}</span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>아쉬워요! 다시 확인해 보세요. ({rule.quiz.why})</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* 모달 하단 */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-sm"
          >
            확인했어요!
          </button>
        </div>

      </div>
    </div>
  );
}
