/**
 * POST /api/ocr — 손글씨 OCR + *** 좌표 처리 (서버, Gemini)
 *
 * body: { pages: Array<{ base64: string; mimeType?: string; pageRef: string }> }
 * res : OcrResult  ({ ocrText, maskedTokens })
 *
 * 온라인 텍스트 입력은 OCR을 생략하므로 이 엔드포인트를 호출하지 않는다. (4번 워크플로우)
 */
import { NextResponse } from "next/server";
import { ocrWithMasks } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { pages } = await req.json();
    if (!Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: "pages 배열이 필요합니다." },
        { status: 400 },
      );
    }
    const result = await ocrWithMasks(pages);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OCR 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
