"use client";

import { FeatureLanding } from "@/components/FeatureLanding";

export default function RemindersExplorePage() {
  return (
    <FeatureLanding
      eyebrow="Together"
      title="Reminders"
      line="Save the dates and little notes that matter to both of you — anniversaries, plans, and quiet promises."
      ctaHref="/reminders"
      ctaLabel="Open Reminders"
    />
  );
}
