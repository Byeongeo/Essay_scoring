/**
 * 채점에 쓸 수 있는 Gemini 모델 목록 (클라이언트/서버 공용 — server-only 아님).
 * 회차 설정의 "채점 모델" 드롭다운과 기본값에 사용한다.
 *
 * 모델 가용성은 API 키/계정에 따라 다를 수 있다. (없는 모델 선택 시 채점 호출이 404)
 */
export interface GradingModelOption {
  id: string;
  label: string;
}

export const GRADING_MODELS: GradingModelOption[] = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash — 똑똑·빠름·안정 (권장)" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (preview) — 더 저렴·빠름" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview) — 최고 정확도·느림·비쌈" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash — 안정·저렴" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro — 정확·느림" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite — 최저가 (채점엔 비권장)" },
];

export const DEFAULT_GRADING_MODEL = "gemini-3.5-flash";
