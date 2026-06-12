# CLAUDE.md — 서논술형 자동 채점 앱

> **다른 PC/세션에서 이어서 작업한다면 먼저 [HANDOFF.md](HANDOFF.md)를 읽으세요.**
> 거기에 "지금까지 한 것 / 지금 막 멈춘 지점 / 다음에 할 일"이 정리돼 있습니다.

## 👉 현재 상태 (요약)
- **1차 MVP 완성** (구현 순서 1~4단계) + 회차별 채점 모델 선택 + 루브릭 폴백 채점표. 빌드 통과.
- **Gemini 실호출 검증 완료** (모델 `gemini-3.5-flash`). 채점/머리글 추출 정상.
- **Vercel 배포 완료** → https://essay-scoring-ywan.vercel.app (프로젝트 `essay-scoring-ywan`). GitHub `main` 푸시 시 자동 재배포.
- **배포본 E2E 일부 검증** — Google 로그인 ✅, 과목 추가(Firestore 쓰기/읽기·보안규칙) ✅.
  남은 검증: **AI 채점(/api/grade)·PDF 업로드(분류/OCR)·리포트**.
- **Firebase**: `cu-milksurvey-2025` 재사용(Blaze), 규칙 게시됨, 승인 도메인에 `essay-scoring-ywan.vercel.app` 추가됨. 키는 `.env.local`.
- **다음 할 일**: 배포본에서 AI 채점/업로드/리포트 최종 확인. → 상세: [HANDOFF.md](HANDOFF.md)

## 프로젝트 개요
교사가 서논술형 답안(스캔 PDF 일괄 업로드)을 받아 학생별로 자동 분류하고 Gemini로 OCR·채점한 뒤,
Firestore에 저장하고 반/학년·회차별로 집계 조회하는 웹앱. 교사별 GitHub 포크 → Vercel 셀프 배포(데이터 격리).
전체 명세는 [PROJECT_PLAN.md](PROJECT_PLAN.md) 참조.

## 기술 스택
- Next.js 14(App Router) + TypeScript + Tailwind
- Firebase: Auth(Google, 교사) / Firestore / Storage
- Google Gemini API (서버 측에서만 호출) — 분류/OCR/채점
- 배포: Vercel

## 실행
```bash
npm install
# .env.local 필요 (없으면 .env.example 복사 후 키 입력)
npm run dev        # http://localhost:3000
npm run build      # 배포 전 검증 (타입체크·린트 포함)
npm run typecheck
```

## 폴더 구조 (핵심)
```
app/(auth)/login                                  로그인(Google)
app/subjects                                      과목 선택
app/subjects/[subjectId]/assessments              회차 목록
app/.../assessments/[id]/edit                     회차 설정 + 루브릭 + 채점모델 선택
app/.../assessments/[id]/upload                   PDF 업로드 → 학생 분류 → OCR
app/.../assessments/[id]/grade                    채점 화면(좌:답안뷰어 / 우:채점표)
app/.../assessments/[id]/report                   리포트(집계)
app/api/{classify,ocr,grade,email}/route.ts       서버(Gemini) 핸들러
lib/firebase.client.ts / firebase.admin.ts        클라/서버 Firebase SDK
lib/gemini.ts                                      Gemini 래퍼(server-only, JSON 강제)
lib/db.ts                                          Firestore CRUD(클라)
lib/types.ts / models.ts                           데이터 모델 / 채점 모델 목록
components/{RubricBuilder,ExamplesEditor,AnswerViewer,ScorePanel,AuthGate}.tsx
```

## 규칙·관례 (중요)
- **비밀은 서버에만**: `lib/gemini.ts`·`lib/firebase.admin.ts`는 `import "server-only"`. 클라이언트에서 import 금지.
- **`.env.local`·`*-adminsdk-*.json`은 절대 커밋 금지** (`.gitignore`에 있음). GitHub엔 `.env.example`(빈 템플릿)만.
- **채점 모델**: 회차 설정의 "채점 모델"(`assessment.gradingModel`)이 우선 → 없으면 `GEMINI_MODEL` 환경변수 → 기본 `gemini-3.5-flash`. 목록은 `lib/models.ts`.
- **루브릭 두 경로**: 구조화 루브릭(영역+급간)이 있으면 그걸로 채점표 구성, 비어 있으면 시스템 프롬프트 기준 AI 점수표를 폴백으로 표시(`ScorePanel`).
- **Firestore 경로**: `subjects/{id}/assessments/{id}/{rubric/main, submissions/*, stats}`. 보안 규칙은 `subjects/**`에만 적용(공유 프로젝트 안전).
- Windows 환경. 줄바꿈 LF→CRLF 경고는 무시 가능.

## 검증
- 코드 변경 후 `npm run build` 또는 `npm run typecheck`로 확인.
- 배포 E2E 절차는 [VERIFY.md](VERIFY.md).
