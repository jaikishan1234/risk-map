import {
  getRiskLevelFromScore,
  RISK_LEVEL_COLOR,
  RISK_LEVEL_LABEL,
} from "@/utils/risk-level";

interface RiskScoreGaugeProps {
  /** Risk score from 0 (no risk) to 100 (max risk). */
  score: number;
  size?: number;
  className?: string;
}

/**
 * Semicircular gauge showing a 0-100 risk score. Color and label are
 * derived entirely from the score itself via the shared threshold table
 * in utils/risk-level.ts — the same thresholds the composite risk scorer
 * uses — so a gauge and a badge elsewhere in the app will always agree on
 * what counts as "high" vs "critical".
 *
 * Drawn as a single SVG arc using the `pathLength` attribute to normalize
 * the path to exactly 100 units, so `strokeDasharray={score, 100 - score}`
 * directly maps the 0-100 input onto a 0-100% fill — no manual arc-length
 * math needed.
 */
export function RiskScoreGauge({
  score,
  size = 200,
  className,
}: RiskScoreGaugeProps) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score * 10) / 10));
  const riskLevel = getRiskLevelFromScore(clampedScore);
  const color = RISK_LEVEL_COLOR[riskLevel];
  const label = RISK_LEVEL_LABEL[riskLevel];

  const viewBoxWidth = 200;
  const viewBoxHeight = 116;
  const cx = 100;
  const cy = 100;
  const radius = 80;
  const strokeWidth = 16;
  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <div
      className={["flex flex-col items-center", className].filter(Boolean).join(" ")}
      style={{ width: size }}
      role="img"
      aria-label={`Risk score ${clampedScore} out of 100, ${label}`}
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        width={size}
        height={(size * viewBoxHeight) / viewBoxWidth}
        aria-hidden="true"
      >
        {/* Background track */}
        <path
          d={arcPath}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={100}
        />
        {/* Filled portion representing the score */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${clampedScore} ${100 - clampedScore}`}
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          className="fill-foreground font-mono text-[36px] font-semibold"
        >
          {clampedScore}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-muted-foreground font-mono text-[11px]"
        >
          / 100
        </text>
      </svg>
      <span
        className="-mt-2 rounded-full px-3 py-1 font-mono text-xs font-medium"
        style={{ color, backgroundColor: `color-mix(in oklch, ${color}, transparent 88%)` }}
      >
        {label}
      </span>
    </div>
  );
}