# ✏️ 우현글쌤 (Kids Writing Tutor)
> 초등학생 글쓰기 완성을 위한 맞춤형 AI 첨삭 교실 웹 프로그램

---

## 🌟 주요 기능
1. **7대 핵심 글쓰기 첨삭 엔진**:
   - 주술 호응 관계 확인
   - 반복 단어 및 상투적 구절 줄이기
   - 일상 구어체 ➔ 품격 있는 문어체(글말) 다듬기
   - 누락된 주어 및 목적어 보충
   - 헷갈리는 우리말 맞춤법 12선 (돼/되, 의/에, 안/않, 로서/로써, 다르다/틀리다 등)
   - 숨찬 긴 문장 자르기 (만연체 단문 분할)
   - 또박또박 띄어쓰기 규정 교정
2. **다양한 입력 지원**:
   - 직접 텍스트 타이핑 & `.txt` 파일 업로드
   - 스캔 공책(PDF·사진) 분할 대조 뷰어 및 **✨ AI 손글씨 자동 판독 (OCR)**
3. **학습자 맞춤형 리포트 & 출력**:
   - 다정한 칭찬 스탬프 및 격려 총평
   - 문장별 1:1 대조 첨삭 카드 (원래 글 ❌ vs 고친 글 ⭕ vs 조언 💡)
   - **초등 200자 원고지 격자 뷰어**
   - A4 인쇄용 맞춤 학습지 출력
4. **첨삭 기록 보관함 (영구 로그)**:
   - 브라우저 로컬 데이터베이스(IndexedDB)에 날짜/시간/학생명/글제목과 함께 영구 자동 저장
   - 원클릭으로 과거 첨삭 내용 및 리포트를 새 창/새 탭에서 즉시 열람 및 인쇄
   - JSON 백업 파일 다운로드 및 복원 기능 지원

---

## 🛠️ 기술 스택
- **Frontend**: React 19, Vite, TailwindCSS v4
- **AI**: `@google/genai` (Google Gemini API - 자동 폴백 캐스케이드 탑재)
- **PDF & Document**: `pdfjs-dist`
- **Database**: Browser IndexedDB (로컬 영구 저장)
- **Icons & Effects**: `lucide-react`, `canvas-confetti`

---

## 🚀 로컬 실행 방법
```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (.env 파일 생성)
# VITE_GEMINI_API_KEY=your_api_key_here

# 3. 로컬 개발 서버 실행
npm run dev
```

---

## ☁️ Cloudflare Pages 배포 설정
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_GEMINI_API_KEY`: Google AI Studio에서 발급받은 Gemini API 키 입력
