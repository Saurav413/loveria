"use client";

import { FeatureLanding } from "@/components/FeatureLanding";

export default function DrawingExplorePage() {
  return (
    <FeatureLanding
      eyebrow="Side by side"
      title="Live Drawing"
      line="Sketch together on one shared canvas — lines that meet even when you are apart."
      ctaHref="/drawing"
      ctaLabel="Open Live Drawing"
    />
  );
}
