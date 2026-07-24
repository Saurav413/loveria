"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Old /signup URL — send people to landing where Google opens directly. */
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="page-shell" style={{ maxWidth: 460, paddingTop: "4rem" }}>
      <div className="glass-card">
        <p className="muted" style={{ margin: 0, textAlign: "center" }}>
          Opening Google sign-in…
        </p>
      </div>
    </main>
  );
}
