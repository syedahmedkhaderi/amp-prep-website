/**
 * The AMP Prep mark and wordmark.
 *
 * An "A" whose apex is a parabolic vertex rather than a point: the letter stays
 * unmistakable at favicon size while the curved top carries the subject. Drawn
 * as inline SVG with no external asset, which the site's Content Security
 * Policy requires and which also means the header never waits on a network
 * request to render.
 *
 * The geometry exists in four places, because none of the others can import a
 * React component: here, app/icon.svg, app/apple-icon.tsx and
 * app/opengraph-image.tsx. Change the path in one and change it in all four.
 *
 * The two ImageResponse copies (apple-icon, opengraph-image) deliberately write
 * the crossbar as `L21.5 19` rather than `H21.5`: Satori, which rasterises
 * them, does not implement the shorthand horizontal command and silently drops
 * the path, producing an A with no bar. Do not "tidy" those back to H.
 */

export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6.5 26 L12.8 10.5 Q16 4.8 19.2 10.5 L25.5 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M10.5 19 H21.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Mark in its brand tile, as used in the header and anywhere the logo appears
 * against the page background rather than against brand colour.
 */
export function LogoTile({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-deep text-white"
      style={{ width: size, height: size }}
    >
      <LogoMark size={Math.round(size * 0.7)} />
    </span>
  );
}

/**
 * Full lockup: tile plus wordmark. `AMP` carries the weight, `Prep` recedes,
 * so the eye lands on the thing people search for.
 */
export function Logo({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoTile size={size} />
      <span className="text-lg font-bold tracking-tight text-brand-deep">
        AMP<span className="font-medium text-ink-soft"> Prep</span>
      </span>
    </span>
  );
}
