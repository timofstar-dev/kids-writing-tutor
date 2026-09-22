import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Sparkles, 
  Loader2, 
  Check, 
  Copy, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Code, 
  Send, 
  AlertCircle, 
  HelpCircle,
  FileCheck2,
  RefreshCw,
  Layers,
  FileDown,
  CheckSquare
} from 'lucide-react';
import { 
  renderAllPagesFromPdf, 
  extractMarkdownFromImage, 
  extractMarkdownFromMultiplePages, 
  markdownToGoogleDocsHtml, 
  copyGoogleDocsRichText, 
  parseStudentMetadata 
} from '../services/pdfOcrService';

export default function PdfOcrModal({
  isOpen,
  onClose,
  apiKey,
  modelName,
  onOpenApiModal,
  onApplyToMain
}) {
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedPages, setSelectedPages] = useState([]); // 선택된 페이지 번호 배열 e.g. [1, 2]
  const [fileName, setFileName] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // 변환 상태
  const [ocrMode, setOcrMode] = useState('preserve'); // 'preserve' | 'clean'
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState({ current: 0, total: 0, percentage: 0, status: '' });
  const [markdownResult, setMarkdownResult] = useState('');
  const [activeEditorTab, setActiveEditorTab] = useState('markdown'); // 'markdown' | 'gdocs_preview'
  const [errorMessage, setErrorMessage] = useState('');
  const [copySuccessMsg, setCopySuccessMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  // 모달 닫힐 때 또는 열릴 때 초기화
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('');
      setCopySuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (isProcessing) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload({ target: { files: [file] } });
    }
  };

  // 파일 업로드 처리
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setCopySuccessMsg('');
    setFileName(file.name);
    setIsProcessing(true);
    setProgressInfo({ current: 0, total: 0, percentage: 10, status: '파일 로딩 및 렌더링 준비 중...' });

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      setErrorMessage('PDF 문서 또는 이미지(PNG, JPG) 파일을 업로드해주세요.');
      setIsProcessing(false);
      return;
    }

    try {
      if (isPdf) {
        setProgressInfo({ current: 0, total: 0, percentage: 30, status: 'PDF 고해상도 페이지 렌더링 중...' });
        const renderedPages = await renderAllPagesFromPdf(file, 15, 1.8);
        if (renderedPages.length === 0) {
          throw new Error('PDF에서 페이지를 읽을 수 없습니다.');
        }
        setPages(renderedPages);
        setCurrentPageIndex(0);
        setSelectedPages(renderedPages.map(p => p.pageNum));
        setZoomLevel(1);
        setRotation(0);
      } else {
        // 단일 이미지
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result;
          setPages([{
            pageNum: 1,
            dataUrl: dataUrl,
            totalPages: 1
          }]);
          setCurrentPageIndex(0);
          setSelectedPages([1]);
          setZoomLevel(1);
          setRotation(0);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('파일을 불러오는데 실패했습니다: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProgressInfo({ current: 0, total: 0, percentage: 0, status: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 페이지 선택 토글
  const togglePageSelection = (pageNum) => {
    setSelectedPages(prev => 
      prev.includes(pageNum)
        ? prev.filter(p => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const handleSelectAllPages = () => {
    setSelectedPages(pages.map(p => p.pageNum));
  };

  const handleDeselectAllPages = () => {
    setSelectedPages([]);
  };

  // 전체 페이지 일괄 마크다운 OCR 변환 실행
  const handleRunAllPagesOcr = async () => {
    if (!pages || pages.length === 0) {
      setErrorMessage('먼저 PDF 또는 이미지 파일을 등록해주세요.');
      return;
    }
    if (!apiKey) {
      setErrorMessage('Gemini API 키가 필요합니다. 상단 또는 아래 버튼을 눌러 API 키를 입력해주세요.');
      return;
    }

    // 전체 페이지를 선택 상태로도 동기화
    setSelectedPages(pages.map(p => p.pageNum));
    setIsProcessing(true);
    setErrorMessage('');
    setCopySuccessMsg('');

    try {
      const fullMarkdown = await extractMarkdownFromMultiplePages({
        apiKey,
        pages,
        mode: ocrMode,
        modelName,
        onProgress: (p) => setProgressInfo(p)
      });

      setMarkdownResult(fullMarkdown);
      setActiveEditorTab('gdocs_preview');
      showToast(`✨ 전체 ${pages.length}개 페이지 OCR 변환이 완료되었습니다!`);
    } catch (err) {
      console.error(err);
      setErrorMessage('전체 페이지 마크다운 변환 중 오류: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProgressInfo({ current: 0, total: 0, percentage: 0, status: '' });
    }
  };

  // 체크박스로 선택한 페이지만 OCR 변환 실행
  const handleRunSelectedPagesOcr = async () => {
    if (!pages || pages.length === 0) {
      setErrorMessage('먼저 PDF 또는 이미지 파일을 등록해주세요.');
      return;
    }
    if (selectedPages.length === 0) {
      setErrorMessage('OCR을 적용할 페이지를 체크박스로 최소 1쪽 이상 선택해주세요.');
      return;
    }
    if (!apiKey) {
      setErrorMessage('Gemini API 키가 필요합니다. 상단 또는 아래 버튼을 눌러 API 키를 입력해주세요.');
      return;
    }

    const pagesToRun = pages
      .filter(p => selectedPages.includes(p.pageNum))
      .sort((a, b) => a.pageNum - b.pageNum);

    setIsProcessing(true);
    setErrorMessage('');
    setCopySuccessMsg('');

    try {
      const fullMarkdown = await extractMarkdownFromMultiplePages({
        apiKey,
        pages: pagesToRun,
        mode: ocrMode,
        modelName,
        onProgress: (p) => setProgressInfo(p)
      });

      setMarkdownResult(fullMarkdown);
      setActiveEditorTab('gdocs_preview');
      showToast(`✨ 선택한 ${pagesToRun.length}개 페이지(제 ${pagesToRun.map(p => p.pageNum).join(', ')}쪽) OCR 변환이 완료되었습니다!`);
    } catch (err) {
      console.error(err);
      setErrorMessage('선택 페이지 마크다운 변환 중 오류: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProgressInfo({ current: 0, total: 0, percentage: 0, status: '' });
    }
  };

  // 현재 페이지만 변환 실행
  const handleRunCurrentPageOcr = async () => {
    if (!pages || pages.length === 0) return;
    if (!apiKey) {
      setErrorMessage('Gemini API 키가 필요합니다.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setCopySuccessMsg('');
    const curPage = pages[currentPageIndex];

    try {
      setProgressInfo({
        current: 1,
        total: 1,
        percentage: 50,
        status: `${curPage.pageNum}쪽 판독 중...`
      });

      const md = await extractMarkdownFromImage({
        apiKey,
        base64Image: curPage.dataUrl,
        mode: ocrMode,
        modelName,
        pageNum: curPage.pageNum
      });

      // 기존 텍스트에 덧붙이거나 교체
      setMarkdownResult((prev) => {
        if (!prev.trim()) return md;
        return `${prev}\n\n<!-- 📄 제 ${curPage.pageNum}쪽 추가 -->\n\n${md}`;
      });
      setActiveEditorTab('gdocs_preview');
      showToast(`✨ ${curPage.pageNum}쪽 변환이 완료되었습니다!`);
    } catch (err) {
      setErrorMessage(`${curPage.pageNum}쪽 변환 오류: ` + err.message);
    } finally {
      setIsProcessing(false);
      setProgressInfo({ current: 0, total: 0, percentage: 0, status: '' });
    }
  };

  // 샘플 데이터 즉시 불러오기 (테스트 편의용)
  const handleLoadSampleEssay = () => {
    const sampleMd = `# 어린 왕자를 읽고

**글쓴이:** 이준우 (초등 4학년) | **날짜:** 2026. 09. 22

어제 밤에 도서관에서 빌려온 어린 왕자 책을 읽었다. 
비행기 조종사가 사막에 불시착했을 때 어린 왕자가 나타나서 양을 그려달라고 했다. 

처음에는 왜 상자 안에 양이 들어있다고 했을 때 어린 왕자가 기뻐했는지 잘 이해가 안갔다. 
하지만 여우가 중요한 것은 눈에 보이지 않고 마음으로 보아야 한다고 말했을 때 가슴이 뭉클했다. 

나도 내 짝꿍 민호와 싸우고 나서 서먹했었는데, 민호에게 먼저 다가가서 사과해야 겠다고 생각했다. 
길들인다는 것은 서로에게 세상에서 오직 하나뿐인 특별한 존재가 되는 것이기 때문이다.`;

    setMarkdownResult(sampleMd);
    setFileName('샘플_초등독서록.pdf');
    setActiveEditorTab('gdocs_preview');
    showToast('💡 샘플 마크다운 텍스트를 불러왔습니다.');
  };

  // 토스트 메시지
  const showToast = (msg) => {
    setCopySuccessMsg(msg);
    setTimeout(() => {
      setCopySuccessMsg('');
    }, 4500);
  };

  // 구글 문서 Rich-Text 복사
  const handleCopyGoogleDocs = async () => {
    if (!markdownResult.trim()) {
      setErrorMessage('복사할 변환 결과가 없습니다.');
      return;
    }

    try {
      const html = markdownToGoogleDocsHtml(markdownResult);
      await copyGoogleDocsRichText(html, markdownResult);
      showToast('📋 구글 문서(Google Docs) 서식 복사 완료! 구글 문서 열고 Ctrl+V 누르시면 제목/본문 서식이 완벽하게 붙여넣어집니다.');
    } catch (err) {
      setErrorMessage('구글 문서 복사 중 오류: ' + err.message);
    }
  };

  // 마크다운 복사
  const handleCopyMarkdown = async () => {
    if (!markdownResult.trim()) return;
    try {
      await navigator.clipboard.writeText(markdownResult);
      showToast('📋 마크다운(.md) 코드가 클립보드에 복사되었습니다.');
    } catch (err) {
      setErrorMessage('복사 오류: ' + err.message);
    }
  };

  // .md 다운로드
  const handleDownloadMarkdown = () => {
    if (!markdownResult.trim()) return;
    const blob = new Blob([markdownResult], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName ? fileName.replace(/\.[^/.]+$/, '') : '학생글쓰기') + '.md';
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 마크다운(.md) 파일이 다운로드되었습니다.');
  };

  // .txt 다운로드
  const handleDownloadTxt = () => {
    if (!markdownResult.trim()) return;
    const blob = new Blob([markdownResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName ? fileName.replace(/\.[^/.]+$/, '') : '학생글쓰기') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 텍스트(.txt) 파일이 다운로드되었습니다.');
  };

  // 우현글쌤 본체 첨삭창으로 전달
  const handleApplyToTutor = () => {
    if (!markdownResult.trim()) return;
    const parsed = parseStudentMetadata(markdownResult);
    if (onApplyToMain) {
      onApplyToMain({
        title: parsed.title,
        studentName: parsed.studentName,
        body: parsed.body
      });
    }
    onClose();
  };

  const currentPage = pages[currentPageIndex];
  const charCount = markdownResult.length;
  const wordCount = markdownResult.trim() ? markdownResult.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#faf9f6] w-full max-w-7xl h-[92vh] max-h-[950px] rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden text-slate-800">
        
        {/* 상단 모달 헤더 */}
        <div className="px-6 py-4 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  학생 PDF ➔ 마크다운 & 구글 문서 변환기
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-extrabold bg-purple-100 text-purple-800 rounded-full border border-purple-200">
                  AI OCR Studio
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                손글씨 PDF·사진을 원문 그대로 마크다운이나 서식 있는 구글 문서 형태로 똑같이 변환합니다.
              </p>
            </div>
          </div>

          {/* 우측 옵션 & 닫기 */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* 판독 모드 토글 */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setOcrMode('preserve')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  ocrMode === 'preserve'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="학생의 오탈자, 띄어쓰기, 줄바꿈을 원문 그대로 100% 보존합니다."
              >
                🎯 원문 충실 보존
              </button>
              <button
                onClick={() => setOcrMode('clean')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  ocrMode === 'clean'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="단락과 제목 서식을 보기 편하게 정돈합니다."
              >
                ✨ 가독성 정돈
              </button>
            </div>

            {/* API 키 상태 */}
            {!apiKey && (
              <button
                onClick={onOpenApiModal}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5 animate-pulse"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>API 키 등록</span>
              </button>
            )}

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 안내 또는 에러 배너 */}
        {errorMessage && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold text-rose-700 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-400 hover:text-rose-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {copySuccessMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold text-emerald-800 animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{copySuccessMsg}</span>
            </div>
            <button
              onClick={() => setCopySuccessMsg('')}
              className="text-emerald-500 hover:text-emerald-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 진행률 바 (OCR 동작 중일 때) */}
        {isProcessing && (
          <div className="mx-6 mt-3 p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                {progressInfo.status || 'AI가 문서를 꼼꼼하게 판독 중입니다...'}
              </span>
              <span>{progressInfo.percentage || 20}%</span>
            </div>
            <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(progressInfo.percentage, 15)}%` }}
              />
            </div>
          </div>
        )}

        {/* 메인 2단 분할 워크스페이스 */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
          
          {/* ======================================================== */}
          {/* [좌측] 원본 PDF / 이미지 뷰어 (5컬럼) */}
          {/* ======================================================== */}
          <div 
            className={`lg:col-span-5 bg-slate-900/95 border-r border-slate-700/60 flex flex-col overflow-hidden text-slate-100 transition-colors ${
              isDragging ? 'ring-2 ring-indigo-500 ring-inset bg-slate-800/95' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            
            {/* 좌측 상단 툴바 */}
            <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>PDF/사진 열기</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {pages.length === 0 && (
                  <button
                    onClick={handleLoadSampleEssay}
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-xl transition-all"
                    title="샘플 글 불러와 테스트하기"
                  >
                    💡 샘플 불러오기
                  </button>
                )}
              </div>

              {/* 줌 / 회전 컨트롤 */}
              {pages.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.6))}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg"
                    title="축소"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-400 min-w-[38px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2.5))}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg"
                    title="확대"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg"
                    title="90도 회전"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 원본 캔버스/이미지 표시 영역 */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative select-none">
              {currentPage ? (
                <div 
                  className="transition-transform duration-150 origin-center max-w-full"
                  style={{ 
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)` 
                  }}
                >
                  <img
                    src={currentPage.dataUrl}
                    alt={`Page ${currentPage.pageNum}`}
                    className="max-w-full rounded-md shadow-2xl border border-slate-700 bg-white"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400 space-y-4 max-w-xs">
                  <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-indigo-400">
                    <Upload className="w-8 h-8 opacity-70" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">학생 글쓰기 PDF 업로드</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      초등학생이 쓴 공책 스캔본, 원고지 사진, 디지털 PDF 파일을 올려주세요.<br/>
                      이곳에 파일을 드래그 앤 드롭하거나 아래 버튼을 클릭하세요.
                    </p>
                  </div>
                  <label className="inline-block cursor-pointer px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all">
                    📄 파일 선택하기
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* 페이지 네비게이션 & 변환 액션 바 */}
            {pages.length > 0 && (
              <div className="p-3 bg-slate-800/90 border-t border-slate-700 space-y-2.5 shrink-0">
                {/* 페이지 이동 툴바 */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <button
                      onClick={() => setCurrentPageIndex(p => Math.max(p - 1, 0))}
                      disabled={currentPageIndex === 0}
                      className="p-1 rounded-lg hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold font-mono">
                      {currentPageIndex + 1} / {pages.length} 쪽
                    </span>
                    <button
                      onClick={() => setCurrentPageIndex(p => Math.min(p + 1, pages.length - 1))}
                      disabled={currentPageIndex === pages.length - 1}
                      className="p-1 rounded-lg hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 truncate max-w-[160px]">
                    {fileName}
                  </span>
                </div>

                {/* 썸네일 스트립 및 페이지별 체크박스 선택 영역 */}
                {pages.length > 1 && (
                  <div className="bg-slate-900/90 rounded-2xl p-2.5 border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>OCR 적용 페이지 체크 ({selectedPages.length}/{pages.length}쪽 선택됨)</span>
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          onClick={handleSelectAllPages}
                          className="text-indigo-300 hover:text-white font-bold hover:underline transition-colors cursor-pointer"
                        >
                          전체 선택
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          onClick={handleDeselectAllPages}
                          className="text-slate-400 hover:text-white font-medium hover:underline transition-colors cursor-pointer"
                        >
                          전체 해제
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {pages.map((p, idx) => {
                        const isChecked = selectedPages.includes(p.pageNum);
                        const isCurrent = idx === currentPageIndex;
                        return (
                          <div
                            key={idx}
                            onClick={() => setCurrentPageIndex(idx)}
                            className={`relative shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                              isCurrent 
                                ? 'border-indigo-400 ring-2 ring-indigo-400/50 shadow-md' 
                                : isChecked 
                                ? 'border-indigo-500/80' 
                                : 'border-slate-700 opacity-60 hover:opacity-100'
                            }`}
                            style={{ width: '56px', height: '74px' }}
                            title={`클릭하여 ${p.pageNum}쪽 미리보기`}
                          >
                            <img src={p.dataUrl} alt={`p${p.pageNum}`} className="w-full h-full object-cover" />
                            
                            {/* 체크박스 오버레이 */}
                            <div 
                              className="absolute top-1 left-1 bg-black/75 rounded-md p-0.5 shadow-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePageSelection(p.pageNum);
                              }}
                              title={isChecked ? `${p.pageNum}쪽 선택 해제` : `${p.pageNum}쪽 OCR 선택`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // 부모 div 클릭에서 처리
                                className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer block"
                              />
                            </div>

                            {/* 쪽 번호 배지 */}
                            <span className={`absolute bottom-0 right-0 text-[10px] px-1.5 py-0.5 font-mono font-bold rounded-tl-md ${
                              isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {p.pageNum}쪽
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 현재 보고 있는 페이지 체크 토글 바 */}
                {currentPage && pages.length > 1 && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 rounded-xl border border-slate-700/60 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white">
                      <input
                        type="checkbox"
                        checked={selectedPages.includes(currentPage.pageNum)}
                        onChange={() => togglePageSelection(currentPage.pageNum)}
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                      />
                      <span className="font-semibold">
                        현재 보고 있는 <strong className="text-indigo-300">{currentPage.pageNum}쪽</strong>을 OCR 변환 대상에 포함
                      </span>
                    </label>
                    <span className="text-[11px] font-bold">
                      {selectedPages.includes(currentPage.pageNum) ? (
                        <span className="text-emerald-400">✅ 포함됨</span>
                      ) : (
                        <span className="text-slate-400">⚪ 제외됨</span>
                      )}
                    </span>
                  </div>
                )}

                {/* OCR 실행 버튼들: 전체 페이지 OCR vs 선택 페이지 OCR */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* 전체 페이지 OCR 적용 버튼 */}
                    <button
                      onClick={handleRunAllPagesOcr}
                      disabled={isProcessing}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:to-pink-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title="1쪽부터 끝까지 모든 페이지를 순서대로 판독하여 하나로 합칩니다"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      )}
                      <span>전체 페이지 OCR 적용 (총 {pages.length}쪽)</span>
                    </button>

                    {/* 선택한 페이지 OCR 적용 버튼 */}
                    <button
                      onClick={handleRunSelectedPagesOcr}
                      disabled={isProcessing || selectedPages.length === 0}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title="체크박스로 선택한 페이지만 순서대로 판독하여 하나로 합칩니다"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-200" />
                      <span>선택한 페이지 OCR 적용 ({selectedPages.length}쪽)</span>
                    </button>
                  </div>

                  {pages.length > 1 && (
                    <button
                      onClick={handleRunCurrentPageOcr}
                      disabled={isProcessing}
                      className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white font-medium text-[11px] rounded-lg transition-all flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                    >
                      <span>현재 보고 있는 {currentPageIndex + 1}쪽만 단독 변환하여 덧붙이기</span>
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* ======================================================== */}
          {/* [우측] 변환 결과 & 구글 문서 서식 에디터 (7컬럼) */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 bg-[#fbfaf8] flex flex-col overflow-hidden">
            
            {/* 우측 상단 탭 헤더 */}
            <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setActiveEditorTab('markdown')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeEditorTab === 'markdown'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>마크다운 (.md) 에디터</span>
                </button>

                <button
                  onClick={() => setActiveEditorTab('gdocs_preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeEditorTab === 'gdocs_preview'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>구글 문서 (Docs) 서식 뷰</span>
                </button>
              </div>

              {/* 메타 카운터 */}
              <div className="text-[11.5px] text-slate-400 font-medium">
                공백 포함 <strong>{charCount}</strong>자 · <strong>{wordCount}</strong>단어
              </div>

            </div>

            {/* 에디터 본문 영역 */}
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              
              {activeEditorTab === 'markdown' ? (
                <div className="h-full flex flex-col">
                  <textarea
                    value={markdownResult}
                    onChange={(e) => setMarkdownResult(e.target.value)}
                    placeholder="왼쪽에서 PDF/이미지를 올리고 [일괄 마크다운 변환]을 실행하면, 학생이 작성한 내용이 마크다운 서식으로 여기에 똑같이 생성됩니다. 직접 자유롭게 수정하실 수 있습니다."
                    className="w-full flex-1 min-h-[380px] p-5 bg-white border-2 border-slate-200/80 rounded-2xl text-sm leading-relaxed text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100 outline-hidden transition-all resize-none font-mono selection:bg-indigo-100"
                  />
                  <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-slate-400" />
                    <span># 제목, ## 소제목, **글쓴이**, 단락 빈 줄 구분 등을 자유롭게 추가하거나 다듬을 수 있습니다.</span>
                  </p>
                </div>
              ) : (
                /* 구글 문서 스타일 실제 서식 프리뷰 */
                <div className="h-full overflow-y-auto">
                  <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md border border-slate-200/80 p-8 sm:p-12 min-h-[500px]">
                    
                    {markdownResult.trim() ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: markdownToGoogleDocsHtml(markdownResult) 
                        }} 
                      />
                    ) : (
                      <div className="h-72 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
                        <FileText className="w-10 h-10 opacity-30 text-indigo-400" />
                        <div>
                          <p className="font-bold text-slate-500 text-sm">변환된 문서가 없습니다</p>
                          <p className="text-xs text-slate-400 mt-1">
                            왼쪽에서 PDF를 등록하고 변환을 실행하시면 구글 문서 서식으로 미리보기가 나타납니다.
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>

            {/* 하단 내보내기 & 우현글쌤 첨삭 연동 바 */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-xs">
              
              {/* 내보내기 버튼 그룹 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                
                {/* 1. 구글 문서 복사 (최우선 기능) */}
                <button
                  onClick={handleCopyGoogleDocs}
                  disabled={!markdownResult.trim()}
                  className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                  title="서식이 포함된 Rich-Text로 복사되어 구글 문서에서 Ctrl+V 시 제목/본문이 완벽하게 들어갑니다."
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>구글 문서로 복사</span>
                </button>

                {/* 2. 마크다운 복사 */}
                <button
                  onClick={handleCopyMarkdown}
                  disabled={!markdownResult.trim()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Code className="w-3.5 h-3.5 text-slate-500" />
                  <span>.md 복사</span>
                </button>

                {/* 3. 다운로드 버튼들 */}
                <button
                  onClick={handleDownloadMarkdown}
                  disabled={!markdownResult.trim()}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                  title=".md 파일로 다운로드"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={handleDownloadTxt}
                  disabled={!markdownResult.trim()}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                  title=".txt 텍스트 파일로 다운로드"
                >
                  <FileDown className="w-4 h-4" />
                </button>
              </div>

              {/* 우현글쌤 첨삭창으로 바로 보내기 (연계) */}
              <button
                onClick={handleApplyToTutor}
                disabled={!markdownResult.trim()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                title="변환된 글을 우현글쌤 입력창에 즉시 반영하고 모달을 닫습니다."
              >
                <Send className="w-3.5 h-3.5" />
                <span>우현글쌤 첨삭창에 바로 적용</span>
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
