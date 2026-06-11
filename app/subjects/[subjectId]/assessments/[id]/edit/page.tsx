"use client";

/**
 * 회차 설정 + 루브릭 빌더 — 화면 3 (clipo 구조, Firestore 저장 연동)
 *
 * id === "new" 이면 신규 생성. 저장 시 회차 문서 + 루브릭(rubric/main) 문서를 함께 기록한다.
 * 임시저장: 저장 후 현재 화면 유지 / 저장: 저장 후 회차 목록으로 이동.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import RubricBuilder from "@/components/RubricBuilder";
import ExamplesEditor from "@/components/ExamplesEditor";
import {
  createAssessment,
  getAssessment,
  getRubric,
  saveRubric,
  updateAssessment,
} from "@/lib/db";
import type {
  Assessment,
  InputMode,
  Rubric,
  ScoringExample,
} from "@/lib/types";

function toDateInput(millis: number): string {
  const d = new Date(millis);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromDateInput(value: string): number {
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(ms) ? Date.now() : ms;
}

function EditContent({
  subjectId,
  id,
}: {
  subjectId: string;
  id: string;
}) {
  const router = useRouter();
  const isNew = id === "new";

  const [title, setTitle] = useState("서논술형 1회");
  const [dateStr, setDateStr] = useState(toDateInput(Date.now()));
  const [inputMode, setInputMode] = useState<InputMode>("scan");
  const [useCanvas, setUseCanvas] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [examples, setExamples] = useState<ScoringExample[]>([]);
  const [rubric, setRubric] = useState<Rubric>({ criteria: [] });

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        getAssessment(subjectId, id),
        getRubric(subjectId, id),
      ]);
      if (a) {
        setTitle(a.title);
        setDateStr(toDateInput(a.date));
        setInputMode(a.inputMode);
        setUseCanvas(a.useCanvas);
        setSystemPrompt(a.systemPrompt ?? "");
        setExamples(a.examples ?? []);
      }
      if (r) setRubric(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "회차를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [isNew, subjectId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function persist(): Promise<string> {
    const data: Assessment = {
      title: title.trim() || "제목 없음",
      date: fromDateInput(dateStr),
      inputMode,
      useCanvas,
      systemPrompt,
      examples,
    };
    if (isNew) {
      const newId = await createAssessment(subjectId, data);
      await saveRubric(subjectId, newId, rubric);
      return newId;
    }
    await updateAssessment(subjectId, id, data);
    await saveRubric(subjectId, id, rubric);
    return id;
  }

  async function handleSave(navigateAway: boolean) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const savedId = await persist();
      if (navigateAway) {
        router.push(`/subjects/${subjectId}/assessments`);
      } else if (isNew) {
        // 신규를 임시저장하면 이후 수정은 실제 문서로 이어가도록 URL 교체
        router.replace(`/subjects/${subjectId}/assessments/${savedId}/edit`);
        setMessage("임시저장했습니다.");
      } else {
        setMessage("임시저장했습니다.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="px-6 py-20 text-center text-sm text-slate-400">불러오는 중…</p>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? "새 회차" : "회차 설정"}</h1>
        <button
          onClick={() => router.push(`/subjects/${subjectId}/assessments`)}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← 목록
        </button>
      </header>

      <section className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="서논술형 1회"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">날짜</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">입력 모드</label>
            <select
              value={inputMode}
              onChange={(e) => setInputMode(e.target.value as InputMode)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="scan">스캔 PDF 업로드</option>
              <option value="online">학생 온라인 입력</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={useCanvas}
                onChange={(e) => setUseCanvas(e.target.checked)}
                className="h-4 w-4"
              />
              캔버스(수학/과학 그리기판) 사용
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            채점 시스템 프롬프트 (자유 입력)
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder="예: 논거의 타당성과 표현의 명료성을 중점적으로 평가하세요."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">루브릭</h2>
          <RubricBuilder initial={rubric} onChange={setRubric} />
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">채점 예시문</h2>
          <ExamplesEditor examples={examples} onChange={setExamples} />
        </div>
      </section>

      {error && <p className="mt-6 text-sm text-red-500">{error}</p>}
      {message && <p className="mt-6 text-sm text-green-600">{message}</p>}

      <div className="mt-8 flex justify-end gap-2">
        <button
          onClick={() => void handleSave(false)}
          disabled={saving}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          임시저장
        </button>
        <button
          onClick={() => void handleSave(true)}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </main>
  );
}

export default function AssessmentEditPage({
  params,
}: {
  params: { subjectId: string; id: string };
}) {
  return (
    <AuthGate>
      <EditContent subjectId={params.subjectId} id={params.id} />
    </AuthGate>
  );
}
