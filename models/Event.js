
const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Interview', 'Deadline', 'Event', 'Meeting', 'Workshop', 'Webinar', 'Other'],
    default: 'Other'
  },
  description: {
    type: String
  },
  location: {
    type: String
  },
  meetingLink: {
    type: String
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  relatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'onModel'
  },
  onModel: {
    type: String,
    enum: ['Opportunity', 'Application', 'MicroInternship', 'MicroInternshipApplication']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Event', EventSchema);
