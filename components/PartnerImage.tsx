"use client";

import { useState } from "react";

type PartnerImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel: string;
};

/** Client-side image fallback so public Server Components never pass event handlers. */
export function PartnerImage({ src, alt, className, fallbackLabel }: PartnerImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className={`${className ?? ""} partner-image-fallback`} role="img" aria-label={alt}>{fallbackLabel}</span>;
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
