import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  FileUp, 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle,
  Wand2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckSquare
} from 'lucide-react';
import { SAMPLE_ESSAYS } from '../data/sampleEssays';
import { renderPdfToImage } from '../services/pdfHelper';
import { renderAllPagesFromPdf } from '../services/pdfOcrService';
import { extractTextFromImage } from '../services/aiService';

export default function InputPanel({
  essayText,
  setEssayText,
  studentName,
  setStudentName,
  essayTitle,
  setEssayTitle,
  onEvaluate,
  isEvaluating,
  selectedGrade,
  apiKey,
  modelName,
  onOpenPdfOcrModal,
  students = [],
  onOpenStudentModal
}) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'scan'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [pdfInfo, setPdfInfo] = useState({ currentPage: 1, totalPages: 1 });
  const [pdfPages, setPdfPages] = useState([]); // [{ pageNum, dataUrl, totalPages }]
  const [selectedPages, setSelectedPages] = useState([]); // [1, 2]
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [ocrStatusMessage, setOcrStatusMessage] = useState('');
  const [inputError, setInputError] = useState('');
  const [isScanDragging, setIsScanDragging] = useState(false);

  const fileInputRef = useRef(null);
  const scanInputRef = useRef(null);

  const handleScanDragOver = (e) => {
    e.preventDefault();
    setIsScanDragging(true);
  };

  const handleScanDragLeave = (e) => {
    e.preventDefault();
    setIsScanDragging(false);
  };

  const handleScanDrop = (e) => {
    e.preventDefault();
    setIsScanDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleScanUpload({ target: { files: [file] } });
    }
  };

  // 텍스트 파일 (.txt) 업로드 처리
  const handleTxtUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      setInputError('.txt 텍스트 파일을 업로드해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setEssayText(content);
        setInputError('');
      }
    };
    reader.onerror = () => {
      setInputError('텍스트 파일을 읽는 중 오류가 발생했습니다.');
    };
    reader.readAsText(file, 'utf-8');
  };

  // 스캔 파일 (PDF 또는 이미지) 업로드 처리
  const handleScanUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setInputError('');
    setOcrStatusMessage('');
    setZoomLevel(1);

    const fileType = file.type;
    const isPdf = fileType === 'application/pdf' || file.name.endsWith('.pdf');
    const isImage = fileType.startsWith('image/');

    if (!isPdf && !isImage) {
      setInputError('PDF 파일 또는 이미지(JPG, PNG) 파일을 업로드해주세요.');
      return;
    }

    try {
      if (isPdf) {
        setOcrStatusMessage('PDF 모든 페이지를 고해상도로 렌더링 중...');
        const allPages = await renderAllPagesFromPdf(file, 15, 1.8);
        if (allPages.length === 0) {
          throw new Error('PDF에서 페이지를 읽을 수 없습니다.');
        }
        setPdfPages(allPages);
        setPreviewImage(allPages[0]?.dataUrl);
        setPdfInfo({ currentPage: 1, totalPages: allPages.length });
        setSelectedPages(allPages.map(p => p.pageNum));
        setOcrStatusMessage(`PDF 총 ${allPages.length}페이지 로드 완료. 체크박스로 판독할 페이지를 선택하고 OCR을 실행하세요.`);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const pageObj = { pageNum: 1, dataUrl: ev.target?.result, totalPages: 1 };
          setPdfPages([pageObj]);
          setPreviewImage(pageObj.dataUrl);
          setPdfInfo({ currentPage: 1, totalPages: 1 });
          setSelectedPages([1]);
          setOcrStatusMessage('이미지 불러오기 완료. [전체 페이지 OCR 적용]을 눌러보세요.');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      setInputError('파일을 렌더링하지 못했습니다: ' + err.message);
    }
  };

  // PDF 페이지 변경
  const handleChangePdfPage = (delta) => {
    if (pdfPages.length <= 1) return;
    const nextIdx = (pdfInfo.currentPage - 1) + delta;
    if (nextIdx < 0 || nextIdx >= pdfPages.length) return;
    const target = pdfPages[nextIdx];
    setPreviewImage(target.dataUrl);
    setPdfInfo({ currentPage: target.pageNum, totalPages: pdfPages.length });
  };

  const handleSelectPreviewPage = (pageNum) => {
    const target = pdfPages.find(p => p.pageNum === pageNum);
    if (target) {
      setPreviewImage(target.dataUrl);
      setPdfInfo({ currentPage: target.pageNum, totalPages: pdfPages.length });
    }
  };

  const togglePageSelection = (pageNum) => {
    setSelectedPages(prev =>
      prev.includes(pageNum)
        ? prev.filter(p => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const handleSelectAllPages = () => {
    setSelectedPages(pdfPages.map(p => p.pageNum));
  };

  const handleDeselectAllPages = () => {
    setSelectedPages([]);
  };

  // 전체 페이지 일괄 OCR 실행
  const handleRunAllPagesOcr = async () => {
    const pagesToRun = pdfPages.length > 0 ? pdfPages : (previewImage ? [{ pageNum: 1, dataUrl: previewImage }] : []);
    if (pagesToRun.length === 0) {
      setInputError('먼저 스캔한 PDF나 사진을 업로드해주세요.');
      return;
    }
    if (!apiKey) {
      setInputError('손글씨 인식을 위해 상단에서 Gemini API 키를 먼저 등록해주세요.');
      return;
    }

    setSelectedPages(pagesToRun.map(p => p.pageNum));
    setIsExtractingOcr(true);
    setInputError('');
    setOcrStatusMessage(`전체 ${pagesToRun.length}개 페이지의 어린이 손글씨를 판독하고 있습니다...`);

    try {
      const results = [];
      for (let i = 0; i < pagesToRun.length; i++) {
        const page = pagesToRun[i];
        setOcrStatusMessage(`AI가 ${i + 1}/${pagesToRun.length}쪽 손글씨를 꼼꼼하게 읽고 있습니다...`);
        const text = await extractTextFromImage({
          apiKey,
          base64Image: page.dataUrl,
          mimeType: 'image/png',
          modelName
        });
        if (text && text.trim()) {
          results.push(text.trim());
        }
        if (i < pagesToRun.length - 1) {
          await new Promise(r => setTimeout(r, 400));
        }
      }

      if (results.length > 0) {
        setEssayText(results.join('\n\n'));
        setOcrStatusMessage(`✨ 전체 ${pagesToRun.length}개 페이지 손글씨 판독 완료! 우측 창에서 글을 확인하고 첨삭을 진행하세요.`);
      } else {
        setOcrStatusMessage('인식된 텍스트가 없습니다. 직접 타이핑해주세요.');
      }
    } catch (err) {
      console.error(err);
      setInputError('손글씨 판독 실패: ' + err.message);
      setOcrStatusMessage('손글씨 판독 중 오류가 발생했습니다.');
    } finally {
      setIsExtractingOcr(false);
    }
  };

  // 선택한 페이지만 OCR 실행
  const handleRunSelectedPagesOcr = async () => {
    if (!pdfPages || pdfPages.length === 0) {
      setInputError('먼저 스캔한 PDF나 사진을 업로드해주세요.');
      return;
    }
    if (selectedPages.length === 0) {
      setInputError('OCR을 적용할 페이지를 체크박스로 최소 1쪽 이상 선택해주세요.');
      return;
    }
    if (!apiKey) {
      setInputError('손글씨 인식을 위해 상단에서 Gemini API 키를 먼저 등록해주세요.');
      return;
    }

    const pagesToRun = pdfPages
      .filter(p => selectedPages.includes(p.pageNum))
      .sort((a, b) => a.pageNum - b.pageNum);

    setIsExtractingOcr(true);
    setInputError('');
    setOcrStatusMessage(`선택한 ${pagesToRun.length}개 페이지 손글씨를 판독하고 있습니다...`);

    try {
      const results = [];
      for (let i = 0; i < pagesToRun.length; i++) {
        const page = pagesToRun[i];
        setOcrStatusMessage(`AI가 선택된 ${page.pageNum}쪽 (${i + 1}/${pagesToRun.length}) 손글씨를 판독하고 있습니다...`);
        const text = await extractTextFromImage({
          apiKey,
          base64Image: page.dataUrl,
          mimeType: 'image/png',
          modelName
        });
        if (text && text.trim()) {
          results.push(text.trim());
        }
        if (i < pagesToRun.length - 1) {
          await new Promise(r => setTimeout(r, 400));
        }
      }

      if (results.length > 0) {
        setEssayText(results.join('\n\n'));
        setOcrStatusMessage(`✨ 선택한 ${pagesToRun.length}개 페이지(제 ${pagesToRun.map(p => p.pageNum).join(', ')}쪽) 판독 완료!`);
      } else {
        setOcrStatusMessage('인식된 텍스트가 없습니다. 직접 타이핑해주세요.');
      }
    } catch (err) {
      console.error(err);
      setInputError('선택 페이지 판독 실패: ' + err.message);
      setOcrStatusMessage('손글씨 판독 중 오류가 발생했습니다.');
    } finally {
      setIsExtractingOcr(false);
    }
  };

  // 학년별 샘플 글 로드
  const handleLoadSample = (sampleId) => {
    const found = SAMPLE_ESSAYS.find(s => s.id === sampleId);
    if (found) {
      setEssayText(found.text);
      if (setEssayTitle) setEssayTitle(found.title);
      if (setStudentName) setStudentName(found.author);
      setInputError('');
    }
  };

  // 글자 수 및 단어 수 계산
  const charCountWithSpaces = essayText.length;
  const charCountNoSpaces = essayText.replace(/\s/g, '').length;
  const sentenceCount = essayText.split(/[.?!]+/).filter(s => s.trim().length > 0).length;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col no-print">
      
      {/* 탭 네비게이션 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
        
        {/* 입력 모드 탭 버튼 */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'text'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-500" />
            <span>직접 타이핑 & TXT 파일</span>
          </button>

          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'scan'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-indigo-500" />
            <span>스캔 PDF / 사진 대조 뷰어</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-md">스마트</span>
          </button>

          <button
            onClick={onOpenPdfOcrModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white shadow-xs hover:shadow transition-all"
            title="학생 글쓰기 PDF를 마크다운이나 구글 문서 형태로 똑같이 일괄 변환하기"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span>PDF OCR 스튜디오</span>
          </button>
        </div>

        {/* 샘플 글 바로 불러오기 */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-400 font-medium text-[11px] hidden lg:inline">샘플 예시:</span>
          {SAMPLE_ESSAYS.map(sample => (
            <button
              key={sample.id}
              onClick={() => handleLoadSample(sample.id)}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold rounded-lg border border-amber-200 transition-colors text-[11px]"
              title={`${sample.grade} ${sample.type} - ${sample.title}`}
            >
              {sample.title.slice(0, 10)}...
            </button>
          ))}
        </div>

      </div>

      {/* 탭 1: 직접 텍스트 입력 및 TXT 파일 */}
      {activeTab === 'text' && (
        <div className="space-y-4">
          
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-500" />
              학생이 쓴 글 내용 입력
            </label>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleTxtUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                title="컴퓨터에 저장된 .txt 파일을 불러옵니다"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>TXT 파일 불러오기</span>
              </button>

              {essayText && (
                <button
                  onClick={() => setEssayText('')}
                  className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-rose-600 font-medium text-xs transition-colors"
                  title="내용 비우기"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>지우기</span>
                </button>
              )}
            </div>
          </div>

          {/* 학생 이름 & 글 제목 입력 바 */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-4">
              {students.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    value={studentName || ''}
                    onChange={(e) => setStudentName && setStudentName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-hidden transition-all"
                  >
                    <option value="" disabled>학생을 선택하세요</option>
                    {students.map(s => (
                      <option key={s.id} value={s.name}>{s.name} ({s.grade})</option>
                    ))}
                  </select>
                  <button 
                    onClick={onOpenStudentModal}
                    className="shrink-0 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    관리
                  </button>
                </div>
              ) : (
                <button 
                  onClick={onOpenStudentModal}
                  className="w-full px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-colors text-left flex justify-between items-center"
                >
                  <span>학생 명단을 먼저 등록해주세요</span>
                  <span>+</span>
                </button>
              )}
            </div>
            <div className="sm:col-span-8">
              <input
                type="text"
                placeholder="글 제목 (예: 『어린 왕자』를 읽고, 놀이공원에 다녀온 날)"
                value={essayTitle || ''}
                onChange={(e) => setEssayTitle && setEssayTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-hidden transition-all"
              />
            </div>
          </div>

          <div className="relative">
            <textarea
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder="여기에 학생이 작성한 글을 입력하거나 붙여넣어 주세요.
또는 상단의 [TXT 파일 불러오기]나 [스캔 PDF/사진 대조 뷰어]를 이용하시면 더욱 편리합니다.

(위의 샘플 예시 버튼을 누르면 7대 첨삭 기준이 잘 드러난 실제 초등학생 글을 바로 테스트해보실 수 있습니다!)"
              rows={12}
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm leading-relaxed text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-hidden transition-all resize-y font-sans"
            />
          </div>

          {/* 글자 수 요약 */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
            <span>약 {sentenceCount}개 문장</span>
            <div className="flex gap-3">
              <span>공백 제외: <strong className="text-slate-600">{charCountNoSpaces}</strong>자</span>
              <span>공백 포함: <strong className="text-slate-600">{charCountWithSpaces}</strong>자</span>
            </div>
          </div>

        </div>
      )}

      {/* 탭 2: 스캔 PDF / 사진 대조 뷰어 (사용자 핵심 요구사항) */}
      {activeTab === 'scan' && (
        <div className="space-y-4">
          
          {/* 다중 페이지 PDF 일괄 변환 바로가기 배너 */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border border-purple-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-xl shrink-0">📄</span>
              <div>
                <p className="font-extrabold text-purple-950">다중 페이지 PDF를 마크다운이나 구글 문서 형태로 똑같이 변환하고 싶으신가요?</p>
                <p className="text-[11px] text-purple-700 mt-0.5">전체 페이지 일괄 OCR, 구글문서(Rich Text) 서식 복사, .md 다운로드를 지원하는 전용 스튜디오를 열어보세요.</p>
              </div>
            </div>
            <button
              onClick={onOpenPdfOcrModal}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>PDF OCR 스튜디오 열기</span>
            </button>
          </div>
          
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 text-white p-2.5 rounded-xl shadow-xs shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-indigo-950">
                  스캔 공책(PDF·사진)을 보며 직접 타이핑 & AI 손글씨 판독
                </h3>
                <p className="text-xs text-indigo-800/80 mt-0.5">
                  왼쪽에서 아이가 쓴 원본 손글씨를 크게 보면서, 오른쪽 입력창에서 확인 및 수정할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                ref={scanInputRef}
                type="file"
                accept=".pdf, image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleScanUpload}
                className="hidden"
              />
              <button
                onClick={() => scanInputRef.current?.click()}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>스캔 PDF/사진 선택</span>
              </button>
            </div>
          </div>

          {/* 2분할 대조 화면 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[480px]">
            
            {/* 좌측: 문서 뷰어 */}
            <div 
              className={`lg:col-span-6 rounded-2xl p-3 flex flex-col relative overflow-hidden border-2 transition-colors ${
                isScanDragging ? 'border-indigo-500 bg-slate-800' : 'border-slate-700 bg-slate-900'
              }`}
              onDragOver={handleScanDragOver}
              onDragLeave={handleScanDragLeave}
              onDrop={handleScanDrop}
            >
              
              {/* 뷰어 툴바 */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-300">
                <span className="font-semibold flex items-center gap-1 text-slate-300">
                  📄 원본 스캔 문서
                  {pdfInfo.totalPages > 1 && (
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-md text-amber-400">
                      {pdfInfo.currentPage} / {pdfInfo.totalPages} 페이지
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-1">
                  {pdfInfo.totalPages > 1 && (
                    <>
                      <button
                        onClick={() => handleChangePdfPage(-1)}
                        disabled={pdfInfo.currentPage <= 1}
                        className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-white"
                        title="이전 페이지"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleChangePdfPage(1)}
                        disabled={pdfInfo.currentPage >= pdfInfo.totalPages}
                        className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-white"
                        title="다음 페이지"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="text-slate-600">|</span>
                    </>
                  )}
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
                    className="p-1 hover:bg-slate-800 rounded text-white"
                    title="축소"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono px-1">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))}
                    className="p-1 hover:bg-slate-800 rounded text-white"
                    title="확대"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:bg-slate-800 rounded text-white"
                    title="기본 배율"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 이미지 렌더링 캔버스 컨테이너 */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-3 bg-slate-950/70 rounded-xl mt-2 min-h-[360px]">
                {previewImage ? (
                  <div 
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }}
                    className="flex justify-center"
                  >
                    <img 
                      src={previewImage} 
                      alt="Uploaded scanned essay" 
                      className="max-w-full rounded-md shadow-2xl object-contain border border-slate-800"
                    />
                  </div>
                ) : (
                  <div className="text-center text-slate-500 space-y-3 p-6">
                    <Upload className="w-10 h-10 mx-auto opacity-40 text-indigo-400" />
                    <div>
                      <p className="font-bold text-slate-400 text-sm">등록된 스캔 문서가 없습니다</p>
                      <p className="text-xs text-slate-600 mt-1">
                        이곳에 파일을 드래그 앤 드롭하거나 위 버튼을 눌러 등록하세요.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 다중 페이지인 경우 페이지별 선택 체크박스 바 */}
              {pdfPages.length > 1 && (
                <div className="bg-slate-900/90 rounded-2xl p-2.5 border border-slate-700 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>OCR 적용 페이지 체크 ({selectedPages.length}/{pdfPages.length}쪽 선택됨)</span>
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllPages}
                        className="text-indigo-300 hover:text-white font-bold hover:underline transition-colors cursor-pointer"
                      >
                        전체 선택
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllPages}
                        className="text-slate-400 hover:text-white font-medium hover:underline transition-colors cursor-pointer"
                      >
                        전체 해제
                      </button>
                    </div>
                  </div>

                  {/* 페이지 선택 칩 목록 */}
                  <div className="flex flex-wrap gap-1.5">
                    {pdfPages.map(p => {
                      const isChecked = selectedPages.includes(p.pageNum);
                      const isCurrent = pdfInfo.currentPage === p.pageNum;
                      return (
                        <div
                          key={p.pageNum}
                          onClick={() => handleSelectPreviewPage(p.pageNum)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-indigo-600/35 border-indigo-400 text-white shadow-xs'
                              : 'bg-slate-900/60 border-slate-700 text-slate-400 opacity-60'
                          } ${isCurrent ? 'ring-2 ring-amber-400' : ''}`}
                          title={`클릭하여 ${p.pageNum}쪽 미리보기 및 선택`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              togglePageSelection(p.pageNum);
                            }}
                            className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                          />
                          <span>{p.pageNum}쪽</span>
                          {isCurrent && <span className="text-[10px] text-amber-300 font-normal">(보는중)</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OCR 버튼 영역: 전체 페이지 OCR 적용 vs 선택한 페이지 OCR 적용 */}
              {previewImage && (
                <div className="pt-2 space-y-2">
                  {pdfPages.length > 1 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleRunAllPagesOcr}
                        disabled={isExtractingOcr}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:to-pink-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="1쪽부터 끝까지 모든 페이지를 순서대로 판독하여 하나로 합칩니다"
                      >
                        {isExtractingOcr ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                        )}
                        <span>전체 페이지 OCR 적용 (총 {pdfPages.length}쪽)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRunSelectedPagesOcr}
                        disabled={isExtractingOcr || selectedPages.length === 0}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="체크박스로 선택한 페이지만 순서대로 판독하여 합칩니다"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-200" />
                        <span>선택한 페이지 OCR 적용 ({selectedPages.length}쪽)</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRunAllPagesOcr}
                      disabled={isExtractingOcr}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {isExtractingOcr ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                          <span>AI가 손글씨를 판독하고 있습니다...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 text-yellow-300" />
                          <span>AI 손글씨 자동 판독 (전체 페이지 OCR 적용)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* 우측: 텍스트 에디터 (대조하며 타이핑 및 검수) */}
            <div className="lg:col-span-6 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  ✏️ 대조 타이핑 및 최종 검수
                  <span className="text-[11px] text-amber-700 font-normal">
                    (판독된 글을 확인하고 고칠 수 있습니다)
                  </span>
                </span>
                <span className="text-slate-400 text-[11px]">
                  공백 포함 {charCountWithSpaces}자
                </span>
              </div>

              {/* 학생 이름 & 글 제목 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  {students.length > 0 ? (
                    <select
                      value={studentName || ''}
                      onChange={(e) => setStudentName && setStudentName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-400 outline-hidden transition-all"
                    >
                      <option value="" disabled>학생 선택</option>
                      {students.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <button 
                      onClick={onOpenStudentModal}
                      className="w-full px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-colors text-left"
                    >
                      학생 등록 필요
                    </button>
                  )}
                </div>
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    placeholder="글 제목 (선택)"
                    value={essayTitle || ''}
                    onChange={(e) => setEssayTitle && setEssayTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-400 outline-hidden transition-all"
                  />
                </div>
              </div>

              <textarea
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="왼쪽 원본 스캔본을 보며 아이가 쓴 글을 타이핑하거나, [AI 손글씨 자동 판독]을 실행한 후 잘못 읽힌 글자를 직접 수정해주세요."
                className="w-full flex-1 min-h-[380px] p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm leading-relaxed text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all resize-none font-sans"
              />

              {ocrStatusMessage && (
                <p className="text-xs text-indigo-700 font-medium bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {ocrStatusMessage}
                </p>
              )}
            </div>

          </div>

        </div>
      )}

      {/* 에러 메시지 알림 */}
      {inputError && (
        <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-700 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{inputError}</span>
        </div>
      )}

      {/* 7대 첨삭 체크포인트 미리보기 안내 */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            우현글쌤의 7대 정밀 첨삭 영역:
          </span>
          <span className="text-[11px] text-slate-400">초등학교 교육과정 준수</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-[11px] font-medium text-slate-600">
          <div className="bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl text-center">
            🎯 1. 주술 호응
          </div>
          <div className="bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl text-center">
            🔄 2. 반복 줄이기
          </div>
          <div className="bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl text-center">
            💬 3. 글말(문어체)
          </div>
          <div className="bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl text-center">
            🔍 4. 주어/목적어
          </div>
          <div className="bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl text-center">
            💡 5. 맞춤법 12선
          </div>
          <div className="bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl text-center">
            ✂️ 6. 긴문장 자르기
          </div>
          <div className="bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl text-center">
            ✏️ 7. 띄어쓰기
          </div>
        </div>
      </div>

      {/* 제출 & 첨삭 시작 버튼 */}
      <div className="mt-5">
        <button
          onClick={onEvaluate}
          disabled={isEvaluating || !essayText.trim()}
          className={`w-full py-4 px-6 rounded-2xl text-white font-extrabold text-base transition-all flex items-center justify-center gap-2 shadow-md ${
            isEvaluating || !essayText.trim()
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 shadow-orange-200 hover:shadow-lg hover:-translate-y-0.5'
          }`}
        >
          {isEvaluating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>우현글쌤이 7가지 기준으로 정성껏 글을 읽고 첨삭 중입니다...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-yellow-200" />
              <span>{selectedGrade} 기준 7대 글쓰기 첨삭 받기</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
