/**
 * Firestore 데이터 모델 타입 (PROJECT_PLAN.md 4·5번 기준)
 *
 * 컬렉션 경로:
 *   subjects/{subjectId}
 *   subjects/{subjectId}/assessments/{assessmentId}
 *   subjects/{subjectId}/assessments/{assessmentId}/rubric (단일 문서)
 *   subjects/{subjectId}/assessments/{assessmentId}/submissions/{submissionId}
 *   subjects/{subjectId}/assessments/{assessmentId}/stats (단일 문서, Cloud Function 갱신)
 *
 * 1차 MVP에서도 2차 확장 필드(maskedTokens 좌표, email, inputMode/useCanvas)를
 * 미리 스키마에 포함해 둔다. (9번 메모)
 */

// 타임스탬프는 클라이언트(firebase/firestore의 Timestamp)와 서버(admin)의 표현이
// 달라 여기서는 직렬화 친화적인 number(ms epoch) 또는 ISO 문자열을 기본으로 둔다.
export type Millis = number;

/** 입력 모드: 스캔 PDF 일괄 업로드 / 학생 온라인 직접입력 */
export type InputMode = "scan" | "online";

/** 피드백 이메일 발송 상태 (2차) */
export type EmailStatus = "none" | "sent" | "failed";

/** 판독불가(***) 토큰의 정규화 좌표 (0~1 비율) */
export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// subjects/{subjectId}
// ---------------------------------------------------------------------------
export interface Subject {
  /** 과목명 (국어/영어/수학/과학/사회 …) */
  name: string;
  /** 소유 교사 UID (Firebase Auth) — 데이터 격리/권한 검사용 */
  ownerUid?: string;
  createdAt?: Millis;
}

export type SubjectWithId = Subject & { id: string };

// ---------------------------------------------------------------------------
// subjects/{subjectId}/assessments/{assessmentId}
// ---------------------------------------------------------------------------

/** 채점 예시문 (만점/3점 예시 + 이유) */
export interface ScoringExample {
  score: number;
  text: string;
  reason: string;
}

export interface Assessment {
  /** "서논술형 1회" 등 */
  title: string;
  /** 시행 날짜 */
  date: Millis;
  inputMode: InputMode;
  /** 수학/과학 그리기판 표시 여부 */
  useCanvas: boolean;
  /** 자유 입력 채점 프롬프트 */
  systemPrompt: string;
  /** 채점 예시문 */
  examples: ScoringExample[];
  /** 이 회차 AI 채점에 쓸 Gemini 모델 (미지정 시 서버 기본값) */
  gradingModel?: string;
  createdAt?: Millis;
}

export type AssessmentWithId = Assessment & { id: string };

// ---------------------------------------------------------------------------
// .../rubric (단일 문서)
// ---------------------------------------------------------------------------

/** 루브릭 급간(레벨): 점수 + 세부기준 */
export interface RubricLevel {
  label: string;
  score: number;
  descriptor: string;
}

/** 채점요소(영역) */
export interface RubricCriterion {
  name: string;
  levels: RubricLevel[];
}

export interface Rubric {
  criteria: RubricCriterion[];
}

// ---------------------------------------------------------------------------
// .../submissions/{submissionId}
// ---------------------------------------------------------------------------

/** *** 판독불가 토큰 좌표 (2차 플로팅 비교창에서 사용) */
export interface MaskedToken {
  index: number;
  bbox: BBox;
  /** 해당 토큰이 위치한 페이지 이미지 Storage 경로 */
  pageRef: string;
}

/** 영역별 점수 (집계/저장용) */
export interface CriterionScore {
  criterionName: string;
  score: number;
}

export interface Submission {
  // --- 집계용 평면 필드 (비정규화) ---
  grade: number;
  classNo: number;
  studentNo: number;
  name: string;
  /** 스캔=교사 사전입력(CSV) / 온라인=학생 입력 */
  email: string;

  // --- 답안 원본 ---
  /** Storage 경로 (페이지 이미지들) */
  pageImageRefs: string[];
  ocrText: string;
  /** *** 좌표 목록 */
  maskedTokens: MaskedToken[];

  // --- 채점 결과 ---
  scores: CriterionScore[];
  /** 집계용 평면 필드 */
  totalScore: number;
  aiReason: string;
  aiFeedback: string;
  teacherFeedback: string;

  // --- 발송 (2차) ---
  emailStatus: EmailStatus;

  createdAt?: Millis;
}

export type SubmissionWithId = Submission & { id: string };

// ---------------------------------------------------------------------------
// .../stats (단일 문서, Cloud Function이 채점 완료 시 갱신)
// ---------------------------------------------------------------------------

export interface ClassStat {
  avgTotal: number;
  count: number;
  /** 영역별 평균 등 */
  byCriterion: Record<string, { avg: number }>;
}

export interface GradeStat {
  avgTotal: number;
  count: number;
}

export interface AssessmentStats {
  byClass: Record<string, ClassStat>;
  byGrade: Record<string, GradeStat>;
}

// ===========================================================================
//  Gemini 구조화 출력 타입 (6번 프롬프트 설계 — JSON 강제 출력)
// ===========================================================================

/** (a) 머리글 추출 결과 */
export interface HeaderExtraction {
  hasHeader: boolean;
  grade?: number;
  classNo?: number;
  studentNo?: number;
  name?: string;
}

/** (b) OCR + *** 처리 결과 */
export interface OcrResult {
  ocrText: string;
  maskedTokens: MaskedToken[];
}

/** (c) 채점 결과 */
export interface GradingResult {
  scores: Array<{ criterionName: string; score: number; reason: string }>;
  totalScore: number;
  aiReason: string;
  aiFeedback: string;
}
