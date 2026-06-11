# 서논술형 자동 채점 앱

교사가 서논술형 답안(종이 스캔 PDF 일괄 업로드 또는 학생 온라인 직접입력)을 받아,
학생별로 자동 분류하고 **Google Gemini**로 OCR·채점한 뒤, 결과를 **Firebase Firestore**에
저장하고 반/학년/회차별로 집계 조회하는 웹앱입니다.

> **데이터 완전 격리** — 공용 서버가 없습니다. 교사 각자가 GitHub 포크 → Vercel 배포로
> **자기 전용 인스턴스**를 운영하며, 학생 실명·이메일·답안은 교사 본인 Firebase 프로젝트에만 저장됩니다.

기술 스택: **Next.js (App Router) + TypeScript + Tailwind CSS / Firebase (Auth·Firestore·Storage) / Gemini API**

---

## 🚀 교사용 배포 가이드 (4단계)

사전 준비물 2개만 있으면 됩니다: **GitHub 계정**, **Vercel 계정**(GitHub로 가입), 그리고
무료 **Firebase 프로젝트**와 **Gemini API 키**.

### 0단계 — Firebase·Gemini 키 준비 (최초 1회)

1. **Firebase 프로젝트 생성**: [console.firebase.google.com](https://console.firebase.google.com) → "프로젝트 추가".
   - **Authentication** 켜기 → 로그인 방법에서 **Google** 사용 설정.
   - **Firestore Database** 만들기(프로덕션 모드).
   - **Storage** 만들기.
   - 프로젝트 설정 ⚙️ → **일반** 탭 → "내 앱"에서 **웹 앱(</>)** 추가 → `firebaseConfig` 6개 값 복사 → `NEXT_PUBLIC_FIREBASE_*`.
   - 프로젝트 설정 ⚙️ → **서비스 계정** 탭 → "새 비공개 키 생성" → 받은 JSON에서
     `project_id`, `client_email`, `private_key`를 `FIREBASE_ADMIN_*`로 사용.
2. **Gemini API 키 발급**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → `GEMINI_API_KEY`.

> 필요한 값 전체 목록과 형식은 [`.env.example`](.env.example)에 정리되어 있습니다.

### 1단계 — 이 레포 **Fork**

이 저장소 우상단 **Fork** 버튼 → 본인 GitHub 계정으로 복제합니다.

### 2단계 — Vercel에서 **Import**

[vercel.com/new](https://vercel.com/new) → "Import Git Repository" → 방금 포크한 레포 선택.
Framework는 자동으로 **Next.js**로 인식됩니다(추가 빌드 설정 불필요).

### 3단계 — **환경변수 입력**

Import 화면(또는 Project → Settings → **Environment Variables**)에서
[`.env.example`](.env.example)의 항목을 그대로 입력합니다.

| 키 | 출처 |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` (6개) | Firebase 웹 앱 SDK 설정 |
| `FIREBASE_ADMIN_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY` | 서비스 계정 JSON |
| `GEMINI_API_KEY` | Google AI Studio |
| `RESEND_API_KEY`, `EMAIL_FROM` | (2차/선택) 이메일 발송 |

> ⚠️ **`FIREBASE_ADMIN_PRIVATE_KEY` 주의**: 줄바꿈을 `\n`으로 이스케이프한 한 줄 문자열로
> 붙여넣고 **양끝을 큰따옴표**로 감싸세요. (코드에서 `\n` → 실제 개행으로 복원합니다.)

### 4단계 — **Deploy**

**Deploy** 버튼을 누르면 빌드 후 `https://<프로젝트>.vercel.app` 주소가 생성됩니다.
접속해서 **Google 로그인** → 과목·첫 회차를 만들면 끝입니다.

> 배포 후 Firebase 콘솔의 **Authentication → 설정 → 승인된 도메인**에 Vercel 도메인을 추가해야
> Google 로그인 팝업이 정상 동작합니다.

---

## 🔒 보안 원칙

- **Gemini API 키·Firebase Admin 키는 절대 클라이언트에 노출하지 않습니다.**
  서버(Next.js Route Handler)에서만 사용하며, `lib/firebase.admin.ts`·`lib/gemini.ts`는
  `server-only`로 보호됩니다.
- `NEXT_PUBLIC_` 접두사가 붙은 Firebase 클라이언트 설정만 브라우저에 노출됩니다(정상).
- `.env*`는 `.gitignore`로 커밋이 차단됩니다.

---

## 🗂 프로젝트 구조

```
/app
  /(auth)/login                                   # 교사 로그인
  /subjects                                       # 과목 선택
  /subjects/[subjectId]/assessments               # 회차 목록
  /subjects/[subjectId]/assessments/[id]/edit     # 회차 설정 + 루브릭 빌더
  /subjects/[subjectId]/assessments/[id]/upload   # PDF 업로드/학생 분류
  /subjects/[subjectId]/assessments/[id]/grade    # 채점 화면(좌우 분할)
  /subjects/[subjectId]/assessments/[id]/report   # 리포트(집계)
  /api/classify/route.ts                          # 머리글 추출/분류 (서버·Gemini)
  /api/ocr/route.ts                               # 손글씨 OCR + *** 좌표 (서버·Gemini)
  /api/grade/route.ts                             # 루브릭 채점 (서버·Gemini)
  /api/email/route.ts                             # 피드백 이메일 (2차)
/lib
  firebase.client.ts                              # 브라우저 SDK (Auth·Firestore·Storage)
  firebase.admin.ts                               # Admin SDK (server-only)
  gemini.ts                                       # Gemini 래퍼 (server-only, JSON 강제 출력)
  types.ts                                        # Firestore 데이터 모델 타입
/components
  RubricBuilder.tsx                               # 루브릭 빌더(영역·급간 추가/삭제)
  AnswerViewer.tsx                                # 답안 뷰어(좌)
  ScorePanel.tsx                                  # 채점표·피드백(우)
  FloatingCompare.tsx                             # 원본 비교창 (2차)
firestore.rules / storage.rules                   # 보안 규칙 (기본)
vercel.json                                       # 함수 타임아웃·리전 등 배포 설정
```

---

## 💻 로컬 개발

```bash
npm install
cp .env.example .env.local   # 값 채우기 (Windows PowerShell: Copy-Item .env.example .env.local)
npm run dev                  # http://localhost:3000
npm run typecheck            # 타입 검사
```

---

## 🧭 구현 로드맵

**1차 MVP 완료** — 스캔 업로드부터 집계 리포트까지 동작합니다.

- [x] 1단계 — 레포 뼈대(폴더 구조·배포 설정·`.env.example`·Firebase/Gemini 연결·데이터 모델)
- [x] 2단계 — 회차 설정 + 루브릭 빌더 (Firestore 저장 연동, Google 로그인)
- [x] 3단계 — PDF 업로드 → 머리글 학생 분류 → OCR → 제출물 저장
- [x] 4단계 — 채점 화면(좌우 분할) + 반/학년·회차별 집계 리포트

이후 2차 확장: 피드백 이메일 발송 / 플로팅 원본 비교창(`***` bbox) / 학생 온라인 직접입력 /
수학·과학 캔버스 / 통계 Cloud Function.

자세한 명세는 [`PROJECT_PLAN.md`](PROJECT_PLAN.md)를 참고하세요.

---

> ⚠️ **AI 채점 결과는 부정확할 수 있으니 교사의 최종 확인이 필요합니다.**
