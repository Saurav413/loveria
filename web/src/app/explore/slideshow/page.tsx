"use client";

import { FeatureLanding } from "@/components/FeatureLanding";

export default function SlideshowExplorePage() {
  return (
    <FeatureLanding
      eyebrow="Your story"
      title="Shared Slideshow"
      line="Upload photos that become your cinematic backgrounds — memories that move with you."
      ctaHref="/slideshow"
      ctaLabel="Open Slideshow"
    />
  );
}
