"use client";

/**
 * 답안 뷰어 — 채점 화면(5) 좌측. 페이지 넘김·확대 + OCR 텍스트 표시.
 * pageRefs(Storage 경로)를 다운로드 URL로 변환해 보여준다. 이미지가 없으면(온라인 입력 등)
 * OCR/입력 텍스트만 표시한다.
 */
import { useEffect, useState } from "react";
import { getImageUrl } from "@/lib/storage";

export default function AnswerViewer({
  pageRefs,
  ocrText,
}: {
  pageRefs: string[];
  ocrText?: string;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIdx(0);
    setZoom(1);
    if (pageRefs.length === 0) {
      setUrls([]);
      return;
    }
    setLoading(true);
    Promise.all(pageRefs.map((p) => getImageUrl(p)))
      .then((resolved) => {
        if (active) setUrls(resolved);
      })
      .catch(() => {
        if (active) setUrls([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pageRefs]);

  return (
    <div className="flex h-full flex-col gap-3">
      {pageRefs.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
            >
              ◀
            </button>
            <span className="tabular-nums text-slate-600">
              {urls.length ? idx + 1 : 0} / {pageRefs.length}
            </span>
            <button
              onClick={() => setIdx((i) => Math.min(urls.length - 1, i + 1))}
              disabled={idx >= urls.length - 1}
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
            >
              ▶
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="rounded px-2 py-1 hover:bg-slate-100"
            >
              －
            </button>
            <span className="w-12 text-center tabular-nums text-slate-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="rounded px-2 py-1 hover:bg-slate-100"
            >
              ＋
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-slate-200 p-3">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">이미지 불러오는 중…</p>
        ) : urls.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urls[idx]}
            alt={`${idx + 1}페이지`}
            style={{ width: `${zoom * 100}%` }}
            className="mx-auto rounded bg-white shadow"
          />
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">
            표시할 답안 이미지가 없습니다.
          </p>
        )}
      </div>

      {ocrText !== undefined && (
        <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm" open>
          <summary className="cursor-pointer font-medium text-slate-700">
            OCR / 입력 텍스트
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-slate-600">
            {ocrText || "(텍스트 없음)"}
          </p>
        </details>
      )}
    </div>
  );
}
