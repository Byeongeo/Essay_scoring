"use client";

/**
 * 채점표 패널 — 채점 화면(5) 우측 (controlled).
 * 루브릭 영역별 점수 선택 + 총점 + AI 근거 + AI 피드백 + "피드백 옮기기" + 교사 직접 피드백.
 *
 * 두 가지 모드:
 *  (A) 구조화 루브릭이 있으면 → 영역별 급간 드롭다운으로 채점.
 *  (B) 구조화 루브릭이 비어 있으면 → 시스템 프롬프트 기준으로 AI가 만든 점수표(scores)를
 *      숫자 입력 행으로 표시(폴백). 교사가 영역을 직접 추가할 수도 있다.
 */
import { useState } from "react";
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
  const hasStructuredRubric = rubric.criteria.length > 0;
  const [newName, setNewName] = useState("");

  function addManualRow() {
    const name = newName.trim();
    if (!name) return;
    onScoreChange(name, 0);
    setNewName("");
  }

  const totalRow = (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold">
      <span>총점</span>
      <span className="tabular-nums">{totalScore}점</span>
    </div>
  );

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

        {hasStructuredRubric ? (
          // ---- (A) 구조화 루브릭 모드 ----
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
                  onChange={(e) => onScoreChange(c.name, Number(e.target.value))}
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
            {totalRow}
          </div>
        ) : (
          // ---- (B) 폴백 모드: 루브릭이 없으면 AI 점수표/직접 입력 ----
          <div className="space-y-2">
            {scores.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                구조화 루브릭이 없습니다. <strong>“AI 채점 실행”</strong>을 누르면 채점 시스템
                프롬프트의 기준으로 영역·점수가 자동 생성됩니다. (또는 회차 설정에서 루브릭을
                작성하거나, 아래에서 영역을 직접 추가하세요.)
              </p>
            ) : (
              <>
                {scores.map((s) => (
                  <div
                    key={s.criterionName}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      {s.criterionName}
                    </span>
                    <input
                      type="number"
                      value={s.score}
                      onChange={(e) =>
                        onScoreChange(s.criterionName, Number(e.target.value))
                      }
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm"
                    />
                  </div>
                ))}
                {totalRow}
              </>
            )}

            {/* 영역 직접 추가 */}
            <div className="flex items-center gap-2 pt-1">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManualRow()}
                placeholder="영역 직접 추가 (예: 사료의 식별과 평가)"
                className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                onClick={addManualRow}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                + 추가
              </button>
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
