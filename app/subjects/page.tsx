"use client";

/**
 * 과목 선택 — 화면 1 (Firestore 연동)
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/lib/auth";
import { createSubject, deleteSubject, listSubjects } from "@/lib/db";
import type { SubjectWithId } from "@/lib/types";

function SubjectsContent() {
  const { user, logout } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setSubjects(await listSubjects(user.uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : "과목을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createSubject(user.uid, name.trim());
      setName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "과목 추가에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 과목을 삭제할까요? (하위 회차는 그대로 남습니다)")) return;
    await deleteSubject(id);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">과목 선택</h1>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="hidden sm:inline">{user?.email}</span>
          <button onClick={() => void logout()} className="hover:text-slate-800">
            로그아웃
          </button>
        </div>
      </header>

      <form onSubmit={handleAdd} className="mb-8 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 과목명 (국어/영어/수학…)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          + 과목 추가
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">불러오는 중…</p>
      ) : subjects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          아직 과목이 없습니다. 위에서 첫 과목을 추가하세요.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <li key={s.id} className="group relative">
              <Link
                href={`/subjects/${s.id}/assessments`}
                className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow"
              >
                <span className="text-lg font-semibold">{s.name}</span>
                <p className="mt-1 text-sm text-slate-500">회차 보기 →</p>
              </Link>
              <button
                onClick={() => void handleDelete(s.id)}
                className="absolute right-3 top-3 text-xs text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                aria-label="과목 삭제"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function SubjectsPage() {
  return (
    <AuthGate>
      <SubjectsContent />
    </AuthGate>
  );
}
