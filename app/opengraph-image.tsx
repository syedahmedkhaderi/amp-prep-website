import { ImageResponse } from "next/og";

/**
 * The card shown when the site is shared on social or in a chat. Without it,
 * links render as a bare URL, which is one of the fastest ways a site reads as
 * unfinished.
 *
 * Uses only system-default fonts and inline SVG so nothing is fetched at render
 * time. Requires metadataBase in app/layout.tsx to resolve to an absolute URL.
 */

export const alt = "AMP Prep: practice for the UDST AMP 1 and AMP 2 placement tests";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0A2C6B 0%, #0D52B4 100%)",
          padding: 72,
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg viewBox="0 0 32 32" width={88} height={88}>
            <path
              d="M6.5 26 L12.8 10.5 Q16 4.8 19.2 10.5 L25.5 26"
              fill="none"
              stroke="white"
              strokeWidth="2.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Written as an explicit lineto: Satori, which rasterises this
                card, does not support the shorthand horizontal H command and
                silently drops the crossbar, leaving the A without its bar. */}
            <path
              d="M10.5 19 L21.5 19"
              fill="none"
              stroke="white"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, letterSpacing: -1 }}>
            AMP Prep
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Practice for the UDST maths placement tests
          </div>
          <div style={{ display: "flex", fontSize: 32, opacity: 0.85, maxWidth: 900 }}>
            Original questions, full worked solutions, and timed mock exams for
            AMP 1 and AMP 2.
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, fontSize: 26, opacity: 0.75 }}>
          <div style={{ display: "flex" }}>3,700+ questions</div>
          <div style={{ display: "flex" }}>32 topics</div>
          <div style={{ display: "flex" }}>Timed mocks</div>
        </div>
      </div>
    ),
    size
  );
}
