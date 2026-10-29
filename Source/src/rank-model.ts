export interface ScoreFrequency {
  score: number;
  amount: number;
}

export interface ModeledScores {
  betterThan: number;
  bins: number[];
  samples: number;
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/** Prior belief about a typical score, used until real data outweighs it. */
export const PRIOR_MEAN = 350;
export const PRIOR_SPREAD = 70;
/** How many real scores it takes for the data to count as much as the prior. */
const PRIOR_WEIGHT = 10;
/** Real scores needed before the data and the fitted bell count equally. */
const DATA_WEIGHT = 300;
/** The chart leans on the bell longer than the rank does, so it stays a smooth hill. */
const SHAPE_WEIGHT = 1500;
/** Blur applied to real counts before they shape the chart. */
const SHAPE_BLUR = 30;
const BIN_TOTAL = 1000;

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error under 1.5e-7). */
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
 * Fits a bell curve to the score frequencies. The mean and spread are pulled
 * toward a prior while the sample is small, so a handful of scores still gives
 * a stable distribution that fills the gaps between them. The fitted bell is
 * then blended with the real counts by sample size: mostly bell when data is
 * sparse, mostly real as it accumulates. Rank and chart share this model.
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
    samples = rows.reduce((sum, row) => sum + row.amount, 0),
    mean = samples
      ? rows.reduce((sum, row) => sum + row.score * row.amount, 0) / samples
      : PRIOR_MEAN,
    scatter = rows.reduce(
      (sum, row) => sum + Math.pow(row.score - mean, 2) * row.amount,
      0,
    ),
    mu =
      (PRIOR_WEIGHT * PRIOR_MEAN + samples * mean) / (PRIOR_WEIGHT + samples),
    drift = Math.pow(mean - PRIOR_MEAN, 2),
    sigma = Math.max(
      20,
      Math.sqrt(
        (PRIOR_WEIGHT * (PRIOR_SPREAD * PRIOR_SPREAD + drift) + scatter) /
          (PRIOR_WEIGHT + samples),
      ),
    ),
    weight = samples / (samples + DATA_WEIGHT),
    score = clamp(Number(target), 0, 500),
    // Scores cannot leave 0..500, so the bell's tails pile up at the ends
    // (censored) instead of being cut off, which keeps the top ranks honest.
    bell = (x: number) => normalCdf((clamp(x, 0, 500) - mu) / sigma),
    below = rows.reduce(
      (sum, row) => sum + (row.score < score ? row.amount : 0),
      0,
    ),
    tied = rows.reduce(
      (sum, row) => sum + (row.score === score ? row.amount : 0),
      0,
    ),
    observed = samples ? (below + tied / 2) / samples : 0,
    percentile = weight * observed + (1 - weight) * bell(score),
    betterThan = clamp(Math.round(percentile * 100), 1, 99),
    span = Math.max(1e-12, bell(500) - bell(0)),
    shapeWeight = samples / (samples + SHAPE_WEIGHT),
    // Each real score spreads over neighbouring bins, so the observed shape
    // is a blurred histogram rather than a handful of spikes.
    blurred = Array.from({ length: 20 }, (_, i) =>
      samples
        ? rows.reduce(
            (sum, row) =>
              sum +
              row.amount *
                (normalCdf(((i + 1) * 25 - row.score) / SHAPE_BLUR) -
                  normalCdf((i * 25 - row.score) / SHAPE_BLUR)),
            0,
          ) / samples
        : 0,
    ),
    blurTotal = blurred.reduce((sum, v) => sum + v, 0) || 1,
    bins = blurred.map((value, i) =>
      Math.round(
        BIN_TOTAL *
          (shapeWeight * (value / blurTotal) +
            (1 - shapeWeight) * ((bell((i + 1) * 25) - bell(i * 25)) / span)),
      ),
    );
  return { betterThan, bins, samples };
}

export const CURVE_POINTS = 101;

/**
 * Display-only bell curve: the 20 exact score bins blurred into a continuous
 * density sampled every 5 points from 0 to 500, scaled so the peak is 1.
 * It only shapes the chart; the percentile itself is never read from it.
 */
export function smoothCurve(bins: number[], bandwidth = 30): number[] {
  const values = Array.from({ length: CURVE_POINTS }, (_, j) => {
    const x = (j * 500) / (CURVE_POINTS - 1);
    return bins.reduce((sum, amount, i) => {
      const z = (x - (i * 25 + 12.5)) / bandwidth;
      return sum + amount * Math.exp(-0.5 * z * z);
    }, 0);
  });
  const peak = Math.max(...values);
  return peak > 0 ? values.map((v) => v / peak) : values;
}

/** Height of the smoothed curve at a score, from 0 to 1. */
export function curveAt(curve: number[], score: number) {
  const at = (clamp(score, 0, 500) / 500) * (curve.length - 1),
    low = Math.floor(at),
    high = Math.min(curve.length - 1, low + 1);
  return curve[low] + (curve[high] - curve[low]) * (at - low);
}
