"use client";

/**
 * 채점 화면 — 화면 5 (좌: 답안 뷰어 / 우: 채점표·근거·피드백)
 *
 * listSubmissions로 학생 목록을 불러오고, 선택한 학생의 답안을 좌측에,
 * 루브릭 기반 채점표를 우측에 표시한다. "AI 채점 실행"은 /api/grade 를 호출해
 * 점수·근거·피드백을 채우고, 교사가 수정 후 저장하면 updateSubmission 한다.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import AnswerViewer from "@/components/AnswerViewer";
import ScorePanel from "@/components/ScorePanel";
import { gradeAnswer } from "@/lib/api";
import {
  getAssessment,
  getRubric,
  listSubmissions,
  updateSubmission,
} from "@/lib/db";
import type {
  AssessmentWithId,
  CriterionScore,
  Rubric,
  SubmissionWithId,
} from "@/lib/types";

function GradeContent({ subjectId, id }: { subjectId: string; id: string }) {
  const [assessment, setAssessment] = useState<AssessmentWithId | null>(null);
  const [rubric, setRubric] = useState<Rubric>({ criteria: [] });
  const [submissions, setSubmissions] = useState<SubmissionWithId[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 선택 학생 편집 상태
  const [scores, setScores] = useState<CriterionScore[]>([]);
  const [aiReason, setAiReason] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => submissions.find((s) => s.id === selectedId) ?? null,
    [submissions, selectedId],
  );

  const totalScore = useMemo(
    () => scores.reduce((sum, s) => sum + (s.score || 0), 0),
    [scores],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r, subs] = await Promise.all([
        getAssessment(subjectId, id),
        getRubric(subjectId, id),
        listSubmissions(subjectId, id),
      ]);
      setAssessment(a);
      setRubric(r ?? { criteria: [] });
      setSubmissions(subs);
      if (subs.length && !selectedId) setSelectedId(subs[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [subjectId, id, selectedId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, id]);

  // 선택 학생이 바뀌면 편집 상태를 그 학생 값으로 초기화
  useEffect(() => {
    if (!selected) return;
    setScores(selected.scores ?? []);
    setAiReason(selected.aiReason ?? "");
    setAiFeedback(selected.aiFeedback ?? "");
    setTeacherFeedback(selected.teacherFeedback ?? "");
    setMessage(null);
    setError(null);
  }, [selected]);

  function handleScoreChange(criterionName: string, score: number) {
    setScores((prev) => {
      const next = prev.filter((s) => s.criterionName !== criterionName);
      if (!Number.isNaN(score)) next.push({ criterionName, score });
      return next;
    });
  }

  async function handleRunAI() {
    if (!selected) return;
    setRunning(true);
    setError(null);
    try {
      const result = await gradeAnswer({
        rubric,
        examples: assessment?.examples ?? [],
        systemPrompt: assessment?.systemPrompt ?? "",
        answerText: selected.ocrText ?? "",
      });
      setScores(
        result.scores.map((s) => ({
          criterionName: s.criterionName,
          score: s.score,
        })),
      );
      const reasonText = result.scores
        .map((s) => `· ${s.criterionName}: ${s.reason}`)
        .join("\n");
      setAiReason(
        [result.aiReason, reasonText].filter(Boolean).join("\n\n"),
      );
      setAiFeedback(result.aiFeedback);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 채점에 실패했습니다.");
    } finally {
      setRunning(false);
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateSubmission(subjectId, id, selected.id, {
        scores,
        totalScore,
        aiReason,
        aiFeedback,
        teacherFeedback,
      });
      // 로컬 목록도 갱신
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selected.id
            ? { ...s, scores, totalScore, aiReason, aiFeedback, teacherFeedback }
            : s,
        ),
      );
      setMessage("저장했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={`/subjects/${subjectId}/assessments`}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← 목록
            </Link>
            <h1 className="text-lg font-bold">
              채점 {assessment ? `· ${assessment.title}` : ""}
            </h1>
          </div>
          <p className="text-xs text-amber-600">
            ⚠ AI 채점 결과는 부정확할 수 있으니 교사의 최종 확인이 필요합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-sm text-green-600">{message}</span>}
          {error && <span className="text-sm text-red-500">{error}</span>}
          <Link
            href={`/subjects/${subjectId}/assessments/${id}/report`}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            리포트
          </Link>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !selected}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </header>

      {loading ? (
        <p className="py-20 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : submissions.length === 0 ? (
        <div className="py-20 text-center text-sm text-slate-500">
          <p>아직 채점할 답안이 없습니다.</p>
          <Link
            href={`/subjects/${subjectId}/assessments/${id}/upload`}
            className="mt-2 inline-block text-brand-600 hover:underline"
          >
            답안 업로드하러 가기 →
          </Link>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[200px_1fr_1fr]">
          {/* 학생 목록 */}
          <aside className="overflow-auto border-r border-slate-200 bg-white">
            <ul>
              {submissions.map((s) => {
                const isActive = s.id === selectedId;
                const done = (s.totalScore ?? 0) > 0 || (s.scores?.length ?? 0) > 0;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                        isActive ? "bg-brand-50 font-medium" : ""
                      }`}
                    >
                      <span>
                        {s.grade}-{s.classNo}-{s.studentNo} {s.name || "(이름 없음)"}
                      </span>
                      {done && <span className="text-xs text-green-600">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* 답안 뷰어 */}
          <section className="overflow-auto border-r border-slate-200 bg-slate-100 p-4">
            {selected && (
              <AnswerViewer
                pageRefs={selected.pageImageRefs ?? []}
                ocrText={selected.ocrText}
              />
            )}
          </section>

          {/* 채점표 */}
          <section className="overflow-auto bg-white p-4">
            <ScorePanel
              rubric={rubric}
              scores={scores}
              onScoreChange={handleScoreChange}
              totalScore={totalScore}
              aiReason={aiReason}
              aiFeedback={aiFeedback}
              teacherFeedback={teacherFeedback}
              onTeacherFeedbackChange={setTeacherFeedback}
              onCopyFeedback={() => setTeacherFeedback(aiFeedback)}
              onRunAI={handleRunAI}
              running={running}
            />
          </section>
        </div>
      )}
    </div>
  );
}

export default function GradePage({
  params,
}: {
  params: { subjectId: string; id: string };
}) {
  return (
    <AuthGate>
      <GradeContent subjectId={params.subjectId} id={params.id} />
    </AuthGate>
  );
}
