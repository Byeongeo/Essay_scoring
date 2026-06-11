/**
 * POST /api/grade — 루브릭·예시문 기반 채점 (서버, Gemini)
 *
 * body: GradeInput { rubric, examples, systemPrompt, answerText }
 * res : GradingResult  ({ scores, totalScore, aiReason, aiFeedback })
 *
 * 스캔(OCR 텍스트)·온라인(직접입력) 두 경로가 동일하게 합류하는 채점 파이프라인. (4번)
 */
import { NextResponse } from "next/server";
import { gradeSubmission, type GradeInput } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<GradeInput>;
    if (!body.rubric || !body.answerText) {
      return NextResponse.json(
        { error: "rubric 과 answerText 가 필요합니다." },
        { status: 400 },
      );
    }
    const result = await gradeSubmission({
      rubric: body.rubric,
      examples: body.examples ?? [],
      systemPrompt: body.systemPrompt ?? "",
      answerText: body.answerText,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "채점 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
