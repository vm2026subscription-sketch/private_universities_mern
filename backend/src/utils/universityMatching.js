/**
 * Single source of truth for "does this imported row refer to a university we
 * already have?".
 *
 * Two importers answered that question independently and disagreed:
 * routes/uploadExcel matched on universityCode then name+state, while
 * adminController.bulkImportUniversities matched on universityCode then name
 * ALONE. Name-only matching merges genuinely different institutions that share a
 * name in different states (there is more than one "Sanskriti University",
 * "ICFAI University", etc.), so a bulk import silently overwrote an existing
 * record instead of creating the intended new one.
 *
 * Resolution order, strongest identifier first:
 *   1. universityCode — a match here means it is definitively the same institution.
 *   2. name + state   — the intended key for spreadsheet rows.
 *   3. name alone     — only when the row carries no state, and only when exactly
 *                       one university has that name. More than one is reported
 *                       as ambiguous so the caller can skip rather than guess.
 */

const University = require('../models/University');

/** Candidate cap: enough to prove ambiguity without an unbounded scan. */
const AMBIGUITY_PROBE_LIMIT = 3;

const asTrimmed = (value) => String(value === null || value === undefined ? '' : value).trim();

const describe = (doc) => (doc.state ? `${doc.name} (${doc.state})` : doc.name);

/**
 * @param {{name?: string, state?: string, universityCode?: string}} input
 * @returns {Promise<{
 *   doc: object|null,
 *   matchedBy: 'code'|'name+state'|'name'|null,
 *   ambiguous: boolean,
 *   candidates: string[]
 * }>}
 */
const findExistingUniversity = async (input = {}) => {
  const none = { doc: null, matchedBy: null, ambiguous: false, candidates: [] };

  const name = asTrimmed(input.name);
  const state = asTrimmed(input.state);
  const universityCode = asTrimmed(input.universityCode);

  if (universityCode) {
    // The schema uppercases universityCode on write, so compare in that form.
    const byCode = await University.findOne({ universityCode: universityCode.toUpperCase() });
    if (byCode) return { doc: byCode, matchedBy: 'code', ambiguous: false, candidates: [] };
  }

  if (!name) return none;

  if (state) {
    const byNameAndState = await University.findOne({ name, state });
    return byNameAndState
      ? { doc: byNameAndState, matchedBy: 'name+state', ambiguous: false, candidates: [] }
      : none;
  }

  const sameName = await University.find({ name })
    .select('name state')
    .limit(AMBIGUITY_PROBE_LIMIT);

  if (sameName.length === 0) return none;

  if (sameName.length > 1) {
    return {
      doc: null,
      matchedBy: null,
      ambiguous: true,
      candidates: sameName.map(describe),
    };
  }

  // Exactly one namesake and the row gave no state — safe to treat as the same
  // institution. Re-read the full document; the probe above only selected two fields.
  const doc = await University.findById(sameName[0]._id);
  return doc
    ? { doc, matchedBy: 'name', ambiguous: false, candidates: [] }
    : none;
};

/** Human-readable label for an error message, e.g. "university code" / "name + state". */
const describeMatch = (matchedBy) => {
  if (matchedBy === 'code') return 'university code';
  if (matchedBy === 'name+state') return 'name + state';
  if (matchedBy === 'name') return 'name';
  return 'no match';
};

module.exports = {
  findExistingUniversity,
  describeMatch,
};
