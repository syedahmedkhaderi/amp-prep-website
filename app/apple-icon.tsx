import { ImageResponse } from "next/og";

/**
 * Home-screen icon for iOS.
 *
 * Generated as a PNG rather than shipped as app/apple-icon.svg: Next's file
 * convention only picks up raster formats for apple-icon, so an SVG is silently
 * ignored and no apple-touch-icon link is emitted at all.
 *
 * No rounding or padding — iOS applies its own mask and margin.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A2C6B",
        }}
      >
        <svg viewBox="0 0 32 32" width={128} height={128}>
          <path
            d="M6.5 26 L12.8 10.5 Q16 4.8 19.2 10.5 L25.5 26"
            fill="none"
            stroke="white"
            strokeWidth="2.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Explicit lineto, not H: Satori drops the shorthand command. */}
          <path
            d="M10.5 19 L21.5 19"
            fill="none"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    size
  );
}
