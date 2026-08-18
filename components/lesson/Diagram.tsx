import type { DiagramSpec } from "@/lib/math/plot";

/**
 * Labelled geometry figures for the mensuration objectives: area, perimeter,
 * volume, surface area, the Pythagorean theorem and similar triangles.
 *
 * These are illustrations rather than scale drawings. The measurement lives in
 * the label, so a 3-4-5 triangle is drawn in whatever proportions read most
 * clearly. Drawing to scale would make a 1-by-40 rectangle unreadable and gains
 * nothing: the student works from the numbers, not from a ruler.
 */

const STROKE = "stroke-brand-deep";
const FILL = "fill-brand-600/10";
const LABEL = "fill-ink text-xs";

function Label({ x, y, children, anchor = "middle" }: { x: number; y: number; children: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} className={LABEL} fontSize={13} textAnchor={anchor}>
      {children}
    </text>
  );
}

function Frame({ description, children, width = 320, height = 240 }: { description: string; children: React.ReactNode; width?: number; height?: number }) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-sm h-auto" role="img" aria-label={description}>
      <title>{description}</title>
      {children}
    </svg>
  );
}

export function Diagram({ spec }: { spec: DiagramSpec }) {
  switch (spec.kind) {
    case "triangle": {
      // A right triangle when one is asked for, otherwise a clearly scalene
      // shape so no side looks accidentally equal to another.
      const right = spec.rightAngleAt !== undefined;
      const pts = right ? "40,190 260,190 40,50" : "40,190 260,190 150,50";
      const [a, b, c] = spec.sides ?? [];
      const [angA, angB, angC] = spec.angles ?? [];
      return (
        <Frame description={spec.description}>
          <polygon points={pts} className={`${FILL} ${STROKE}`} strokeWidth={2} />
          {right && <path d="M 40 172 L 58 172 L 58 190" className="fill-none stroke-ink-light" strokeWidth={1.5} />}
          {a && <Label x={150} y={210}>{a}</Label>}
          {b && <Label x={right ? 22 : 85} y={120} anchor="end">{b}</Label>}
          {c && <Label x={right ? 165 : 215} y={110} anchor="start">{c}</Label>}
          {angA && <Label x={62} y={182}>{angA}</Label>}
          {angB && <Label x={238} y={182}>{angB}</Label>}
          {angC && <Label x={right ? 56 : 150} y={72}>{angC}</Label>}
        </Frame>
      );
    }

    case "rectangle":
      return (
        <Frame description={spec.description}>
          <rect x={50} y={60} width={220} height={130} className={`${FILL} ${STROKE}`} strokeWidth={2} />
          {spec.width && <Label x={160} y={210}>{spec.width}</Label>}
          {spec.height && <Label x={36} y={130} anchor="end">{spec.height}</Label>}
        </Frame>
      );

    case "square":
      return (
        <Frame description={spec.description}>
          <rect x={85} y={50} width={150} height={150} className={`${FILL} ${STROKE}`} strokeWidth={2} />
          {spec.side && <Label x={160} y={220}>{spec.side}</Label>}
        </Frame>
      );

    case "circle":
      return (
        <Frame description={spec.description}>
          <circle cx={160} cy={120} r={85} className={`${FILL} ${STROKE}`} strokeWidth={2} />
          <circle cx={160} cy={120} r={3} className="fill-ink" />
          {spec.radius && (
            <>
              <line x1={160} y1={120} x2={245} y2={120} className="stroke-quiz-action" strokeWidth={1.5} />
              <Label x={200} y={112}>{spec.radius}</Label>
            </>
          )}
          {spec.diameter && !spec.radius && (
            <>
              <line x1={75} y1={120} x2={245} y2={120} className="stroke-quiz-action" strokeWidth={1.5} />
              <Label x={160} y={112}>{spec.diameter}</Label>
            </>
          )}
        </Frame>
      );

    case "trapezoid":
      return (
        <Frame description={spec.description}>
          <polygon points="90,60 230,60 270,190 50,190" className={`${FILL} ${STROKE}`} strokeWidth={2} />
          {spec.top && <Label x={160} y={50}>{spec.top}</Label>}
          {spec.bottom && <Label x={160} y={210}>{spec.bottom}</Label>}
          {spec.height && (
            <>
              <line x1={160} y1={60} x2={160} y2={190} className="stroke-quiz-action" strokeWidth={1.5} strokeDasharray="4 3" />
              <Label x={170} y={130} anchor="start">{spec.height}</Label>
            </>
          )}
        </Frame>
      );

    case "cylinder":
      return (
        <Frame description={spec.description}>
          <ellipse cx={160} cy={65} rx={70} ry={22} className={`${FILL} ${STROKE}`} strokeWidth={2} />
          <line x1={90} y1={65} x2={90} y2={185} className={STROKE} strokeWidth={2} />
          <line x1={230} y1={65} x2={230} y2={185} className={STROKE} strokeWidth={2} />
          <path d="M 90 185 A 70 22 0 0 0 230 185" className={`fill-none ${STROKE}`} strokeWidth={2} />
          {spec.radius && (
            <>
              <line x1={160} y1={65} x2={230} y2={65} className="stroke-quiz-action" strokeWidth={1.5} />
              <Label x={196} y={58}>{spec.radius}</Label>
            </>
          )}
          {spec.height && (
            <>
              <line x1={250} y1={65} x2={250} y2={185} className="stroke-quiz-action" strokeWidth={1.5} />
              <Label x={258} y={130} anchor="start">{spec.height}</Label>
            </>
          )}
        </Frame>
      );

    case "cone":
      return (
        <Frame description={spec.description}>
          <ellipse cx={160} cy={180} rx={70} ry={20} className={`${FILL} ${STROKE}`} strokeWidth={2} />
          <line x1={90} y1={180} x2={160} y2={50} className={STROKE} strokeWidth={2} />
          <line x1={230} y1={180} x2={160} y2={50} className={STROKE} strokeWidth={2} />
          {spec.height && (
            <>
              <line x1={160} y1={50} x2={160} y2={180} className="stroke-quiz-action" strokeWidth={1.5} strokeDasharray="4 3" />
              <Label x={170} y={120} anchor="start">{spec.height}</Label>
            </>
          )}
          {spec.radius && (
            <>
              <line x1={160} y1={180} x2={230} y2={180} className="stroke-quiz-action" strokeWidth={1.5} />
              <Label x={196} y={198}>{spec.radius}</Label>
            </>
          )}
          {spec.slant && <Label x={210} y={110} anchor="start">{spec.slant}</Label>}
        </Frame>
      );

    case "sphere":
      return (
        <Frame description={spec.description}>
          <circle cx={160} cy={120} r={80} className={`${FILL} ${STROKE}`} strokeWidth={2} />
          <ellipse cx={160} cy={120} rx={80} ry={24} className={`fill-none ${STROKE}`} strokeWidth={1} strokeDasharray="4 3" />
          {spec.radius && (
            <>
              <line x1={160} y1={120} x2={240} y2={120} className="stroke-quiz-action" strokeWidth={1.5} />
              <Label x={200} y={112}>{spec.radius}</Label>
            </>
          )}
        </Frame>
      );

    case "prism":
      return (
        <Frame description={spec.description}>
          <rect x={60} y={80} width={170} height={110} className={`${FILL} ${STROKE}`} strokeWidth={2} />
          <polygon points="60,80 105,45 275,45 230,80" className={`${FILL} ${STROKE}`} strokeWidth={2} />
          <polygon points="230,80 275,45 275,155 230,190" className={`${FILL} ${STROKE}`} strokeWidth={2} />
          {spec.width && <Label x={145} y={210}>{spec.width}</Label>}
          {spec.height && <Label x={46} y={140} anchor="end">{spec.height}</Label>}
          {spec.depth && <Label x={262} y={70} anchor="start">{spec.depth}</Label>}
        </Frame>
      );
  }
}
