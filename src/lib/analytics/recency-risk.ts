const HALF_LIFE_DAYS = 90;

/**
 * Recency Risk — turns "how long since this was last touched?" into a
 * 0–100 score, older = riskier. The underlying idea: a file/repo nobody
 * has committed to in a long time is a bigger handoff risk than one under
 * active development, since active code gets exercised, reviewed, and
 * re-learned by whoever touches it, while stale code quietly bit-rots and
 * its context leaves with whoever last understood it.
 *
 * ─── Why not a straight linear scale? ───────────────────────────────────
 *
 * A naive "risk = days_since_last_commit / some_max_days * 100" has two
 * problems: you have to pick an arbitrary max_days cutoff, and everything
 * past that cutoff clamps to a flat 100 with no further distinction
 * between "stale for a year" and "stale for a decade" (both look identical).
 *
 * Instead we use exponential saturation — the same shape used for
 * radioactive decay or charging a capacitor, just flipped upside down:
 *
 *   risk(days) = 100 × (1 − e^(−days / HALF_LIFE_DAYS))
 *
 * This has three properties that make it a good fit here:
 *   1. Monotonically increasing — more days since last commit never
 *      produces a lower score.
 *   2. Naturally bounded to [0, 100) — approaches 100 as days → ∞, but
 *      never needs manual clamping at the top end (no arbitrary cutoff).
 *   3. Smooth and continuous — a file untouched for 89 vs 91 days scores
 *      almost identically; there's no artificial cliff at a threshold.
 *
 * HALF_LIFE_DAYS controls how fast risk climbs. With HALF_LIFE_DAYS = 90:
 *
 *   days since last commit  |  risk score
 *   -------------------------------------
 *            0              |     0.0
 *           30               |    28.3
 *           90 (1 half-life) |    63.2   <- risk crosses "more stale than not"
 *          180 (2 half-lives)|    86.5
 *          365 (~1 year)     |    98.3
 *         1000                |    100.0 (rounds to 100 at this precision)
 *
 * 90 days was chosen because a typical repo's own recent activity window
 * (recent PRs, active branches) is measured in weeks-to-months — a file
 * with no commits in 3 months has genuinely fallen outside "current work"
 * for most projects, which is the intuitive point for risk to start
 * climbing steeply.
 */
export function calculateRecencyRisk(
  lastActivityDate: string | Date,
  referenceDate: Date = new Date()
): number {
  const lastActivity =
    lastActivityDate instanceof Date
      ? lastActivityDate
      : new Date(lastActivityDate);

  // Can't assess recency without a valid date — treat as "no signal"
  // rather than guessing a risk value out of thin air.
  if (Number.isNaN(lastActivity.getTime())) {
    return 0;
  }

  const millisecondsSinceLastActivity =
    referenceDate.getTime() - lastActivity.getTime();
  const daysSinceLastActivity = millisecondsSinceLastActivity / (1000 * 60 * 60 * 24);

  // A future-dated "last activity" (clock skew, bad data) is treated as
  // "just happened" rather than producing a negative or nonsensical score.
  const days = Math.max(0, daysSinceLastActivity);

  const risk = 100 * (1 - Math.exp(-days / HALF_LIFE_DAYS));

  return Math.round(risk * 10) / 10;
}