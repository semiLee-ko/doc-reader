# AI Document Reader (AI 문서 분석기)

AI를 활용하여 다양한 문서(PDF, 이미지)를 분석하고 한국어로 요약해주는 웹 애플리케이션입니다.
모든 처리는 브라우저 내(Client-side)에서 로컬 LLM과 OCR을 사용하여 수행됩니다.

## 주요 기능

- **PDF & 이미지 분석**: 디지털 PDF 뿐만 아니라 스캔된 문서, 사진 촬영된 이미지도 분석 가능합니다.
- **로컬 분석 (Privacy-first)**: 문서를 서버로 전송하지 않고 사용자의 브라우저 내에서 직접 OCR(Tesseract.js)과 LLM(WebLLM / Gemma 2B)을 사용하여 처리합니다.
- **한국어 요약 및 답변**: 문서의 핵심 내용을 콕 집어서 한국어로 요약해주며, 추가적인 질문도 가능합니다.
- **음성 인터페이스**: TTS(Text-to-Speech)와 STT(Speech-to-Text)를 지원하여 음성으로 대화할 수 있습니다.

## 기술 스택

- **Framework**: Next.js 15
- **UI Library**: Mantine UI, Lucide React
- **OCR**: Tesseract.js
- **LLM**: @mlc-ai/web-llm (Gemma 2B model)
- **PDF Handling**: pdfjs-dist
- **Voice**: Web Speech API (Browser Native)

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속하여 사용하세요.
로컬 LLM 엔진을 처음으로 불러올 때 모델 다운로드(약 1-2GB) 과정이 필요하며, 이후에는 캐시되어 빠르게 동작합니다.
