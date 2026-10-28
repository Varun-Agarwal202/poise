export interface ScoreFrequency {
  score: number;
  amount: number;
}

export interface ModeledScores {
  betterThan: number;
  bins: number[];
  samples: number;
  bandwidth: number;
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/** Fast normal CDF approximation, accurate enough for percentile display. */
function normalCdf(z: number) {
  const sign = z < 0 ? -1 : 1,
    x = Math.abs(z) / Math.SQRT2,
    t = 1 / (1 + 0.3275911 * x),
    erf =
      1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
        t +
        0.254829592) *
        t *
        Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

/**
 * Builds a bounded Gaussian kernel model from real score frequencies.
 * The kernels interpolate missing scores; boundary normalization anchors
 * the model at 0 and 500 without inventing fake observations.
 */
export function modelScoreDistribution(
  input: ScoreFrequency[],
  target: number,
): ModeledScores {
  const rows = input
      .map((row) => ({
        score: clamp(Number(row.score), 0, 500),
        amount: Math.max(0, Math.round(Number(row.amount))),
      }))
      .filter((row) => Number.isFinite(row.score) && row.amount > 0),
    samples = rows.reduce((sum, row) => sum + row.amount, 0);

  if (!samples)
    return {
      betterThan: 50,
      bins: Array(20).fill(0) as number[],
      samples: 0,
      bandwidth: 35,
    };

  const mean =
      rows.reduce((sum, row) => sum + row.score * row.amount, 0) / samples,
    variance =
      rows.reduce(
        (sum, row) => sum + Math.pow(row.score - mean, 2) * row.amount,
        0,
      ) / Math.max(1, samples - 1),
    spread = Math.sqrt(variance),
    bandwidth = clamp(
      1.06 * Math.max(spread, 24) * Math.pow(samples, -0.2),
      14,
      55,
    ),
    rawCdf = (score: number) =>
      rows.reduce(
        (sum, row) =>
          sum + normalCdf((score - row.score) / bandwidth) * row.amount,
        0,
      ) / samples,
    atZero = rawCdf(0),
    range = Math.max(1e-8, rawCdf(500) - atZero),
    boundedCdf = (score: number) =>
      clamp((rawCdf(clamp(score, 0, 500)) - atZero) / range, 0, 1),
    percentile = boundedCdf(target),
    betterThan = clamp(Math.ceil(percentile * 100), 1, 99),
    bins = Array.from({ length: 20 }, (_, i) =>
      Math.max(
        0,
        Math.round((boundedCdf((i + 1) * 25) - boundedCdf(i * 25)) * samples),
      ),
    );

  return { betterThan, bins, samples, bandwidth };
}
