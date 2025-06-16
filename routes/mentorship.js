
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Mentorship = require('../models/Mentorship');
const User = require('../models/User');

// Get all mentorships with filters (for admin/mentor view)
router.get('/', auth, async (req, res) => {
  try {
    const { status, role, page = 1, limit = 10, type, search } = req.query;
    const query = {};

    // Build query based on user role and filters
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'recruiter') {
      query.mentor = req.user.id;
    }

    if (status) query.status = status;
    if (type === 'direct') query['programDetails.isProgram'] = false;
    if (type === 'program') query['programDetails.isProgram'] = true;

    const mentorships = await Mentorship.find(query)
      .populate('mentor', 'firstName lastName organization jobTitle avatar')
      .populate('student', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ mentorships });
  } catch (error) {
    console.error('Error fetching mentorships:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user's mentorships
router.get('/my', auth, async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};

    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'recruiter') {
      query.mentor = req.user.id;
    }

    if (status) query.status = status;
    if (type === 'direct') query['programDetails.isProgram'] = false;
    if (type === 'program') query['programDetails.isProgram'] = true;

    const mentorships = await Mentorship.find(query)
      .populate('mentor', 'firstName lastName organization jobTitle avatar')
      .populate('student', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ mentorships });
  } catch (error) {
    console.error('Error fetching my mentorships:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create mentorship request
router.post('/request', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can request mentorship' });
    }

    const { mentorId, message, topic, sessionType, duration } = req.body;

    // Check if mentor exists
    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== 'recruiter') {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Check for existing pending request
    const existingRequest = await Mentorship.findOne({
      student: req.user.id,
      mentor: mentorId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending request with this mentor' });
    }

    const mentorship = new Mentorship({
      student: req.user.id,
      mentor: mentorId,
      message,
      topic: topic || 'General Mentorship',
      status: 'pending'
    });

    await mentorship.save();

    const populatedMentorship = await Mentorship.findById(mentorship._id)
      .populate('mentor', 'firstName lastName organization jobTitle avatar')
      .populate('student', 'firstName lastName email');

    res.status(201).json(populatedMentorship);
  } catch (error) {
    console.error('Error creating mentorship request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update mentorship status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, feedback } = req.body;
    const mentorshipId = req.params.id;

    const mentorship = await Mentorship.findById(mentorshipId);
    if (!mentorship) {
      return res.status(404).json({ message: 'Mentorship not found' });
    }

    // Only mentor can update status
    if (req.user.role !== 'recruiter' || mentorship.mentor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    mentorship.status = status;
    mentorship.updatedAt = new Date();
    if (feedback) mentorship.feedback = feedback;

    await mentorship.save();

    const updatedMentorship = await Mentorship.findById(mentorshipId)
      .populate('mentor', 'firstName lastName organization jobTitle avatar')
      .populate('student', 'firstName lastName email');

    res.json(updatedMentorship);
  } catch (error) {
    console.error('Error updating mentorship status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get mentorship statistics
router.get('/statistics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const mentorId = req.user.id;

    // Get counts
    const totalRequests = await Mentorship.countDocuments({ mentor: mentorId });
    const pendingRequests = await Mentorship.countDocuments({ mentor: mentorId, status: 'pending' });
    const acceptedRequests = await Mentorship.countDocuments({ mentor: mentorId, status: 'accepted' });
    const rejectedRequests = await Mentorship.countDocuments({ mentor: mentorId, status: 'rejected' });
    
    // Active mentees are accepted requests
    const activeMentees = acceptedRequests;
    
    // Active programs
    const activePrograms = await Mentorship.countDocuments({ 
      mentor: mentorId, 
      'programDetails.isProgram': true 
    });

    // Program applications
    const programApplications = await Mentorship.countDocuments({ 
      'applicationDetails.programId': { $exists: true } 
    });

    const statistics = {
      totalRequests,
      pendingRequests,
      acceptedRequests,
      rejectedRequests,
      activeMentees,
      activePrograms,
      programApplications,
      topMentors: [] // Could implement this later
    };

    res.json(statistics);
  } catch (error) {
    console.error('Error fetching mentorship statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student statistics
router.get('/student-stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const studentId = req.user.id;

    // Available programs (programs that are not full)
    const allPrograms = await Mentorship.find({ 'programDetails.isProgram': true });
    const availablePrograms = allPrograms.filter(program => 
      (program.programDetails.currentParticipants || 0) < program.programDetails.maxParticipants
    ).length;

    // Active mentorships
    const activeMentorships = await Mentorship.countDocuments({ 
      student: studentId, 
      status: 'accepted' 
    });

    // Pending applications
    const pendingApplications = await Mentorship.countDocuments({ 
      student: studentId, 
      status: 'pending' 
    });

    // Completed sessions (could be expanded later)
    const completedSessions = 0;

    res.json({
      availablePrograms,
      activeMentorships,
      pendingApplications,
      completedSessions
    });
  } catch (error) {
    console.error('Error fetching student statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available mentors
router.get('/mentors', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const mentors = await User.find({ 
      role: 'recruiter',
      _id: { $ne: req.user.id } // Exclude self
    }).select('firstName lastName organization jobTitle avatar skills');

    res.json({ mentors });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent requests
router.get('/recent', auth, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const query = {};

    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'recruiter') {
      query.mentor = req.user.id;
    }

    const recentRequests = await Mentorship.find(query)
      .populate('mentor', 'firstName lastName organization jobTitle avatar')
      .populate('student', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(recentRequests);
  } catch (error) {
    console.error('Error fetching recent requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create mentorship program
router.post('/programs', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can create programs' });
    }

    const { title, description, duration, skillsOffered, maxParticipants, requirements } = req.body;

    const program = new Mentorship({
      mentor: req.user.id,
      topic: title,
      message: description,
      programDetails: {
        isProgram: true,
        duration,
        skillsOffered,
        maxParticipants,
        currentParticipants: 0,
        requirements
      }
    });

    await program.save();

    const populatedProgram = await Mentorship.findById(program._id)
      .populate('mentor', 'firstName lastName organization jobTitle avatar');

    res.status(201).json(populatedProgram);
  } catch (error) {
    console.error('Error creating mentorship program:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get mentorship programs
router.get('/programs', auth, async (req, res) => {
  try {
    const programs = await Mentorship.find({ 'programDetails.isProgram': true })
      .populate('mentor', 'firstName lastName organization jobTitle avatar')
      .sort({ createdAt: -1 });

    res.json({ programs });
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Apply to mentorship program
router.post('/programs/:programId/apply', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can apply to programs' });
    }

    const { programId } = req.params;
    const { message } = req.body;

    // Check if program exists
    const program = await Mentorship.findById(programId);
    if (!program || !program.programDetails.isProgram) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check if program is full
    if (program.programDetails.currentParticipants >= program.programDetails.maxParticipants) {
      return res.status(400).json({ message: 'Program is full' });
    }

    // Check for existing application
    const existingApplication = await Mentorship.findOne({
      student: req.user.id,
      'applicationDetails.programId': programId
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied to this program' });
    }

    const application = new Mentorship({
      student: req.user.id,
      mentor: program.mentor,
      message,
      topic: program.topic,
      status: 'pending',
      applicationDetails: {
        programId: programId,
        appliedAt: new Date()
      }
    });

    await application.save();

    const populatedApplication = await Mentorship.findById(application._id)
      .populate('mentor', 'firstName lastName organization jobTitle avatar')
      .populate('student', 'firstName lastName email');

    res.status(201).json(populatedApplication);
  } catch (error) {
    console.error('Error applying to program:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get program application status
router.get('/programs/:programId/status', auth, async (req, res) => {
  try {
    const { programId } = req.params;

    const application = await Mentorship.findOne({
      student: req.user.id,
      'applicationDetails.programId': programId
    }).populate('mentor', 'firstName lastName organization jobTitle avatar');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error fetching application status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
