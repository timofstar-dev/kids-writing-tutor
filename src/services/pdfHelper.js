import * as pdfjsLib from 'pdfjs-dist';
// Vite 지원용 worker URL 임포트
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * PDF 파일을 읽어 첫 번째 페이지(또는 지정된 페이지)를 고해상도 Canvas 이미지(DataURL)로 변환
 */
export async function renderPdfToImage(file, pageNum = 1, scale = 1.8) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const numPages = pdf.numPages;
  const page = await pdf.getPage(Math.min(pageNum, numPages));

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };

  await page.render(renderContext).promise;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    numPages: numPages,
    currentPage: pageNum,
    width: viewport.width,
    height: viewport.height
  };
}
