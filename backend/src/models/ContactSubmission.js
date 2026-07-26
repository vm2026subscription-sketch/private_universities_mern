const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'read', 'replied', 'archived'], default: 'new' },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  repliedAt: Date,
  notes: String
}, { timestamps: true });

contactSubmissionSchema.index({ status: 1, createdAt: -1 });


// The existing index is prefixed on `status`, so the UNFILTERED admin list
// (sort createdAt desc) could not use it.
contactSubmissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
