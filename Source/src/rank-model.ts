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

/**
 * Exact empirical percentile from real score frequencies.
 * Players with the same score count as half below and half above (mid-rank),
 * so the result is the share of players the target beats, with no smoothing
 * that could pull mass past 0 or 500 and flatter high scores.
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
    };

  const score = clamp(Number(target), 0, 500),
    below = rows.reduce(
      (sum, row) => sum + (row.score < score ? row.amount : 0),
      0,
    ),
    tied = rows.reduce(
      (sum, row) => sum + (row.score === score ? row.amount : 0),
      0,
    ),
    percentile = (below + tied / 2) / samples,
    betterThan = clamp(Math.round(percentile * 100), 1, 99),
    bins = Array<number>(20).fill(0);
  for (const row of rows)
    bins[Math.min(19, Math.floor(row.score / 25))] += row.amount;

  return { betterThan, bins, samples };
}
