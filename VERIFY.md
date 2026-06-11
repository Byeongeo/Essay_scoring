# 배포 검증 체크리스트 (End-to-End)

빌드·런타임 부팅은 이미 확인됨(`npm run build` 통과, 프로덕션 서버 SSR 정상, 키 미설정 시 안내 UI 정상).
아래는 **실제 키를 넣고** 로그인 → 업로드 → 채점 → 리포트까지 동작하는지 확인하는 순서입니다.

---

## A. 사전 준비 — Firebase 콘솔에서 켜야 할 것 (가장 많이 빠뜨림)

- [ ] **Authentication → Sign-in method → Google** 사용 설정
- [ ] **Firestore Database** 생성 (프로덕션 모드여도 됨 — 아래 규칙을 배포하면 동작)
- [ ] **Storage** 생성
- [ ] **보안 규칙 배포** ⚠️ *이걸 안 하면 로그인은 되는데 과목/회차 읽기·쓰기가 전부 막힙니다.*
  - 방법 1) 콘솔에 직접 붙여넣기: `firestore.rules` 내용 → Firestore → 규칙 탭 / `storage.rules` → Storage → 규칙 탭 → 게시
  - 방법 2) CLI: `npm i -g firebase-tools && firebase login && firebase deploy --only firestore:rules,storage`
- [ ] **Authentication → Settings → 승인된 도메인**에 배포 도메인 추가
  - 로컬 검증 시: `localhost` (기본 포함됨)
  - Vercel 검증 시: `<프로젝트>.vercel.app` ⚠️ *없으면 Google 로그인 팝업이 `auth/unauthorized-domain`으로 실패*

---

## B. 로컬 검증 (선택, 문제를 빨리 잡기 좋음)

```bash
# 1) 키 채우기
Copy-Item .env.example .env.local      # PowerShell
#  .env.local 을 열어 NEXT_PUBLIC_FIREBASE_* / FIREBASE_ADMIN_* / GEMINI_API_KEY 입력
#  FIREBASE_ADMIN_PRIVATE_KEY 는 "-----BEGIN...\n...\n-----END...\n" 한 줄 + 양끝 큰따옴표

# 2) 실행
npm run dev        # http://localhost:3000
```

### Gemini 단독 스모크 테스트 (브라우저 없이 채점 API만 확인)

`npm run dev` 띄운 상태에서:

```bash
curl -s -X POST http://localhost:3000/api/grade \
  -H "Content-Type: application/json" \
  -d '{
    "rubric": { "criteria": [
      { "name": "논거의 타당성", "levels": [
        { "label": "상", "score": 3, "descriptor": "근거가 충분하고 타당함" },
        { "label": "중", "score": 2, "descriptor": "근거가 일부 부족" },
        { "label": "하", "score": 1, "descriptor": "근거가 빈약함" } ] } ] },
    "examples": [],
    "systemPrompt": "논거의 타당성을 중점 평가",
    "answerText": "나는 학교 급식을 채식 위주로 바꿔야 한다고 생각한다. 왜냐하면 건강에 좋고 환경에도 이롭기 때문이다."
  }'
```

- [ ] `{ "scores": [...], "totalScore": ..., "aiReason": ..., "aiFeedback": ... }` JSON이 돌아오면 **Gemini 채점 연동 정상**.
- [ ] 에러가 나면 메시지 확인: `GEMINI_API_KEY...` → 키 누락 / `API key not valid` → 키 오류 / 모델명 오류 → `GEMINI_MODEL` 조정.

---

## C. Vercel 배포 검증 (교사 실사용 환경)

1. [ ] 레포 **Fork** → [vercel.com/new](https://vercel.com/new)에서 **Import**
2. [ ] **Environment Variables**에 `.env.example` 항목 전부 입력
       (특히 `FIREBASE_ADMIN_PRIVATE_KEY` 줄바꿈·큰따옴표 형식 주의)
3. [ ] **Deploy** → 빌드 성공 확인 (실패 시 Vercel 빌드 로그의 첫 에러부터)
4. [ ] A의 **승인된 도메인**에 방금 생긴 `*.vercel.app` 추가했는지 재확인

---

## D. 기능 동작 체크 (배포 주소 또는 localhost에서 직접)

> 로그인·Firestore·Storage는 실제 브라우저 + 교사 Google 계정이 필요합니다(자동화 불가).

- [ ] `/login` → **Google로 로그인** → `/subjects`로 이동
- [ ] **과목 추가** → 카드 생성, 새로고침해도 유지 (Firestore 쓰기/읽기 OK)
- [ ] 과목 → **새로 만들기** → 제목·날짜·루브릭(영역+급간)·예시문 입력 → **저장** → 목록에 표시
- [ ] **복사해서 만들기** → 루브릭까지 복제된 새 회차 생성
- [ ] 회차 → **업로드** → 스캔 PDF 선택 → 페이지 썸네일 + 자동 학생 분류 표시
      - [ ] 경계가 틀리면 **“새 학생 시작”** 체크로 조정
      - [ ] 학년/반/번호/이름 입력 → **확정·저장** → “N명 저장” 완료
- [ ] **채점** → 좌측에 답안 이미지(페이지 넘김·확대) + OCR 텍스트 표시 (Storage 읽기 OK)
      - [ ] **AI 채점 실행** → 영역별 점수·근거·피드백 채워짐
      - [ ] **피드백 옮기기** → 교사 피드백란 채워짐 → 수정 → **저장**
- [ ] **리포트** → 학생 목록·총점·평균, 학년/반 필터 동작

---

## 자주 막히는 곳 → 원인

| 증상 | 원인 / 조치 |
| --- | --- |
| 로그인 팝업이 바로 닫힘, `unauthorized-domain` | A의 **승인된 도메인**에 현재 도메인 추가 |
| 과목/회차 저장이 안 됨, `permission-denied` | **보안 규칙 미배포** (A의 규칙 배포) |
| 답안 이미지가 안 보임 | Storage 미생성 / 규칙 미배포 / 업로드 실패 |
| AI 채점 시 500, `GEMINI_API_KEY...` | 서버 환경변수에 `GEMINI_API_KEY` 누락 |
| 배포 빌드 실패 `auth/invalid-api-key` | `NEXT_PUBLIC_FIREBASE_*` 누락 — 6개 모두 입력 |
| Admin 관련 오류 | `FIREBASE_ADMIN_PRIVATE_KEY` 줄바꿈(`\n`)·큰따옴표 형식 |
