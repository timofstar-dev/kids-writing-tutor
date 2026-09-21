import React, { useState, useRef } from 'react';
import { 
  X, 
  Search, 
  Trash2, 
  ArrowRightCircle, 
  FolderOpen, 
  Calendar, 
  User, 
  Award, 
  Download, 
  Upload, 
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Eye
} from 'lucide-react';
import { exportHistoryBackup, importHistoryBackup } from '../services/historyStorage';
import { openRecordInNewWindow } from '../services/reportHtmlGenerator';

export default function HistoryModal({
  isOpen,
  onClose,
  historyList,
  onLoadItem,
  onDeleteItem,
  onClearAll,
  onRefreshHistory
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('전체');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // 알림 메시지 헬퍼
  const showToast = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 2500);
  };

  // 백업 파일 복원 처리
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonStr = event.target?.result;
        const count = await importHistoryBackup(jsonStr);
        await onRefreshHistory();
        showToast(`${count}개의 첨삭 기록을 성공적으로 복원했습니다!`);
      } catch (err) {
        alert('백업 파일을 복원하는 중 오류가 발생했습니다: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 필터링된 기록
  const filteredList = historyList.filter(item => {
    const matchGrade = gradeFilter === '전체' || item.grade === gradeFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      (item.title && item.title.toLowerCase().includes(searchLower)) ||
      (item.studentName && item.studentName.toLowerCase().includes(searchLower)) ||
      (item.essayText && item.essayText.toLowerCase().includes(searchLower)) ||
      (item.createdAt && item.createdAt.includes(searchTerm));
    
    return matchGrade && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border-4 border-amber-200">
        
        {/* 상단 헤더 */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2.5 sm:p-3 rounded-2xl shadow-inner backdrop-blur-xs">
              <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  첨삭 기록 보관함
                </h2>
                <span className="text-xs bg-white/25 text-yellow-100 font-black px-2.5 py-0.5 rounded-full shadow-xs">
                  총 {historyList.length}건
                </span>
              </div>
              <p className="text-amber-100 text-xs sm:text-sm font-medium mt-0.5">
                기록을 클릭하면 첨삭 내용과 함께 깔끔한 새 창(새 탭)으로 즉시 열람 및 인쇄할 수 있습니다.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/10 rounded-full transition-colors text-white"
            title="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 검색 및 필터 툴바 */}
        <div className="p-3.5 sm:p-4 bg-amber-50/70 border-b border-amber-100 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="학생 이름, 글 제목, 본문 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-amber-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {['전체', '초등 1~2학년', '초등 3~4학년', '초등 5~6학년'].map(g => (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  gradeFilter === g
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 토스트 알림 */}
        {actionSuccessMsg && (
          <div className="bg-emerald-50 text-emerald-800 px-4 py-2 border-b border-emerald-200 text-xs font-bold flex items-center gap-1.5 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* 기록 목록 리스트 (가로 스크롤 차단, 완전한 줄바꿈 보장) */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-4 flex-1 bg-slate-50/60">
          {filteredList.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <FolderOpen className="w-12 h-12 mx-auto text-slate-300 opacity-60" />
              <div>
                <p className="font-bold text-slate-600 text-sm sm:text-base">저장된 첨삭 기록이 없습니다</p>
                <p className="text-xs text-slate-400 mt-1">
                  글을 입력하고 [첨삭 받기]를 실행하면 이곳에 자동으로 차곡차곡 보관됩니다.
                </p>
              </div>
            </div>
          ) : (
            filteredList.map((item) => {
              const date = new Date(item.createdAt);
              const formattedDate = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
              const correctionCount = item.feedback?.sentenceCorrections?.length || 0;
              const stamp = item.feedback?.stamp || '참 잘했어요';

              return (
                <div 
                  key={item.id} 
                  className="bg-white rounded-2xl p-5 border-2 border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all flex flex-col gap-3.5 w-full min-w-0 overflow-hidden"
                >
                  
                  {/* 상단 메타 바 & 우측 액션 버튼들 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-lg border border-amber-300">
                        {item.grade || '초등'}
                      </span>
                      <span className="text-xs font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-lg border border-rose-200 flex items-center gap-1">
                        💮 {stamp}
                      </span>
                      {item.studentName && (
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {item.studentName}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* 액션 버튼 3종 (새창 열기 / 불러오기 / 삭제) */}
                    <div className="flex items-center gap-1.5">
                      {/* 새창으로 열기 버튼 */}
                      <button
                        onClick={() => openRecordInNewWindow(item)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-2xs"
                        title="전체 첨삭 결과 및 원고지를 새 창(새 탭)으로 띄워 확인 및 인쇄합니다"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>새창으로 보기</span>
                      </button>

                      {/* 에디터로 불러오기 버튼 */}
                      <button
                        onClick={() => {
                          onLoadItem(item);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
                        title="현재 에디터 화면으로 불러옵니다"
                      >
                        <ArrowRightCircle className="w-3.5 h-3.5" />
                        <span>에디터로 불러오기</span>
                      </button>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => {
                          if (confirm(`'${item.title || '이 기록'}' 첨삭 기록을 정말 삭제하시겠습니까?`)) {
                            onDeleteItem(item.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="기록 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {/* 글 제목 (클릭 시 새창으로 바로 열람) */}
                  <div 
                    onClick={() => openRecordInNewWindow(item)}
                    className="cursor-pointer group/title"
                    title="클릭하여 새 창으로 전체 첨삭 리포트 열기"
                  >
                    <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover/title:text-indigo-600 transition-colors break-words break-keep flex items-center gap-2">
                      <span>{item.title || '제목 없음'}</span>
                      <span className="text-[11px] text-indigo-500 font-bold opacity-0 group-hover/title:opacity-100 transition-opacity flex items-center gap-0.5">
                        <ExternalLink className="w-3 h-3" /> 새창 열기
                      </span>
                    </h3>
                  </div>

                  {/* 본문 내용 (줄바꿈 완벽 적용 & 영역 안에서 말끔히 래핑) */}
                  <div 
                    onClick={() => openRecordInNewWindow(item)}
                    className="w-full bg-slate-50 hover:bg-slate-100/80 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed break-words break-keep whitespace-pre-wrap cursor-pointer transition-colors"
                    title="클릭하여 첨삭 내용 전체를 새 창으로 띄우기"
                  >
                    {item.essayText}
                  </div>

                  {/* 첨삭 총평 및 교정 포인트 수 (말풍선) */}
                  {item.feedback?.overallPraise && (
                    <div 
                      onClick={() => openRecordInNewWindow(item)}
                      className="w-full bg-amber-50/80 hover:bg-amber-100/70 p-3 rounded-xl border border-amber-200/70 text-xs text-amber-950 font-medium break-words break-keep flex items-start gap-2 cursor-pointer transition-colors"
                      title="클릭하여 첨삭 내용 전체를 새 창으로 띄우기"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="leading-relaxed">{item.feedback.overallPraise}</p>
                        <div className="mt-1.5 text-[11px] text-indigo-700 font-bold flex items-center gap-1">
                          <span>✨ 총 {correctionCount}개 문장 첨삭 완료</span>
                          <span className="text-slate-400 font-normal">|</span>
                          <span className="underline">첨삭 상세표 및 200자 원고지 새 창으로 확인하기 ➔</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* 하단 백업 및 관리 풋터 */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* 백업 파일 다운로드 */}
            <button
              onClick={() => exportHistoryBackup()}
              disabled={historyList.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-40"
              title="저장된 모든 첨삭 기록을 컴퓨터 파일(.json)로 안전하게 백업합니다"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>백업 파일 저장 (.json)</span>
            </button>

            {/* 백업 파일 복원 */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              title="이전에 백업해둔 .json 파일을 불러와 기록을 복원합니다"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>백업 복원하기</span>
            </button>

            {/* 전체 삭제 */}
            {historyList.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('보관함에 있는 모든 첨삭 기록을 정말 초기화하시겠습니까? (삭제된 데이터는 복구할 수 없습니다)')) {
                    onClearAll();
                  }
                }}
                className="px-2.5 py-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors ml-1"
              >
                전체 비우기
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            닫기
          </button>

        </div>

      </div>
    </div>
  );
}
