CREATE TABLE IF NOT EXISTS scores (
  puzzle TEXT NOT NULL,
  player_hash TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 500),
  submitted_at INTEGER NOT NULL,
  PRIMARY KEY (puzzle, player_hash)
);

CREATE INDEX IF NOT EXISTS scores_puzzle_score
  ON scores (puzzle, score);

