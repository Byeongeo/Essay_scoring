"use client";

import { useState } from "react";
import type { Rubric, RubricCriterion } from "@/lib/types";

/**
 * 루브릭 빌더 (clipo 구조 차용) — 화면 3
 *  - 채점요소(영역) 카드 = [영역명] + [급간(점수+세부기준) 행들]
 *  - "기준 추가"(영역 추가), 카드별 삭제, "급간 추가/제거"(레벨)
 *
 * 1단계 뼈대: 로컬 상태로 추가/삭제 UI만 동작. 저장(Firestore rubric 문서)은 2단계.
 */

function emptyCriterion(): RubricCriterion {
  return {
    name: "",
    levels: [{ label: "상", score: 0, descriptor: "" }],
  };
}

export default function RubricBuilder({
  initial,
  onChange,
}: {
  initial?: Rubric;
  onChange?: (rubric: Rubric) => void;
}) {
  const [criteria, setCriteria] = useState<RubricCriterion[]>(
    initial?.criteria?.length ? initial.criteria : [emptyCriterion()],
  );

  function update(next: RubricCriterion[]) {
    setCriteria(next);
    onChange?.({ criteria: next });
  }

  function addCriterion() {
    update([...criteria, emptyCriterion()]);
  }

  function removeCriterion(i: number) {
    update(criteria.filter((_, idx) => idx !== i));
  }

  function patchCriterion(i: number, patch: Partial<RubricCriterion>) {
    update(criteria.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function addLevel(i: number) {
    const c = criteria[i];
    patchCriterion(i, {
      levels: [...c.levels, { label: "", score: 0, descriptor: "" }],
    });
  }

  function removeLevel(i: number, li: number) {
    const c = criteria[i];
    patchCriterion(i, { levels: c.levels.filter((_, idx) => idx !== li) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          채점요소 {criteria.length}개
        </span>
        <button
          type="button"
          onClick={addCriterion}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          + 기준 추가
        </button>
      </div>

      {criteria.map((c, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center gap-2">
            <input
              value={c.name}
              onChange={(e) => patchCriterion(i, { name: e.target.value })}
              placeholder="채점요소(영역) 이름"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => removeCriterion(i)}
              className="rounded-lg px-2 py-2 text-sm text-red-500 hover:bg-red-50"
              aria-label="영역 삭제"
            >
              삭제
            </button>
          </div>

          <div className="space-y-2">
            {c.levels.map((lv, li) => (
              <div key={li} className="flex items-center gap-2">
                <input
                  value={lv.label}
                  onChange={(e) => {
                    const levels = [...c.levels];
                    levels[li] = { ...lv, label: e.target.value };
                    patchCriterion(i, { levels });
                  }}
                  placeholder="레벨(상/중/하)"
                  className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  value={lv.score}
                  onChange={(e) => {
                    const levels = [...c.levels];
                    levels[li] = { ...lv, score: Number(e.target.value) };
                    patchCriterion(i, { levels });
                  }}
                  placeholder="점수"
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  value={lv.descriptor}
                  onChange={(e) => {
                    const levels = [...c.levels];
                    levels[li] = { ...lv, descriptor: e.target.value };
                    patchCriterion(i, { levels });
                  }}
                  placeholder="세부기준"
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeLevel(i, li)}
                  className="rounded px-2 py-1 text-xs text-slate-400 hover:text-red-500"
                  aria-label="급간 제거"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addLevel(i)}
            className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            + 급간 추가
          </button>
        </div>
      ))}
    </div>
  );
}
