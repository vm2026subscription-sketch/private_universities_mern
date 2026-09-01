const natural = require('natural');

/**
 * Calculate fuzzy match score between a query and a string.
 * Returns a value between 0 (no match) and 1 (perfect match).
 *
 * Scoring strategy:
 *   - Prefix match:        1.0  (query is at the start)
 *   - Exact substring:     0.9  (query appears anywhere)
 *   - JaroWinkler:         0.0-0.85 (fuzzy similarity, good for typos)
 *   - Dice coefficient:    0.0-0.8  (bigram similarity)
 */
function fuzzyScore(query, target) {
  if (!query || !target) return 0;

  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (q === t) return 1.0;
  if (t.startsWith(q)) return 1.0;
  if (t.includes(q)) return 0.9;

  // Multi-word: all words present
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every(w => t.includes(w))) return 0.85;

  // Fuzzy: best of JaroWinkler and Dice
  const jw = natural.JaroWinklerDistance(q, t);
  const dice = natural.DiceCoefficient(q, t);

  return Math.max(jw, dice);
}

/**
 * Score and rank universities against a search query.
 * @param {Array} universities - Array of university objects (need at least name, city, state)
 * @param {string} query - The search query
 * @param {number} limit - Max results to return
 * @returns {Array} Scored and sorted results with _score field
 */
function fuzzyRank(universities, query, limit = 10) {
  if (!query || !query.trim()) return [];

  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);

  const scored = universities.map(uni => {
    const nameScore = fuzzyScore(q, uni.name || '');
    const cityScore = fuzzyScore(q, uni.city || '');
    const stateScore = fuzzyScore(q, uni.state || '');

    let wordScore = 0;
    if (words.length > 1) {
      wordScore = Math.max(...words.map(w => fuzzyScore(w, uni.name || '')));
    }

    const score = Math.max(nameScore, cityScore * 0.7, stateScore * 0.5, wordScore * 0.8);

    return { ...uni, _score: score };
  });

  return scored
    .filter(uni => uni._score > 0.15)
    .sort((a, b) => {
      if (a.isSponsored !== b.isSponsored) return b.isSponsored ? 1 : -1;
      if (a.sponsorPriority !== b.sponsorPriority) return (b.sponsorPriority || 0) - (a.sponsorPriority || 0);
      if (Math.abs(a._score - b._score) > 0.001) return b._score - a._score;
      return (a.name || '').localeCompare(b.name || '');
    })
    .slice(0, limit);
}

module.exports = { fuzzyScore, fuzzyRank };
