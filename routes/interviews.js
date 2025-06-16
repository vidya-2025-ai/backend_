
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');

// Get all interviews for a recruiter
router.get('/recruiter', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const interviews = await Interview.find({ recruiter: req.user.id })
      .populate('candidate', 'firstName lastName email')
      .populate('opportunity', 'title')
      .sort({ date: 1, time: 1 });

    const formattedInterviews = interviews.map(interview => ({
      id: interview._id,
      applicationId: interview.application,
      candidateId: interview.candidate._id,
      candidateName: `${interview.candidate.firstName} ${interview.candidate.lastName}`,
      position: interview.opportunity.title,
      recruiterId: interview.recruiter,
      recruiterName: req.user.firstName + ' ' + req.user.lastName,
      date: interview.date,
      time: interview.time,
      duration: interview.duration,
      type: interview.type,
      status: interview.status,
      location: interview.location,
      meetingLink: interview.meetingLink,
      notes: interview.notes,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt
    }));

    res.json(formattedInterviews);
  } catch (error) {
    console.error('Error fetching recruiter interviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all interviews for a student
router.get('/student', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const interviews = await Interview.find({ candidate: req.user.id })
      .populate('recruiter', 'firstName lastName email')
      .populate('opportunity', 'title')
      .sort({ date: 1, time: 1 });

    const formattedInterviews = interviews.map(interview => ({
      id: interview._id,
      applicationId: interview.application,
      candidateId: interview.candidate,
      candidateName: req.user.firstName + ' ' + req.user.lastName,
      position: interview.opportunity.title,
      recruiterId: interview.recruiter._id,
      recruiterName: `${interview.recruiter.firstName} ${interview.recruiter.lastName}`,
      date: interview.date,
      time: interview.time,
      duration: interview.duration,
      type: interview.type,
      status: interview.status,
      location: interview.location,
      meetingLink: interview.meetingLink,
      notes: interview.notes,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt
    }));

    res.json(formattedInterviews);
  } catch (error) {
    console.error('Error fetching student interviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Schedule a new interview
router.post('/schedule', auth, async (req, res) => {
  try {
    console.log('Scheduling interview request:', req.body);
    console.log('User:', req.user);

    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const {
      applicationId,
      candidateId,
      date,
      time,
      duration = 60,
      type = 'Technical',
      location = 'Video Call',
      meetingLink,
      notes
    } = req.body;

    // Get the application to find the opportunity
    const application = await Application.findById(applicationId).populate('opportunity');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const interview = new Interview({
      application: applicationId,
      candidate: candidateId,
      recruiter: req.user.id,
      opportunity: application.opportunity._id,
      date,
      time,
      duration,
      type,
      status: 'Scheduled',
      location,
      meetingLink,
      notes
    });

    await interview.save();

    // Update application status to Interview
    await Application.findByIdAndUpdate(applicationId, {
      status: 'Interview',
      interviewDate: new Date(`${date}T${time}`)
    });

    // Populate the response
    const populatedInterview = await Interview.findById(interview._id)
      .populate('candidate', 'firstName lastName email')
      .populate('opportunity', 'title');

    const formattedInterview = {
      id: populatedInterview._id,
      applicationId: populatedInterview.application,
      candidateId: populatedInterview.candidate._id,
      candidateName: `${populatedInterview.candidate.firstName} ${populatedInterview.candidate.lastName}`,
      position: populatedInterview.opportunity.title,
      recruiterId: populatedInterview.recruiter,
      recruiterName: req.user.firstName + ' ' + req.user.lastName,
      date: populatedInterview.date,
      time: populatedInterview.time,
      duration: populatedInterview.duration,
      type: populatedInterview.type,
      status: populatedInterview.status,
      location: populatedInterview.location,
      meetingLink: populatedInterview.meetingLink,
      notes: populatedInterview.notes,
      createdAt: populatedInterview.createdAt,
      updatedAt: populatedInterview.updatedAt
    };

    res.status(201).json(formattedInterview);
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Update interview status
router.put('/:interviewId/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { interviewId } = req.params;
    const { status } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview || interview.recruiter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    interview.status = status;
    interview.updatedAt = Date.now();
    await interview.save();

    res.json(interview);
  } catch (error) {
    console.error('Error updating interview status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reschedule interview
router.put('/:interviewId/reschedule', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { interviewId } = req.params;
    const { date, time } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview || interview.recruiter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    interview.date = date;
    interview.time = time;
    interview.status = 'Rescheduled';
    interview.updatedAt = Date.now();
    await interview.save();

    // Update application interview date
    await Application.findByIdAndUpdate(interview.application, {
      interviewDate: new Date(`${date}T${time}`)
    });

    res.json(interview);
  } catch (error) {
    console.error('Error rescheduling interview:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update meeting link
router.put('/:interviewId/meeting-link', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { interviewId } = req.params;
    const { meetingLink } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview || interview.recruiter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    interview.meetingLink = meetingLink;
    interview.updatedAt = Date.now();
    await interview.save();

    res.json(interview);
  } catch (error) {
    console.error('Error updating meeting link:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
