"use client";

/**
 * 채점표 패널 — 채점 화면(5) 우측 (controlled).
 * 루브릭 영역별 점수 선택 + 총점 + AI 근거 + AI 피드백 + "피드백 옮기기" + 교사 직접 피드백.
 */
import type { CriterionScore, Rubric } from "@/lib/types";

export interface ScorePanelProps {
  rubric: Rubric;
  scores: CriterionScore[];
  onScoreChange: (criterionName: string, score: number) => void;
  totalScore: number;
  aiReason: string;
  aiFeedback: string;
  teacherFeedback: string;
  onTeacherFeedbackChange: (value: string) => void;
  onCopyFeedback: () => void;
  onRunAI: () => void;
  running: boolean;
}

export default function ScorePanel({
  rubric,
  scores,
  onScoreChange,
  totalScore,
  aiReason,
  aiFeedback,
  teacherFeedback,
  onTeacherFeedbackChange,
  onCopyFeedback,
  onRunAI,
  running,
}: ScorePanelProps) {
  const scoreOf = (name: string) =>
    scores.find((s) => s.criterionName === name)?.score;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">채점</h2>
        <button
          onClick={onRunAI}
          disabled={running}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {running ? "AI 채점 중…" : "AI 채점 실행"}
        </button>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">채점표</h3>
        {rubric.criteria.length === 0 ? (
          <p className="rounded-lg border border-slate-200 p-3 text-sm text-slate-400">
            이 회차에 루브릭이 없습니다. 회차 설정에서 먼저 루브릭을 작성하세요.
          </p>
        ) : (
          <div className="space-y-2">
            {rubric.criteria.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
              >
                <span className="text-sm font-medium text-slate-700">
                  {c.name || "(이름 없는 영역)"}
                </span>
                <select
                  value={scoreOf(c.name) ?? ""}
                  onChange={(e) =>
                    onScoreChange(c.name, Number(e.target.value))
                  }
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">미채점</option>
                  {c.levels.map((lv, i) => (
                    <option key={i} value={lv.score}>
                      {lv.label} ({lv.score}점)
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold">
              <span>총점</span>
              <span className="tabular-nums">{totalScore}점</span>
            </div>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">AI 채점 근거</h3>
        <div className="min-h-[3rem] whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {aiReason || "AI 채점을 실행하면 근거가 표시됩니다."}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">AI 피드백</h3>
          <button
            onClick={onCopyFeedback}
            disabled={!aiFeedback}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40"
          >
            피드백 옮기기 →
          </button>
        </div>
        <div className="min-h-[3rem] whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {aiFeedback || "AI 채점을 실행하면 피드백이 표시됩니다."}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">교사 직접 피드백</h3>
        <textarea
          value={teacherFeedback}
          onChange={(e) => onTeacherFeedbackChange(e.target.value)}
          rows={4}
          placeholder="학생에게 전달할 최종 피드백 (AI 피드백을 옮겨와 수정하세요)."
          className="w-full rounded-lg border border-slate-300 p-3 text-sm"
        />
      </section>

      <p className="text-xs text-amber-600">
        ⚠ AI 채점 결과는 부정확할 수 있으니 교사의 최종 확인이 필요합니다.
      </p>
    </div>
  );
}
