"use client";

/**
 * 서버 Route Handler 호출 헬퍼 (클라이언트)
 * Gemini 키는 서버에만 있으므로 분류/OCR/채점은 모두 이 엔드포인트들을 통해 호출한다.
 */
import type { GradingResult, HeaderExtraction, OcrResult } from "./types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `요청 실패 (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/** 단일 페이지 머리글 추출 */
export function classifyPage(
  pageImageBase64: string,
  mimeType = "image/jpeg",
): Promise<HeaderExtraction> {
  return postJson<HeaderExtraction>("/api/classify", { pageImageBase64, mimeType });
}

/** 학생 한 명 분량 페이지들의 OCR + *** 좌표 */
export function ocrPages(
  pages: Array<{ base64: string; mimeType?: string; pageRef: string }>,
): Promise<OcrResult> {
  return postJson<OcrResult>("/api/ocr", { pages });
}

/** 루브릭 채점 */
export function gradeAnswer(body: {
  rubric: unknown;
  examples: unknown;
  systemPrompt: string;
  answerText: string;
  /** 회차에 지정한 채점 모델 (선택) */
  model?: string;
}): Promise<GradingResult> {
  return postJson<GradingResult>("/api/grade", body);
}
