"use client";

/**
 * 교사 로그인 (Google) — 화면 1
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, loading, configured, signIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/subjects");
  }, [user, router]);

  async function handleSignIn() {
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인에 실패했습니다.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">교사 로그인</h1>
      <p className="text-center text-sm text-slate-600">
        Google 계정으로 로그인합니다.
        <br />
        (학생은 회차별 접속코드로 들어옵니다)
      </p>

      <button
        type="button"
        onClick={handleSignIn}
        disabled={!configured || loading}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "확인 중…" : "Google로 로그인"}
      </button>

      {!configured && (
        <p className="text-center text-xs text-amber-600">
          Firebase 환경변수가 아직 설정되지 않았습니다. (README 3단계)
        </p>
      )}
      {error && <p className="text-center text-xs text-red-500">{error}</p>}
    </main>
  );
}
