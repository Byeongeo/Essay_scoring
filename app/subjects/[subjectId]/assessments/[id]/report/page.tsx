"use client";

/**
 * 리포트 — 화면 6 (반/학년 × 회차별 점수·총점 조회)
 *
 * MVP에서는 submission의 평면 필드(grade/classNo/totalScore)를 클라이언트에서 집계한다.
 * (5번 stats 문서/Cloud Function 갱신은 이후 확장. 비정규화 필드는 이미 저장되어 있음)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { getAssessment, listSubmissions } from "@/lib/db";
import type { AssessmentWithId, SubmissionWithId } from "@/lib/types";

function ReportContent({ subjectId, id }: { subjectId: string; id: string }) {
  const [assessment, setAssessment] = useState<AssessmentWithId | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, subs] = await Promise.all([
        getAssessment(subjectId, id),
        listSubmissions(subjectId, id),
      ]);
      setAssessment(a);
      setSubmissions(subs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [subjectId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const grades = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.grade))).sort((a, b) => a - b),
    [submissions],
  );
  const classes = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.classNo))).sort((a, b) => a - b),
    [submissions],
  );

  const filtered = useMemo(
    () =>
      submissions.filter(
        (s) =>
          (gradeFilter === "all" || s.grade === Number(gradeFilter)) &&
          (classFilter === "all" || s.classNo === Number(classFilter)),
      ),
    [submissions, gradeFilter, classFilter],
  );

  const avg = useMemo(() => {
    const graded = filtered.filter((s) => (s.totalScore ?? 0) > 0);
    if (!graded.length) return null;
    const sum = graded.reduce((a, s) => a + (s.totalScore ?? 0), 0);
    return Math.round((sum / graded.length) * 10) / 10;
  }, [filtered]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/subjects/${subjectId}/assessments`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← 회차 목록
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            리포트 {assessment ? `· ${assessment.title}` : ""}
          </h1>
        </div>
        <Link
          href={`/subjects/${subjectId}/assessments/${id}/grade`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          채점 화면
        </Link>
      </header>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">학년 전체</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {g}학년
            </option>
          ))}
        </select>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">반 전체</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}반
            </option>
          ))}
        </select>

        <div className="ml-auto flex gap-4 text-sm text-slate-600">
          <span>
            인원 <strong>{filtered.length}</strong>명
          </span>
          <span>
            평균 총점 <strong>{avg ?? "—"}</strong>
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">학년</th>
              <th className="px-4 py-2">반</th>
              <th className="px-4 py-2">번호</th>
              <th className="px-4 py-2">이름</th>
              <th className="px-4 py-2 text-right">총점</th>
              <th className="px-4 py-2">상태</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  불러오는 중…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  표시할 답안이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const graded = (s.totalScore ?? 0) > 0 || (s.scores?.length ?? 0) > 0;
                return (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{s.grade}</td>
                    <td className="px-4 py-2">{s.classNo}</td>
                    <td className="px-4 py-2">{s.studentNo}</td>
                    <td className="px-4 py-2">{s.name || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {graded ? s.totalScore : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {graded ? (
                        <span className="text-green-600">채점완료</span>
                      ) : (
                        <span className="text-slate-400">미채점</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function ReportPage({
  params,
}: {
  params: { subjectId: string; id: string };
}) {
  return (
    <AuthGate>
      <ReportContent subjectId={params.subjectId} id={params.id} />
    </AuthGate>
  );
}
