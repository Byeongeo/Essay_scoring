/**
 * POST /api/classify — 페이지 머리글 추출/학생 분류 (서버, Gemini)
 *
 * body: { pageImageBase64: string, mimeType?: string }
 * res : HeaderExtraction
 *
 * 1단계 뼈대: 단일 페이지 머리글 추출만 노출. 여러 페이지를 학생 단위로 묶는
 * 분류 루프(2번 규칙)는 3단계 업로드 파이프라인에서 이 엔드포인트를 반복 호출해 구성한다.
 */
import { NextResponse } from "next/server";
import { extractHeader } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { pageImageBase64, mimeType } = await req.json();
    if (!pageImageBase64) {
      return NextResponse.json(
        { error: "pageImageBase64 가 필요합니다." },
        { status: 400 },
      );
    }
    const result = await extractHeader(pageImageBase64, mimeType);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "분류 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
