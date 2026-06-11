"use client";

/**
 * 채점 예시문 편집기 — 회차 설정(화면 3)
 * 만점/3점 등 예시 답안 + 점수 + 이유. 채점 프롬프트의 few-shot 으로 쓰인다. (6번 c)
 */
import type { ScoringExample } from "@/lib/types";

export default function ExamplesEditor({
  examples,
  onChange,
}: {
  examples: ScoringExample[];
  onChange: (next: ScoringExample[]) => void;
}) {
  function add() {
    onChange([...examples, { score: 0, text: "", reason: "" }]);
  }
  function remove(i: number) {
    onChange(examples.filter((_, idx) => idx !== i));
  }
  function patch(i: number, p: Partial<ScoringExample>) {
    onChange(examples.map((e, idx) => (idx === i ? { ...e, ...p } : e)));
  }

  return (
    <div className="space-y-3">
      {examples.length === 0 && (
        <p className="text-sm text-slate-400">
          예시문이 없습니다. (선택) 만점·부분점수 예시를 추가하면 채점 일관성이 올라갑니다.
        </p>
      )}

      {examples.map((ex, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            <input
              type="number"
              value={ex.score}
              onChange={(e) => patch(i, { score: Number(e.target.value) })}
              placeholder="점수"
              className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <span className="text-sm text-slate-500">점 예시</span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="ml-auto rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
            >
              삭제
            </button>
          </div>
          <textarea
            value={ex.text}
            onChange={(e) => patch(i, { text: e.target.value })}
            placeholder="예시 답안 본문"
            rows={2}
            className="mb-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <textarea
            value={ex.reason}
            onChange={(e) => patch(i, { reason: e.target.value })}
            placeholder="이 점수를 준 이유"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        + 예시문 추가
      </button>
    </div>
  );
}
