import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import FeedbackPanel from './components/FeedbackPanel';
import KoreanRulesModal from './components/KoreanRulesModal';
import ApiKeyModal from './components/ApiKeyModal';
import HistoryModal from './components/HistoryModal';
import PdfOcrModal from './components/PdfOcrModal';
import { evaluateKidsEssay } from './services/aiService';
import { getAllHistory, saveHistoryItem, deleteHistoryItem, clearAllHistory } from './services/historyStorage';
import { SAMPLE_ESSAYS } from './data/sampleEssays';
import { Sparkles, AlertCircle, CheckCircle, FolderCheck } from 'lucide-react';

export default function App() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('kids_gemini_api_key') || envKey;
  });
  const [modelName, setModelName] = useState(() => {
    return localStorage.getItem('kids_gemini_model') || 'gemini-3.1-flash-lite';
  });
  const [selectedGrade, setSelectedGrade] = useState('초등 3~4학년');
  const [studentName, setStudentName] = useState(SAMPLE_ESSAYS[1].author);
  const [essayTitle, setEssayTitle] = useState(SAMPLE_ESSAYS[1].title);
  const [essayText, setEssayText] = useState(SAMPLE_ESSAYS[1].text); // 기본 독후감 예시 장착
  const [feedback, setFeedback] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // 모달 상태
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPdfOcrModalOpen, setIsPdfOcrModalOpen] = useState(false);

  // 기록 보관함 상태
  const [historyList, setHistoryList] = useState([]);
  const [currentHistoryId, setCurrentHistoryId] = useState(null);

  // 초기 기록 보관함 IndexedDB 데이터 로드
  useEffect(() => {
    loadHistoryList();
  }, []);

  const loadHistoryList = async () => {
    try {
      const items = await getAllHistory();
      setHistoryList(items);
    } catch (err) {
      console.error('기록 목록 로딩 실패:', err);
    }
  };

  // API 키 저장 핸들러
  const handleSaveApiKey = (newKey) => {
    setApiKey(newKey);
    localStorage.setItem('kids_gemini_api_key', newKey);
  };

  const handleSaveModelName = (newModel) => {
    setModelName(newModel);
    localStorage.setItem('kids_gemini_model', newModel);
  };

  // 첨삭 실행
  const handleEvaluate = async () => {
    if (!apiKey.trim()) {
      setIsApiModalOpen(true);
      setEvalError('Gemini API 키가 필요합니다. 상단 설정에서 키를 확인해주세요.');
      return;
    }
    if (!essayText.trim()) {
      setEvalError('학생이 쓴 글 내용을 입력해주세요.');
      return;
    }

    setIsEvaluating(true);
    setEvalError('');
    setSaveSuccessMsg('');

    try {
      const result = await evaluateKidsEssay({
        apiKey,
        essayText,
        grade: selectedGrade,
        modelName
      });

      setFeedback(result);

      // 자동 보관함 저장 (내용, 첨삭 결과 영구 보존)
      try {
        const recordTitle = essayTitle.trim() || essayText.trim().split('\n')[0].slice(0, 30) || '초등 글쓰기 첨삭';
        const newRecord = {
          id: currentHistoryId || undefined,
          title: recordTitle,
          studentName: studentName.trim() || '학생',
          grade: selectedGrade,
          essayText: essayText,
          feedback: result,
          createdAt: new Date().toISOString()
        };

        const saved = await saveHistoryItem(newRecord);
        setCurrentHistoryId(saved.id);
        await loadHistoryList();
        setSaveSuccessMsg(`'${recordTitle}' 글과 첨삭 결과가 보관함에 안전하게 자동 저장되었습니다!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } catch (saveErr) {
        console.error('자동 저장 오류:', saveErr);
      }

      // 모바일 등에서 첨삭 결과 위치로 부드럽게 스크롤
      setTimeout(() => {
        const resultElem = document.getElementById('feedback-section');
        if (resultElem) {
          resultElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    } catch (err) {
      console.error(err);
      setEvalError(err.message || '첨삭 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // 보관함에서 이전 기록 불러오기
  // PDF OCR 변환 결과 적용 핸들러
  const handleApplyOcrToMain = ({ title, studentName: sName, body }) => {
    if (title) setEssayTitle(title);
    if (sName) setStudentName(sName);
    if (body) setEssayText(body);
    setSaveSuccessMsg('✨ 변환된 학생 글이 입력창에 자동 등록되었습니다! 바로 [첨삭 받기]를 눌러보세요.');
    setTimeout(() => setSaveSuccessMsg(''), 4500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadHistoryItem = (item) => {
    setCurrentHistoryId(item.id);
    setEssayTitle(item.title || '');
    setStudentName(item.studentName || '');
    setSelectedGrade(item.grade || '초등 3~4학년');
    setEssayText(item.essayText || '');
    setFeedback(item.feedback || null);
    setEvalError('');
    setSaveSuccessMsg(`'${item.title || '선택한 글'}' 기록을 성공적으로 불러왔습니다.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);

    // 결과가 있으면 결과 섹션으로 부드럽게 스크롤
    if (item.feedback) {
      setTimeout(() => {
        const resultElem = document.getElementById('feedback-section');
        if (resultElem) {
          resultElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  };

  // 특정 기록 삭제
  const handleDeleteHistoryItem = async (id) => {
    try {
      // 낙관적 UI 업데이트 (즉각 반영)
      setHistoryList(prev => prev.filter(item => item.id !== id));
      await deleteHistoryItem(id);
      await loadHistoryList();
      if (currentHistoryId === id) {
        setCurrentHistoryId(null);
      }
      return true;
    } catch (err) {
      console.error('삭제 중 오류가 발생했습니다:', err);
      await loadHistoryList();
      throw err;
    }
  };

  // 모든 기록 초기화
  const handleClearAllHistory = async () => {
    try {
      setHistoryList([]);
      await clearAllHistory();
      setCurrentHistoryId(null);
      return true;
    } catch (err) {
      console.error('초기화 중 오류가 발생했습니다:', err);
      await loadHistoryList();
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-800 flex flex-col font-sans selection:bg-amber-200 selection:text-amber-900">
      
      {/* 고정 상단 네비게이션 헤더 */}
      <Header
        selectedGrade={selectedGrade}
        onSelectGrade={setSelectedGrade}
        onOpenRulesModal={() => setIsRulesModalOpen(true)}
        onOpenApiModal={() => setIsApiModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenPdfOcrModal={() => setIsPdfOcrModalOpen(true)}
        historyCount={historyList.length}
        apiKey={apiKey}
        hasFeedback={!!feedback}
        onPrint={() => window.print()}
      />

      {/* 메인 컨테이너 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-8">
        
        {/* 인트로 환영 배너 (상단) */}
        <section className="text-center max-w-3xl mx-auto space-y-2.5 no-print">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/80 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>선생님과 학생이 함께 쓰는 맞춤형 글쓰기 도우미</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            우리 아이 글쓰기, 7가지 기준으로 완성해요!
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            스캔한 공책(PDF·사진)을 보며 직접 타이핑하거나 TXT 파일로 손쉽게 올려보세요.<br className="hidden sm:inline" />
            작성한 글과 첨삭 결과는 상단 <strong>[기록 보관함]</strong>에 안전하게 영구 저장되어 언제든 다시 불러올 수 있습니다.
          </p>
        </section>

        {/* 1단계: 글 입력 및 파일 업로드 패널 */}
        <section>
          <InputPanel
            essayText={essayText}
            setEssayText={setEssayText}
            studentName={studentName}
            setStudentName={setStudentName}
            essayTitle={essayTitle}
            setEssayTitle={setEssayTitle}
            onEvaluate={handleEvaluate}
            isEvaluating={isEvaluating}
            selectedGrade={selectedGrade}
            apiKey={apiKey}
            modelName={modelName}
            onOpenPdfOcrModal={() => setIsPdfOcrModalOpen(true)}
          />
        </section>

        {/* 자동 저장 알림 배너 */}
        {saveSuccessMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in no-print shadow-xs">
            <FolderCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* 에러 메시지 알림 배너 */}
        {evalError && (
          <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm font-semibold text-rose-700 animate-in fade-in no-print">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{evalError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  handleSaveModelName('gemini-3.1-flash-lite');
                  handleEvaluate();
                }}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
              >
                <span>⚡ 안정적인 모델로 재시도</span>
              </button>
              {!apiKey && (
                <button
                  onClick={() => setIsApiModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
                >
                  API 키 설정
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2단계: 첨삭 결과 패널 */}
        {feedback && (
          <section id="feedback-section" className="scroll-mt-20">
            <FeedbackPanel
              feedback={feedback}
              selectedGrade={selectedGrade}
              originalText={essayText}
              studentName={studentName}
              essayTitle={essayTitle}
              onOpenRulesModal={() => setIsRulesModalOpen(true)}
            />
          </section>
        )}

        {/* 대기 안내 배너 (결과가 아직 없을 때) */}
        {!feedback && !isEvaluating && (
          <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50 text-center space-y-3 text-slate-400 no-print">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
              <FolderCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-700">
              글을 입력하고 [첨삭 받기]를 눌러보세요!
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              위의 입력창에 학생의 글을 넣고 버튼을 누르면, 7가지 핵심 기준에 맞춘 문장별 1:1 대조 첨삭과 200자 원고지 양식 미리보기가 즉시 생성되며 보관함에 자동 저장됩니다.
            </p>
          </div>
        )}

      </main>

      {/* 푸터 */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1">
            <span className="font-bold text-slate-600">우현글쌤</span> - 초등학생 글쓰기 완성 첨삭 프로그램
          </p>
          <p>© 2026 Kids Writing Tutor. 초등 국어 교육과정 7대 핵심 역량 반영 & 첨삭 기록 영구 보관.</p>
        </div>
      </footer>

      {/* 헷갈리는 우리말 12선 공식 백과 모달 */}
      <KoreanRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* Gemini API 키 및 모델 설정 모달 */}
      <ApiKeyModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveApiKey}
        modelName={modelName}
        onChangeModel={handleSaveModelName}
      />

      {/* 첨삭 기록 보관함 모달 */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        historyList={historyList}
        onLoadItem={handleLoadHistoryItem}
        onDeleteItem={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
        onRefreshHistory={loadHistoryList}
      />

      {/* 학생 글쓰기 PDF ➔ 마크다운 & 구글 문서 변환기 모달 */}
      <PdfOcrModal
        isOpen={isPdfOcrModalOpen}
        onClose={() => setIsPdfOcrModalOpen(false)}
        apiKey={apiKey}
        modelName={modelName}
        onOpenApiModal={() => setIsApiModalOpen(true)}
        onApplyToMain={handleApplyOcrToMain}
      />

    </div>
  );
}
