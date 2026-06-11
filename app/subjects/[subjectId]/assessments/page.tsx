"use client";

/**
 * 회차 목록 — 화면 2 ("새로 만들기" + "복사해서 만들기", clipo 패턴)
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import {
  copyAssessment,
  deleteAssessment,
  listAssessments,
} from "@/lib/db";
import type { AssessmentWithId } from "@/lib/types";

function formatDate(millis?: number) {
  if (!millis) return "";
  return new Date(millis).toLocaleDateString("ko-KR");
}

function AssessmentsContent({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<AssessmentWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listAssessments(subjectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "회차를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCopy(sourceId: string) {
    setBusy(true);
    setError(null);
    try {
      const newId = await copyAssessment(subjectId, sourceId);
      router.push(`/subjects/${subjectId}/assessments/${newId}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "복사에 실패했습니다.");
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 회차를 삭제할까요?")) return;
    await deleteAssessment(subjectId, id);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/subjects" className="text-sm text-slate-500 hover:text-slate-700">
            ← 과목
          </Link>
          <h1 className="mt-1 text-2xl font-bold">회차 목록</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/subjects/${subjectId}/assessments/new/edit`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + 새로 만들기
          </Link>
          <button
            type="button"
            onClick={() => items[0] && void handleCopy(items[0].id)}
            disabled={busy || items.length === 0}
            title={items.length === 0 ? "복사할 회차가 없습니다" : "최근 회차를 복사합니다"}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            복사해서 만들기
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          아직 회차가 없습니다. “새로 만들기”로 첫 서논술형 회차를 생성하세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDate(a.date)} · {a.inputMode === "scan" ? "스캔" : "온라인"}
                  {a.useCanvas ? " · 캔버스" : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Link
                  href={`/subjects/${subjectId}/assessments/${a.id}/edit`}
                  className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100"
                >
                  설정
                </Link>
                <Link
                  href={`/subjects/${subjectId}/assessments/${a.id}/upload`}
                  className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100"
                >
                  업로드
                </Link>
                <Link
                  href={`/subjects/${subjectId}/assessments/${a.id}/report`}
                  className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100"
                >
                  리포트
                </Link>
                <button
                  onClick={() => void handleCopy(a.id)}
                  disabled={busy}
                  className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  복사
                </button>
                <button
                  onClick={() => void handleDelete(a.id)}
                  className="rounded px-2 py-1 text-red-500 hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function AssessmentsPage({
  params,
}: {
  params: { subjectId: string };
}) {
  return (
    <AuthGate>
      <AssessmentsContent subjectId={params.subjectId} />
    </AuthGate>
  );
}
