\# 서논술형 자동 채점 앱 - 프로젝트 명세서 (PROJECT\_PLAN.md)



> 이 문서는 Claude Desktop 등에서 코드를 생성할 때 참조할 단일 기준 문서입니다.

> 합의된 결정사항, 아키텍처, 데이터 모델, 워크플로우, 구현 순서를 모두 담고 있습니다.



\## 0. 한 줄 요약



교사가 서논술형 답안(종이 스캔 PDF 일괄 업로드 또는 학생 온라인 직접입력)을 받아, 학생별로 자동 분류하고 Gemini로 OCR·채점한 뒤, 결과를 Firestore에 저장하고 반/학년/회차별로 집계 조회하며 학생에게 피드백을 이메일로 보내는 웹앱. 교사 각자가 GitHub 포크 → Vercel 배포로 자기 전용 인스턴스를 운영(데이터 완전 격리).



\---



\## 1. 확정된 기술 스택



\- \*\*프레임워크\*\*: Next.js (App Router) + TypeScript + Tailwind CSS

\- \*\*호스팅/배포\*\*: Vercel (GitHub 연동, 교사별 포크 후 셀프 배포)

\- \*\*데이터베이스\*\*: Firebase Firestore (NoSQL 문서형)

\- \*\*파일 저장\*\*: Firebase Storage (스캔 PDF/이미지, 학생 손글씨 영역)

\- \*\*인증\*\*: Firebase Auth — 교사는 Google 로그인 / 학생은 회차별 접속코드(로그인 없음)

\- \*\*AI\*\*: Google Gemini API (멀티모달: 머리글 추출, OCR, 채점) — \*\*서버 측에서만 호출\*\*

\- \*\*이메일(2차)\*\*: Resend 또는 SendGrid (서버리스 함수에서 호출)



\### 보안 원칙

\- Gemini API 키, Firebase Admin 키는 절대 클라이언트 노출 금지 → Next.js Route Handler(서버)에서만 사용

\- 공용 서버 없음. 교사 개개인이 본인 Firebase 프로젝트에 격리 저장

\- 학생 실명·이메일·답안은 교사 본인 인스턴스에만 저장



\---



\## 2. 확정된 핵심 결정사항 (의사결정 로그)



1\. \*\*스캔 PDF 학생 구분 규칙\*\*: 페이지 상단 머리글(학년/반/번호/이름)이 있는 페이지 = 새 학생의 시작. 다음 머리글 전까지를 한 학생 답안으로 묶음.

2\. \*\*학생 이메일 출처\*\*: 온라인 입력 방식 → 학생 본인이 입력한 이메일로 발송 / 스캔 방식 → 교사가 사전 입력(CSV 명단)한 이메일로 발송.

3\. \*\*데이터 격리\*\*: 공용 서버에 모으지 않음. 교사 개개인 인스턴스 단위 운영.

4\. \*\*개발 범위\*\*: 1차 MVP 먼저 완성 → 2차로 확장.

5\. \*\*DB 선택\*\*: Firebase 확정. 반/학년 × 회차별 점수·총점 조회는 집계 필드 비정규화 + Cloud Function 통계 문서로 해결.

6\. \*\*벤치마킹 대상\*\*: clipo.ai (UI 골격 차용, 차별 기능은 독자 설계).



\---



\## 3. 벤치마킹 결론 (clipo.ai 분석 결과)



\### 차용할 UI 패턴

\- \*\*루브릭 빌더\*\*: 채점기준 카드 = \[채점요소(영역) 입력란] + \[점수 + 세부기준 행들]. '급간 추가/제거'(점수 레벨), '기준 추가'(영역 추가), 카드별 삭제, 'n개/15개' 개수 카운터.

\- \*\*회차 복사 생성\*\*: "새로 만들기" + "복사해서 만들기"로 이전 회차 복제.

\- \*\*루브릭 작성 도움말\*\*: 정량 요소(항목 수 기준) / 정성 요소(수준 차 기준) 예시 모달.

\- \*\*임시저장 / 저장 분리\*\*.

\- \*\*AI 채점 경고 문구\*\*: "AI 채점 결과는 부정확할 수 있으니 교사의 최종 확인이 필요합니다." 항상 노출.

\- \*\*채점 화면 레이아웃\*\*: 좌측 답안 뷰어(페이지 넘김·확대) / 우측 채점표 + AI 채점 근거 + AI 피드백 + 교사 직접 피드백.

\- \*\*AI→교사 피드백 복사 버튼\*\*("피드백 옮기기" 패턴).



\### 우리만의 차별 기능 (clipo에 없음 → 독자 설계)

\- `\*\*\*` 판독불가 처리 + 좌표(bbox) 저장

\- 플로팅(드래그·닫기 가능) 원본 비교창

\- 회차별 채점 예시문(만점/3점 예시 + 이유)

\- PDF 머리글 자동 분류

\- 피드백 이메일 발송

\- 학생 직접입력 + 수학/과학 캔버스('넣기' 삽입)



\---



\## 4. 전체 워크플로우



\### 교사 플로우

1\. \*\*온보딩\*\*: GitHub 포크 → Vercel Import → 환경변수(Firebase/Gemini 키) 입력 → 배포 → Google 로그인 → 과목 선택(국어/영어/수학/과학/사회…).

2\. \*\*회차 생성\*\*: 과목 아래 "서논술형 N회(날짜)" 생성. 시스템 프롬프트(자유) + 구조화 루브릭 + 채점 예시문 입력. 입력모드(scan/online), 캔버스 사용 여부 설정.

3\. \*\*답안 수집(2갈래)\*\*

&#x20;  - \*\*A. 스캔 PDF 업로드\*\*: 한 반 분량 1 PDF → 페이지 분할 → 머리글로 학생 분류 → 교사가 분류 확인/수정.

&#x20;  - \*\*B. 학생 온라인 입력\*\*: 학생이 회차 링크 접속 → 학년/반/번호/이름/이메일 입력 → 답안 작성(캔버스 옵션).

4\. \*\*OCR + `\*\*\*`처리\*\*: 손글씨 OCR, 판독불가는 `\*\*\*` + bbox 저장. (온라인 텍스트 입력은 OCR 생략)

5\. \*\*채점\*\*: OCR텍스트 + 루브릭 + 예시문 → Gemini → 영역별 점수/총점/근거/피드백. 교사가 좌우분할 화면에서 검토·수정.

6\. \*\*저장 + 조회\*\*: Firestore 저장(집계필드 포함) → 반/학년 × 회차별 리포트.

7\. \*\*(2차) 이메일 발송\*\*: AI 피드백 그대로 또는 복사·수정 후 학생 이메일로 전송(발송 전 교사 확인).



\### 두 입력 경로는 동일한 채점 파이프라인으로 합류한다.



\---



\## 5. Firestore 데이터 모델



```

subjects/{subjectId}

&#x20; - name: string                    // 과목명



subjects/{subjectId}/assessments/{assessmentId}

&#x20; - title: string                   // "서논술형 1회"

&#x20; - date: timestamp

&#x20; - inputMode: "scan" | "online"

&#x20; - useCanvas: boolean              // 수학/과학 그리기판 표시 여부

&#x20; - systemPrompt: string            // 자유 입력 채점 프롬프트

&#x20; - examples: \[ { score: number, text: string, reason: string } ]  // 채점 예시문



subjects/{subjectId}/assessments/{assessmentId}/rubric (단일 문서 또는 서브컬렉션)

&#x20; - criteria: \[

&#x20;     {

&#x20;       name: string,              // 채점요소(영역)

&#x20;       levels: \[ { label: string, score: number, descriptor: string } ]  // 급간

&#x20;     }

&#x20;   ]



subjects/{subjectId}/assessments/{assessmentId}/submissions/{submissionId}

&#x20; - grade: number                   // 학년 (집계용 평면 필드)

&#x20; - classNo: number                 // 반   (집계용 평면 필드)

&#x20; - studentNo: number               // 번호

&#x20; - name: string

&#x20; - email: string                   // 스캔=교사 사전입력 / 온라인=학생 입력

&#x20; - pageImageRefs: string\[]         // Storage 경로

&#x20; - ocrText: string

&#x20; - maskedTokens: \[ { index: number, bbox: {x,y,w,h}, pageRef: string } ]  // \*\*\* 좌표

&#x20; - scores: \[ { criterionName: string, score: number } ]

&#x20; - totalScore: number              // 집계용 평면 필드

&#x20; - aiReason: string

&#x20; - aiFeedback: string

&#x20; - teacherFeedback: string

&#x20; - emailStatus: "none" | "sent" | "failed"

&#x20; - createdAt: timestamp



subjects/{subjectId}/assessments/{assessmentId}/stats  // Cloud Function이 갱신

&#x20; - byClass: { \[classNo]: { avgTotal, count, byCriterion: {...} } }

&#x20; - byGrade: { \[grade]: { avgTotal, count } }

```



\### 집계 조회 전략

\- submission에 grade/classNo/totalScore/영역별 점수를 \*\*평면 복제\*\*(비정규화)

\- 쿼리 예: `where('grade','==',1).where('classNo','==',3)`

\- 리포트 즉시 로드용으로 stats 문서를 Cloud Function이 채점 완료 시 갱신



\---



\## 6. Gemini 프롬프트 설계 (JSON 강제 출력)



\### (a) 머리글 추출

\- 입력: 페이지 이미지 1장

\- 지시: 상단 머리글에서 학년/반/번호/이름 추출. 없으면 hasHeader=false.

\- 출력: `{ hasHeader: boolean, grade?, classNo?, studentNo?, name? }`



\### (b) OCR + \*\*\* 처리

\- 입력: 학생 답안 이미지(들)

\- 지시: 손글씨를 원문 그대로 텍스트화. 확신 없는 글자는 `\*\*\*`로 표기. 각 `\*\*\*`마다 정규화 좌표(x,y,w,h)와 해당 페이지를 maskedTokens로 반환.

\- 출력: `{ ocrText: string, maskedTokens: \[ {index, bbox:{x,y,w,h}, pageRef} ] }`



\### (c) 채점

\- system: 루브릭(영역·기준·배점) + 채점 예시문(만점/3점+이유) + 교사 시스템 프롬프트

\- user: OCR 텍스트(또는 온라인 답안)

\- 지시: 영역별로 해당 레벨 점수와 근거를 매기고, 총점·종합 피드백(잘한 점/보완할 점) 생성.

\- 출력: `{ scores:\[{criterionName,score,reason}], totalScore, aiReason, aiFeedback }`



> 모든 프롬프트는 응답 스키마(JSON)를 강제하고, 서버에서 파싱·검증 후 저장한다.



\---



\## 7. 화면 목록 (1차)



1\. 로그인 / 과목 선택

2\. 회차 목록 (복사해서 만들기 포함)

3\. \*\*회차 설정\*\* — 시스템 프롬프트 + 루브릭 빌더(clipo 구조) + 채점 예시문 + 입력모드/캔버스 설정

4\. PDF 업로드 → 학생 분류 확인

5\. \*\*채점 화면\*\* — 좌: 답안 뷰어 / 우: 채점표·근거·피드백 + AI 경고 문구

6\. 리포트 — 반/학년 × 회차별 점수·총점 조회



\---



\## 8. GitHub → Vercel 배포 (교사용 4단계)



1\. 원본 레포 \*\*Fork\*\*

2\. Vercel에서 \*\*Import\*\*

3\. 환경변수 입력: Firebase 설정값, Gemini API 키 (`.env.example` 제공)

4\. \*\*Deploy\*\*



\- 앱 첫 실행 시 "초기 설정 위저드"로 과목·첫 회차 생성 안내

\- README에 스크린샷 가이드 포함



\### 필요한 환경변수 (.env.example)

```

NEXT\_PUBLIC\_FIREBASE\_API\_KEY=

NEXT\_PUBLIC\_FIREBASE\_AUTH\_DOMAIN=

NEXT\_PUBLIC\_FIREBASE\_PROJECT\_ID=

NEXT\_PUBLIC\_FIREBASE\_STORAGE\_BUCKET=

NEXT\_PUBLIC\_FIREBASE\_MESSAGING\_SENDER\_ID=

NEXT\_PUBLIC\_FIREBASE\_APP\_ID=

FIREBASE\_ADMIN\_PROJECT\_ID=

FIREBASE\_ADMIN\_CLIENT\_EMAIL=

FIREBASE\_ADMIN\_PRIVATE\_KEY=

GEMINI\_API\_KEY=

\# 2차

RESEND\_API\_KEY=

```



\---



\## 9. 개발 범위 분리



\### 1차 MVP (먼저 구현)

스캔 PDF 업로드 → 머리글 학생 분류 → OCR(+\*\*\* 좌표 저장) → 루브릭 채점 → 결과 저장 → 반/학년·회차별 집계 조회.



\### 2차 확장 (이후)

\- 피드백 이메일 발송(스캔=교사 사전입력 / 온라인=학생 입력 주소 분기, 발송 전 확인)

\- 플로팅 원본 비교창(`\*\*\*` 클릭 → bbox로 원본 영역 표시, 드래그·닫기)

\- 학생 온라인 직접입력 모드

\- 수학/과학 캔버스(그리기/손글씨판 → '넣기'로 답안 위치 삽입, 교사가 표시 여부 결정)



> 1차에서 maskedTokens 좌표·email 필드·inputMode/useCanvas 플래그를 미리 스키마에 넣어두어 2차는 UI 추가에 가깝게 만든다.



\---



\## 10. 구현 순서 (확정)



1\. \*\*레포 뼈대\*\* — 폴더 구조, Vercel 배포 설정, `.env.example`, Firebase·Gemini 연결 기본 코드

2\. \*\*회차 설정 + 루브릭 빌더 화면\*\* (clipo 구조 반영)

3\. \*\*PDF 업로드 → 학생 분류 → OCR 서버 함수\*\*

4\. \*\*채점 화면\*\* (좌우 분할)



> 그 다음 9번의 2차 기능을 순차 확장.



\---



\## 11. 권장 폴더 구조 (참고)



```

/app

&#x20; /(auth)/login

&#x20; /subjects                      # 과목 선택

&#x20; /subjects/\[subjectId]/assessments            # 회차 목록

&#x20; /subjects/\[subjectId]/assessments/\[id]/edit  # 회차 설정 + 루브릭 빌더

&#x20; /subjects/\[subjectId]/assessments/\[id]/upload   # PDF 업로드/분류

&#x20; /subjects/\[subjectId]/assessments/\[id]/grade    # 채점 화면

&#x20; /subjects/\[subjectId]/assessments/\[id]/report   # 리포트

&#x20; /api

&#x20;   /ocr/route.ts                # Gemini OCR (서버)

&#x20;   /classify/route.ts           # 머리글 추출/분류 (서버)

&#x20;   /grade/route.ts              # 채점 (서버)

&#x20;   /email/route.ts              # 2차: 발송

/lib

&#x20; firebase.client.ts

&#x20; firebase.admin.ts

&#x20; gemini.ts

&#x20; types.ts                       # 4번 데이터 모델 타입

/components

&#x20; RubricBuilder.tsx

&#x20; AnswerViewer.tsx

&#x20; ScorePanel.tsx

&#x20; FloatingCompare.tsx            # 2차

```



\---



\## 12. Claude Desktop에 줄 첫 지시 예시



> "이 PROJECT\_PLAN.md를 기준으로 \*\*10번 구현 순서의 1단계(레포 뼈대)\*\*를 만들어줘. Next.js(App Router)+TypeScript+Tailwind, 11번 폴더 구조, .env.example, lib/firebase.client.ts, lib/firebase.admin.ts, lib/gemini.ts, lib/types.ts(4번 데이터 모델), 그리고 Vercel 배포 설정과 README(교사용 4단계 배포 가이드)까지 포함해줘."

