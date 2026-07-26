"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readStoredUser } from "@/lib/client";
import { LoveriaCinematicBg } from "@/lib/cinematic-bg";

type Props = {
  title: string;
  eyebrow: string;
  line: string;
  ctaHref: string;
  ctaLabel: string;
};

export function FeatureLanding({ title, eyebrow, line, ctaHref, ctaLabel }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = readStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    LoveriaCinematicBg.start({ userId: user.id }).finally(() => setReady(true));
  }, [router]);

  return (
    <main className={`feature-landing ${ready ? "is-ready" : ""}`}>
      <div className="feature-landing-top">
        <Link className="brand feature-landing-brand" href="/home">
          Loveria
        </Link>
        <Link className="feature-landing-back" href="/home">
          ← Home
        </Link>
      </div>

      <div className="feature-landing-hero">
        <p className="feature-landing-eyebrow">{eyebrow}</p>
        <h1 className="feature-landing-title">{title}</h1>
        <p className="feature-landing-line muted">{line}</p>
        <div className="feature-landing-actions">
          <Link className="btn feature-landing-cta" href={ctaHref}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
