/**
 * POST /api/email — 피드백 이메일 발송 (서버) — 2차 확장
 *
 * body: { to: string, subject: string, html: string }
 * 발송 전 교사 확인을 거친 뒤 호출한다. (스캔=교사 사전입력 / 온라인=학생 입력 주소)
 *
 * 1단계 뼈대: 키 미설정 시 안내만 반환하는 스텁. 실제 Resend 연동은 2차에서.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "이메일 발송은 2차 기능입니다. RESEND_API_KEY 미설정." },
      { status: 501 },
    );
  }

  try {
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "to, subject, html 이 필요합니다." },
        { status: 400 },
      );
    }
    // TODO(2차): Resend SDK로 실제 발송 + submissions.emailStatus 갱신
    return NextResponse.json({ status: "not_implemented" }, { status: 501 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "발송 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
