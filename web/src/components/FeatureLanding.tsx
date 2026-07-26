"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    const user = readStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    // Don't block the hero on photo loading — text must stay visible.
    void LoveriaCinematicBg.start({ userId: user.id });
  }, [router]);

  return (
    <main className="feature-landing is-ready">
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
