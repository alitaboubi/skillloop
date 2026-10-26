/*
 * Founder portrait card — adapted from "Team Reveal Grid" (src/components/ui/team-reveal-grid.tsx) by VengeanceUI,
 * https://github.com/Ashutoshx7/VengeanceUI, used under the MIT License:
 *
 *   MIT License
 *
 *   Copyright (c) 2025-2026 Ashutoshx7
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *   SOFTWARE.
 *
 * Changes for SkillLoop: one portrait instead of a grid, no auto-cycling, SkillLoop tokens (ink/lime/clay), motion by
 * opacity/transform only (the grayscale rest state is a static grayscale copy faded out, not an animated filter; no
 * height animation), name and role always visible below the photo, the note toggled by a real button (touch and
 * keyboard) and also shown on hover/focus with a fine pointer. No hover device or reduced motion: full colour, no movement.
 */
import { useId, useState } from "react";

type Props = {
  jpg: string;
  webp: string;
  width: number;
  height: number;
  alt: string;
  name: string;
  role: string;
  quote: string;
  revealLabel: string;
};

function Photo({ jpg, webp, width, height, alt, className }: Pick<Props, "jpg" | "webp" | "width" | "height" | "alt"> & { className: string }) {
  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      <img src={jpg} alt={alt} width={width} height={height} decoding="async" draggable={false} className={className} />
    </picture>
  );
}

export function FounderCard({ jpg, webp, width, height, alt, name, role, quote, revealLabel }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  // 280 px wide = exactly 2 image pixels per CSS pixel from the 560 px file: crisp on high-density screens.
  return (
    <figure className="founder-card mx-auto w-full max-w-[17.5rem]">
      <div className="founder-frame" data-open={open || undefined}>
        <Photo jpg={jpg} webp={webp} width={width} height={height} alt={alt} className="founder-img" />
        {/* Same file, shown grayscale at rest on hover-capable screens; fades out on reveal (opacity only). */}
        <span aria-hidden className="founder-gray"><Photo jpg={jpg} webp={webp} width={width} height={height} alt="" className="founder-img" /></span>
        <span aria-hidden className="founder-glow" />
        <span aria-hidden className="founder-shade" />
        <span aria-hidden className="founder-ring" />
        <p id={`${id}-note`} dir="auto" className="founder-quote">{quote}</p>
        <button type="button" className="founder-toggle" aria-expanded={open} aria-controls={`${id}-note`} aria-label={revealLabel} onClick={() => setOpen((o) => !o)} />
      </div>
      <figcaption className="mt-4 text-center">
        <span className="relative inline-block text-lg font-bold">
          <span dir="ltr">{name}</span>
          <svg aria-hidden viewBox="0 0 200 14" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -bottom-1.5 h-2.5 w-full rtl:-scale-x-100">
            <path d="M2 9 C 40 2, 70 13, 104 7 S 168 3, 198 8" pathLength={1} fill="none" strokeWidth="3" strokeLinecap="round" className="loop-draw stroke-lime" />
          </svg>
        </span>
        <span className="mt-1.5 block text-sm font-semibold text-clay-strong">{role}</span>
      </figcaption>
    </figure>
  );
}
