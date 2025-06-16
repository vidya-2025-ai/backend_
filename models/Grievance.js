
const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  responder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  responderName: {
    type: String,
    required: true
  },
  responderRole: {
    type: String,
    enum: ['student', 'recruiter', 'admin'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const GrievanceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'billing', 'academic', 'feedback', 'other'],
    default: 'general'
  },
  type: {
    type: String,
    enum: ['grievance', 'feedback', 'rating'],
    default: 'grievance'
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'closed', 'open', 'under-review'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  creatorRole: {
    type: String,
    enum: ['student', 'recruiter'],
    required: true
  },
  // Rating fields for feedback
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  serviceUsed: {
    type: String // What service triggered the feedback
  },
  // Feedback specific fields
  platformFeedback: {
    usability: {
      type: Number,
      min: 1,
      max: 5
    },
    features: {
      type: Number,
      min: 1,
      max: 5
    },
    performance: {
      type: Number,
      min: 1,
      max: 5
    },
    overall: {
      type: Number,
      min: 1,
      max: 5
    },
    suggestions: String
  },
  responses: [ResponseSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
GrievanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Grievance', GrievanceSchema);
