"use client";

import { FeatureLanding } from "@/components/FeatureLanding";

export default function PairingExplorePage() {
  return (
    <FeatureLanding
      eyebrow="Connected"
      title="Pairing"
      line="Link your accounts with a pairing code — or unpair gently when you need a fresh start."
      ctaHref="/pairing"
      ctaLabel="Open Pairing"
    />
  );
}
