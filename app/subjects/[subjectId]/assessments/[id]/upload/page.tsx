"use client";

/**
 * PDF 업로드 → 학생 분류 확인 → OCR → 제출물 저장 — 화면 4 (3단계 파이프라인)
 *
 * 흐름:
 *   1) 스캔 PDF 선택 → 페이지별 JPEG 렌더링 (pdfjs, 클라이언트)
 *   2) 각 페이지 머리글 추출 (/api/classify) → 머리글 있는 페이지 = 새 학생 시작 (2번 규칙)
 *   3) 교사가 분류 경계·학생 정보(학년/반/번호/이름/이메일) 확인·수정
 *   4) 학생별로 페이지 이미지 Storage 업로드 + OCR(/api/ocr) → submission 문서 생성
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { classifyPage, ocrPages } from "@/lib/api";
import { createSubmission } from "@/lib/db";
import { dataUrlToBase64, renderPdfToImages, type RenderedPage } from "@/lib/pdf";
import { uploadPageImage } from "@/lib/storage";
import type { HeaderExtraction, Submission } from "@/lib/types";

type Step = "select" | "processing" | "review" | "saving" | "done";

interface GroupHeader {
  grade: string;
  classNo: string;
  studentNo: string;
  name: string;
  email: string;
}

function prefill(h?: HeaderExtraction): GroupHeader {
  return {
    grade: h?.grade != null ? String(h.grade) : "",
    classNo: h?.classNo != null ? String(h.classNo) : "",
    studentNo: h?.studentNo != null ? String(h.studentNo) : "",
    name: h?.name ?? "",
    email: "",
  };
}

interface Group {
  startIndex: number;
  pageIndexes: number[];
}

function deriveGroups(starts: boolean[]): Group[] {
  const groups: Group[] = [];
  starts.forEach((isStart, i) => {
    if (isStart || groups.length === 0) {
      groups.push({ startIndex: i, pageIndexes: [i] });
    } else {
      groups[groups.length - 1].pageIndexes.push(i);
    }
  });
  return groups;
}

function UploadContent({ subjectId, id }: { subjectId: string; id: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [headers, setHeaders] = useState<HeaderExtraction[]>([]);
  const [starts, setStarts] = useState<boolean[]>([]);
  const [groupInfo, setGroupInfo] = useState<Record<number, GroupHeader>>({});
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const groups = deriveGroups(starts);

  function infoFor(startIndex: number): GroupHeader {
    return groupInfo[startIndex] ?? prefill(headers[startIndex]);
  }

  function setInfo(startIndex: number, patch: Partial<GroupHeader>) {
    setGroupInfo((prev) => ({
      ...prev,
      [startIndex]: { ...infoFor(startIndex), ...patch },
    }));
  }

  function toggleStart(i: number) {
    if (i === 0) return; // 첫 페이지는 항상 학생 시작
    setStarts((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  async function handleFile(file: File) {
    setError(null);
    setStep("processing");
    try {
      setProgress("PDF 페이지를 이미지로 변환 중…");
      const rendered = await renderPdfToImages(file);
      setPages(rendered);

      const hs: HeaderExtraction[] = [];
      for (let i = 0; i < rendered.length; i++) {
        setProgress(`머리글 분석 중… (${i + 1}/${rendered.length} 페이지)`);
        try {
          const h = await classifyPage(dataUrlToBase64(rendered[i].dataUrl));
          hs.push(h);
        } catch {
          hs.push({ hasHeader: false });
        }
      }
      setHeaders(hs);
      const initStarts = hs.map((h, i) => i === 0 || h.hasHeader);
      setStarts(initStarts);
      const info: Record<number, GroupHeader> = {};
      initStarts.forEach((isStart, i) => {
        if (isStart) info[i] = prefill(hs[i]);
      });
      setGroupInfo(info);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 처리에 실패했습니다.");
      setStep("select");
    }
  }

  async function handleSave() {
    setStep("saving");
    setError(null);
    let saved = 0;
    try {
      for (let g = 0; g < groups.length; g++) {
        const group = groups[g];
        const info = infoFor(group.startIndex);
        setProgress(`학생 ${g + 1}/${groups.length} 업로드·OCR 중…`);

        const folder = `subjects/${subjectId}/assessments/${id}/${crypto.randomUUID()}`;
        const ocrInput: Array<{ base64: string; mimeType: string; pageRef: string }> = [];
        const pageImageRefs: string[] = [];

        for (const pi of group.pageIndexes) {
          const page = pages[pi];
          const pageRef = `${folder}/page-${page.pageNumber}.jpg`;
          await uploadPageImage(pageRef, page.dataUrl);
          pageImageRefs.push(pageRef);
          ocrInput.push({
            base64: dataUrlToBase64(page.dataUrl),
            mimeType: "image/jpeg",
            pageRef,
          });
        }

        let ocrText = "";
        let maskedTokens: Submission["maskedTokens"] = [];
        try {
          const ocr = await ocrPages(ocrInput);
          ocrText = ocr.ocrText;
          maskedTokens = ocr.maskedTokens;
        } catch {
          // OCR 실패해도 제출물은 저장(나중에 채점 화면에서 재시도/수기 가능)
        }

        const submission: Submission = {
          grade: Number(info.grade) || 0,
          classNo: Number(info.classNo) || 0,
          studentNo: Number(info.studentNo) || 0,
          name: info.name.trim(),
          email: info.email.trim(),
          pageImageRefs,
          ocrText,
          maskedTokens,
          scores: [],
          totalScore: 0,
          aiReason: "",
          aiFeedback: "",
          teacherFeedback: "",
          emailStatus: "none",
        };
        await createSubmission(subjectId, id, submission);
        saved += 1;
        setSavedCount(saved);
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
      setStep("review");
    }
  }

  // ---- 렌더 ----
  if (step === "select") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Header subjectId={subjectId} id={id} />
        <label className="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center hover:border-brand-500">
          <p className="text-slate-600">스캔 PDF(한 반 분량)를 선택하세요.</p>
          <p className="mt-1 text-xs text-slate-400">
            페이지 머리글(학년/반/번호/이름)을 기준으로 학생을 자동 분류합니다.
          </p>
          <span className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
            파일 선택
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </main>
    );
  }

  if (step === "processing" || step === "saving") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Header subjectId={subjectId} id={id} />
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm text-slate-600">{progress}</p>
          {step === "saving" && (
            <p className="mt-1 text-xs text-slate-400">{savedCount}명 저장 완료</p>
          )}
        </div>
      </main>
    );
  }

  if (step === "done") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Header subjectId={subjectId} id={id} />
        <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-10 text-center">
          <p className="font-semibold text-green-700">
            {savedCount}명의 답안을 저장했습니다.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href={`/subjects/${subjectId}/assessments/${id}/grade`}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              채점하러 가기 →
            </Link>
            <button
              onClick={() => {
                setStep("select");
                setPages([]);
                setHeaders([]);
                setStarts([]);
                setGroupInfo({});
                setSavedCount(0);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              다른 PDF 올리기
            </button>
          </div>
        </div>
      </main>
    );
  }

  // step === "review"
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Header subjectId={subjectId} id={id} />
      <div className="mb-4 mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          총 {pages.length}페이지 · <strong>{groups.length}</strong>명으로 분류됨
        </p>
        <button
          onClick={() => void handleSave()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          확정 · 저장 ({groups.length}명)
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        머리글이 잘못 인식되면 “새 학생 시작” 체크로 경계를 직접 조정하세요. 자동 인식은 부정확할 수 있습니다.
      </p>

      <div className="space-y-5">
        {groups.map((group, gi) => {
          const info = infoFor(group.startIndex);
          return (
            <div
              key={group.startIndex}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 text-sm font-semibold text-slate-500">
                학생 {gi + 1} · {group.pageIndexes.length}페이지
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <input
                  value={info.grade}
                  onChange={(e) => setInfo(group.startIndex, { grade: e.target.value })}
                  placeholder="학년"
                  inputMode="numeric"
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  value={info.classNo}
                  onChange={(e) => setInfo(group.startIndex, { classNo: e.target.value })}
                  placeholder="반"
                  inputMode="numeric"
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  value={info.studentNo}
                  onChange={(e) => setInfo(group.startIndex, { studentNo: e.target.value })}
                  placeholder="번호"
                  inputMode="numeric"
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  value={info.name}
                  onChange={(e) => setInfo(group.startIndex, { name: e.target.value })}
                  placeholder="이름"
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  value={info.email}
                  onChange={(e) => setInfo(group.startIndex, { email: e.target.value })}
                  placeholder="이메일(선택)"
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {group.pageIndexes.map((pi) => (
                  <div key={pi} className="w-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pages[pi].dataUrl}
                      alt={`${pi + 1}페이지`}
                      className="h-36 w-28 rounded border border-slate-200 object-cover"
                    />
                    <label className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={starts[pi]}
                        disabled={pi === 0}
                        onChange={() => toggleStart(pi)}
                      />
                      새 학생 시작
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Header({ subjectId, id }: { subjectId: string; id: string }) {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">스캔 PDF 업로드 · 학생 분류</h1>
      <Link
        href={`/subjects/${subjectId}/assessments`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← 회차 목록
      </Link>
    </header>
  );
}

export default function UploadPage({
  params,
}: {
  params: { subjectId: string; id: string };
}) {
  return (
    <AuthGate>
      <UploadContent subjectId={params.subjectId} id={params.id} />
    </AuthGate>
  );
}
