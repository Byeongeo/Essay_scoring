/**
 * Google Gemini API 래퍼 (서버 전용)
 *
 * PROJECT_PLAN.md 6번 프롬프트 설계 구현:
 *   (a) extractHeader   — 페이지 머리글에서 학년/반/번호/이름 추출
 *   (b) ocrWithMasks    — 손글씨 OCR + 판독불가(***) 좌표 저장
 *   (c) gradeSubmission — 루브릭·예시문 기반 채점
 *
 * 모든 호출은 responseSchema(JSON)를 강제하고, 호출부에서 파싱·검증 후 저장한다.
 * GEMINI_API_KEY 는 서버 환경변수로만 주입한다. (클라이언트 노출 금지)
 */
import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import type {
  GradingResult,
  HeaderExtraction,
  OcrResult,
  Rubric,
  ScoringExample,
} from "./types";

// 멀티모달(OCR·머리글 추출) + 구조화 JSON 출력에 적합한 현행 안정 모델.
// 교사가 GEMINI_MODEL 로 덮어쓸 수 있다. (gemini-2.0-flash 는 제공 중단됨)
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY 가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.",
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** base64 이미지(또는 PDF 페이지)를 Gemini inlineData 파트로 변환 */
export function inlineImage(base64Data: string, mimeType = "image/png") {
  return { inlineData: { data: base64Data, mimeType } };
}

/** 모델 응답 텍스트를 JSON으로 안전 파싱 */
function parseJson<T>(text: string | undefined): T {
  if (!text) throw new Error("Gemini 응답이 비어 있습니다.");
  // 혹시 코드펜스가 섞여 와도 견디도록 방어
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  return JSON.parse(cleaned) as T;
}

// ---------------------------------------------------------------------------
// (a) 머리글 추출
// ---------------------------------------------------------------------------
const headerSchema = {
  type: Type.OBJECT,
  properties: {
    hasHeader: { type: Type.BOOLEAN },
    grade: { type: Type.NUMBER, nullable: true },
    classNo: { type: Type.NUMBER, nullable: true },
    studentNo: { type: Type.NUMBER, nullable: true },
    name: { type: Type.STRING, nullable: true },
  },
  required: ["hasHeader"],
};

export async function extractHeader(
  pageImageBase64: string,
  mimeType = "image/png",
): Promise<HeaderExtraction> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "이 답안지 페이지 상단의 머리글에서 학년(grade), 반(classNo), 번호(studentNo), 이름(name)을 추출하라. " +
              "머리글(학생 식별 정보)이 없으면 hasHeader=false 로 응답하라. 숫자는 정수로.",
          },
          inlineImage(pageImageBase64, mimeType),
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: headerSchema,
    },
  });
  return parseJson<HeaderExtraction>(res.text);
}

// ---------------------------------------------------------------------------
// (b) OCR + *** 처리
// ---------------------------------------------------------------------------
const ocrSchema = {
  type: Type.OBJECT,
  properties: {
    ocrText: { type: Type.STRING },
    maskedTokens: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.NUMBER },
          bbox: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              w: { type: Type.NUMBER },
              h: { type: Type.NUMBER },
            },
            required: ["x", "y", "w", "h"],
          },
          pageRef: { type: Type.STRING },
        },
        required: ["index", "bbox", "pageRef"],
      },
    },
  },
  required: ["ocrText", "maskedTokens"],
};

/**
 * @param pages  학생 한 명의 답안 이미지들. pageRef 는 Storage 경로로,
 *               maskedTokens 의 pageRef 에 그대로 매핑되도록 모델에 전달한다.
 */
export async function ocrWithMasks(
  pages: Array<{ base64: string; mimeType?: string; pageRef: string }>,
): Promise<OcrResult> {
  const ai = getClient();
  const parts: Array<Record<string, unknown>> = [
    {
      text:
        "다음 학생 답안 이미지를 손글씨 원문 그대로 텍스트화하라. " +
        "확신이 없는 글자는 정확히 `***` 로 표기하라. " +
        "각 `***` 마다 0~1 로 정규화된 좌표 bbox{x,y,w,h} 와 해당 페이지의 pageRef 를 maskedTokens 에 담아라. " +
        "index 는 ocrText 안에서 등장한 *** 의 0-기반 순번이다.\n" +
        "각 이미지의 pageRef 는 아래 순서대로 매핑하라: " +
        pages.map((p, i) => `[${i}] ${p.pageRef}`).join(", "),
    },
  ];
  for (const p of pages) {
    parts.push(inlineImage(p.base64, p.mimeType ?? "image/png"));
  }

  const res = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: "user", parts: parts as never }],
    config: {
      responseMimeType: "application/json",
      responseSchema: ocrSchema,
    },
  });
  return parseJson<OcrResult>(res.text);
}

// ---------------------------------------------------------------------------
// (c) 채점
// ---------------------------------------------------------------------------
const gradingSchema = {
  type: Type.OBJECT,
  properties: {
    scores: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterionName: { type: Type.STRING },
          score: { type: Type.NUMBER },
          reason: { type: Type.STRING },
        },
        required: ["criterionName", "score", "reason"],
      },
    },
    totalScore: { type: Type.NUMBER },
    aiReason: { type: Type.STRING },
    aiFeedback: { type: Type.STRING },
  },
  required: ["scores", "totalScore", "aiReason", "aiFeedback"],
};

export interface GradeInput {
  rubric: Rubric;
  examples: ScoringExample[];
  /** 교사 자유 입력 시스템 프롬프트 */
  systemPrompt: string;
  /** OCR 텍스트 또는 온라인 직접입력 답안 */
  answerText: string;
}

export async function gradeSubmission(input: GradeInput): Promise<GradingResult> {
  const ai = getClient();

  const rubricText = input.rubric.criteria
    .map((c) => {
      const levels = c.levels
        .map((l) => `    - ${l.label}(${l.score}점): ${l.descriptor}`)
        .join("\n");
      return `■ 영역: ${c.name}\n${levels}`;
    })
    .join("\n");

  const examplesText = input.examples.length
    ? input.examples
        .map((e) => `· ${e.score}점 예시: ${e.text}\n  (이유: ${e.reason})`)
        .join("\n")
    : "(예시문 없음)";

  const systemInstruction =
    "너는 서논술형 답안 채점 보조자다. 아래 루브릭과 예시문, 교사 지침에 따라 " +
    "각 영역별로 가장 적합한 레벨의 점수와 근거를 매기고, 총점과 종합 피드백" +
    "(잘한 점/보완할 점)을 생성하라. 반드시 루브릭에 정의된 점수 범위 내에서만 채점하라.\n\n" +
    `[루브릭]\n${rubricText}\n\n[채점 예시문]\n${examplesText}\n\n` +
    `[교사 지침]\n${input.systemPrompt || "(없음)"}`;

  const res = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: `다음은 학생 답안이다.\n\n${input.answerText}` }],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: gradingSchema,
    },
  });
  return parseJson<GradingResult>(res.text);
}
