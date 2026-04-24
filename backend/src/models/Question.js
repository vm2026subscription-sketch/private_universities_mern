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

module.exports = mongoose.model('Question', questionSchema);
