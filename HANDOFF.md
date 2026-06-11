# HANDOFF — 작업 인수인계 (다른 PC에서 이어가기)

> 이 파일은 작업을 다른 데스크톱/세션에서 이어갈 때 **가장 먼저 읽는** 문서입니다.
> 메모리는 옮겨지지 않으므로, 필요한 맥락을 여기 다 담았습니다. (작성: 2026-06-11)

---

## 0. 폴더를 새 PC로 옮긴 직후 할 일
1. `npm install` (node_modules가 빠졌을 수 있음)
2. **`.env.local` 파일이 폴더에 있는지 확인** — 여기에 모든 키(Firebase·Gemini)가 들어 있음.
   - ⚠️ `.env.local`과 `*-adminsdk-*.json`(Admin 키)은 **git에는 안 올라가지만 폴더(zip)에는 포함**됨.
     → 이 다운로드본은 **비밀이 들어있으니 외부 공유 금지**.
   - 만약 `.env.local`이 없으면 → `.env.example`를 복사하고 아래 "키 출처"대로 다시 채움.
3. `npm run dev` → http://localhost:3000 로 로컬 확인 가능.

---

## 1. 지금까지 한 것 (완료)
- **구현 순서 1~4단계(1차 MVP) 전부 완료**: 로그인 → 과목 → 회차/루브릭 → PDF 업로드·머리글 분류·OCR → AI 채점(좌우 분할) → 집계 리포트.
- **추가 기능**: 회차별 **채점 모델 선택**(회차 설정 드롭다운), 구조화 루브릭이 없으면 **AI 점수표 폴백**.
- **검증 완료**: `npm run build` 통과. Gemini 실호출(채점/머리글 추출) 정상 — 모델 **`gemini-3.5-flash`**.
  - 참고: `gemini-2.0-flash`는 제공 중단(404)이라 기본값을 3.5-flash로 변경함.
  - 콘솔에서 한글이 깨져 보이면 그건 **Windows 코드페이지(CP949) 표시 문제**일 뿐, 실제 데이터/응답은 정상 UTF-8.

## 2. Firebase 상태 (중요)
- **재사용 프로젝트: `cu-milksurvey-2025`** (새 프로젝트는 할당량 초과로 못 만들어서, 안 쓰던 이 프로젝트 재사용). Blaze(종량제) 상태.
  - 데이터 충돌 없음: 기존 데이터는 `artifacts/...`, 우리 앱은 `subjects/...`만 사용.
- **설정 완료**: Google 로그인 ON / Firestore 생성 / Storage 생성(위치 선택함).
  - ✅ 보안 규칙 게시함 — `firestore.rules`/`storage.rules`를 **`subjects/**`에만 적용**되도록 좁힌 버전(기존 milksurvey 데이터 영향 없음).
  - ⚠️ **익명 로그인은 꺼두는 게 좋음**(우리 규칙이 "로그인된 사용자=허용"이라 익명 켜져있으면 구멍). 안 껐으면 Authentication에서 끄기.
- **설정값은 `.env.local`에 모두 들어 있음** (NEXT_PUBLIC_FIREBASE_* 6개 + FIREBASE_ADMIN_* 3개).

## 3. GitHub 상태
- 레포: **https://github.com/Byeongeo/Essay_scoring** (`origin`, 기본 브랜치 `main`)
- 최신 커밋까지 푸시됨. (`git log --oneline`로 확인)
- 새 PC에서 푸시하려면 그 PC에서 GitHub 인증 필요(브라우저 로그인).

---

## 4. ⏭️ 지금 멈춘 지점 = 다음에 할 일: **Vercel 첫 배포**
**Vercel에 이 레포로 만든 프로젝트가 아직 없음** (한 번도 Import 안 함). 아래 한 번만 하면 이후 푸시는 자동 배포됨.

### ① Import
[vercel.com/new](https://vercel.com/new) → GitHub 연결 → **`Byeongeo/Essay_scoring`** 선택 → Import (Framework: Next.js 자동).

### ② 환경변수 — `.env.local` 내용 통째로 붙여넣기
Vercel Import 화면의 **Environment Variables**는 `.env` 텍스트를 붙여넣으면 자동 파싱됨.
→ 내 PC의 `.env.local` 전체 복사 → 붙여넣기. (주석·`\n`·따옴표 그대로 처리됨)
필요한 키: `NEXT_PUBLIC_FIREBASE_*`(6) + `FIREBASE_ADMIN_*`(3) + `GEMINI_API_KEY` + `GEMINI_MODEL`.

### ③ Deploy → ④ 배포 직후 필수
- 배포되면 `xxxx.vercel.app` 주소 생성.
- **Firebase 콘솔(cu-milksurvey-2025) → Authentication → Settings → 승인된 도메인에 그 `*.vercel.app` 추가.**
  (안 하면 배포본에서 Google 로그인이 `unauthorized-domain`으로 실패)

### ⑤ 동작 확인
[VERIFY.md](VERIFY.md)의 **D 체크리스트**: 로그인 → 과목추가(유지되면 Firestore·규칙 OK) → 회차/루브릭 → (PDF 있으면)업로드·채점 → 리포트.

### 빌드 실패 시 디버깅 힌트
- `auth/invalid-api-key` → `NEXT_PUBLIC_FIREBASE_*` 6개 누락
- 채점 500 `GEMINI_API_KEY...` → `GEMINI_API_KEY` 누락
- 로그인 팝업 `unauthorized-domain` → ④ 승인 도메인 누락
- 과목 저장 `permission-denied` → 보안 규칙 미게시

---

## 5. 키 출처 (재설정 필요할 때만)
- `NEXT_PUBLIC_FIREBASE_*` 6개: Firebase 콘솔 → ⚙️ 설정 → 일반 → 내 앱(웹앱 "우유급식앱") → SDK 설정.
- `FIREBASE_ADMIN_*` 3개: ⚙️ 설정 → 서비스 계정 → 새 비공개 키(JSON). private_key는 `\n` 이스케이프 + 양끝 큰따옴표로 한 줄.
- `GEMINI_API_KEY`: https://aistudio.google.com/apikey
- `GEMINI_MODEL`: 기본 `gemini-3.5-flash` (회차별로 화면에서 변경 가능)

## 6. 아직 안 한 것 / 2차 확장 (참고)
- **입력 모드 "온라인"은 빈 플래그**: 1차는 스캔 경로만 구현. 온라인 학생 직접입력 화면은 미구현(2차).
  업로드 페이지가 inputMode를 검사 안 하고 항상 업로드 허용 — 안내 배너 추가는 보류 상태.
- 2차 후보: 피드백 이메일 발송(/api/email Resend), `***` 원본 비교 플로팅창(FloatingCompare), 학생 온라인 입력, 수학/과학 캔버스, 통계 Cloud Function.
- 채점 정확도(교사-AI 격차) 높이려면: 회차에 **채점 예시문** 추가가 모델 교체보다 효과 큰 경우 많음. 또는 회차 모델을 `gemini-3.1-pro-preview`로.

## 7. 검증 명령
```bash
npm run build       # 배포 전 항상
npm run typecheck
```
