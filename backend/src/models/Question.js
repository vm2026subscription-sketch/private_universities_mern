const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  isBestAnswer: { type: Boolean, default: false },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const questionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
  title: { type: String, required: true },
  content: String,
  category: String,
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  answers: [answerSchema]
}, { timestamps: true });

// Indexes matching the community feed's access patterns (filter by category /
// university, newest-first). Without these, question listing did a collection
// scan on every request.
questionSchema.index({ category: 1, createdAt: -1 });
questionSchema.index({ universityId: 1, createdAt: -1 });
questionSchema.index({ userId: 1 });

module.exports = mongoose.model('Question', questionSchema);
