const mongoose = require('mongoose');

/**
 * A request from a person claiming to represent a university.
 *
 * This is the record an admin reviews. It is kept separate from the User
 * document on purpose: the claim carries evidence and a review decision that
 * must survive independently of the account (rejections stay auditable, and a
 * second claim on the same university does not overwrite the first).
 *
 * Ownership itself is NOT stored here. Approving a claim writes
 * `User.universityId`, which is the single source of truth — see User.js. This
 * document only records that the decision was made, by whom, and when.
 */

const CLAIM_STATUS = ['pending', 'approved', 'rejected'];

/**
 * How the applicant's email relates to the university they are claiming.
 *
 * This is a SIGNAL for the reviewing admin, never a gate. A hard "official
 * domain only" rule would lock out the very customers this portal is for: many
 * private universities in India still run admissions on Gmail. Equally, an
 * official address is not proof of authority — every student at a university
 * has one — so `official` does not imply auto-approval either.
 */
const EMAIL_SIGNALS = [
  'official',   // Matches the university's own website domain
  'academic',   // .edu / .ac.in / .edu.in but not matched to this university
  'free',       // Gmail, Yahoo, Outlook, Rediffmail, ...
  'unrelated',  // A real domain with no visible link to the university
];

const universityClaimSchema = new mongoose.Schema({
  /** The account that will receive tenancy if this claim is approved. */
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  /**
   * The university being claimed. Absent when the applicant says their
   * university is not listed yet — in that case an admin creates the university
   * first and attaches it before approving.
   */
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', index: true },

  /** Free-text name, used only when `university` is not set. */
  requestedUniversityName: { type: String, trim: true },

  // ── Evidence the admin reviews ──────────────────────────────────────────
  contactPerson: { type: String, required: true, trim: true },
  designation: { type: String, required: true, trim: true },
  officialEmail: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  website: { type: String, trim: true },

  /** Letter on university letterhead. Uploaded separately; stored as a URL. */
  authorizationLetterUrl: { type: String, trim: true },

  emailSignal: { type: String, enum: EMAIL_SIGNALS, required: true },
  emailDomain: { type: String, lowercase: true, trim: true },

  status: { type: String, enum: CLAIM_STATUS, default: 'pending', index: true },

  // ── Review decision ─────────────────────────────────────────────────────
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNote: String,

  /**
   * Set when an approval displaced an existing owner. Reassignment is a
   * superadmin-only action (a representative leaving their job is a real case),
   * and it must be obvious afterwards that it happened.
   */
  replacedOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// The admin queue: pending claims, oldest first.
universityClaimSchema.index({ status: 1, createdAt: -1 });

/**
 * One live claim per applicant per university.
 *
 * Partial rather than plain unique: a rejected claim must not block the person
 * from re-applying with better evidence, and it must not block a different
 * person from claiming the same university later.
 */
universityClaimSchema.index(
  { user: 1, university: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

universityClaimSchema.statics.CLAIM_STATUS = CLAIM_STATUS;
universityClaimSchema.statics.EMAIL_SIGNALS = EMAIL_SIGNALS;

module.exports = mongoose.model('UniversityClaim', universityClaimSchema);
