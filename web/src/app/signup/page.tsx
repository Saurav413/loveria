"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resumeSession } from "@/lib/client";

/** Old /signup URL — resume session or send to landing. */
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await resumeSession();
      if (cancelled) return;
      router.replace(session ? session.path : "/");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="page-shell" style={{ maxWidth: 460, paddingTop: "4rem" }}>
      <div className="glass-card">
        <p className="muted" style={{ margin: 0, textAlign: "center" }}>
          Opening Loveria…
        </p>
      </div>
    </main>
  );
}
