import Link from "next/link";

/**
 * 홈 / 랜딩. 1차 뼈대에서는 진입 안내만 제공한다.
 * (배포 후 첫 실행 시 "초기 설정 위저드"로 과목·첫 회차 생성 — 8번)
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          서논술형 자동 채점
        </h1>
        <p className="mt-3 text-slate-600">
          스캔 답안 분류 · OCR · 루브릭 채점 · 반/학년·회차별 리포트까지 한 곳에서.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          교사 로그인
        </Link>
        <Link
          href="/subjects"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
        >
          과목 바로가기
        </Link>
      </div>

      <p className="max-w-md text-xs text-slate-400">
        AI 채점 결과는 부정확할 수 있으니 교사의 최종 확인이 필요합니다.
      </p>
    </main>
  );
}
