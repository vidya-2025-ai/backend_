
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const challengeController = require('../controllers/challengeController');
const solutionController = require('../controllers/solutionController');

// Get challenge events for students (must be before parameterized routes)
router.get('/events', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Mock challenge events - replace with actual database queries
    const challengeEvents = [
      {
        id: 'challenge_1',
        title: 'Coding Challenge Deadline',
        date: '2024-01-18',
        time: '23:59',
        type: 'Challenge',
        description: 'Final submission deadline for Algorithm Challenge',
        location: 'Online Platform'
      },
      {
        id: 'challenge_2',
        title: 'Corporate Hackathon',
        date: '2024-01-25',
        time: '09:00',
        type: 'Challenge',
        description: '48-hour hackathon sponsored by TechCorp',
        location: 'TechCorp Headquarters'
      }
    ];

    res.json(challengeEvents);
  } catch (error) {
    console.error('Error fetching challenge events:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recruiter statistics (must be before parameterized routes)
router.get('/recruiter/statistics', auth, challengeController.getRecruiterStatistics);

// Get recruiter challenges
router.get('/recruiter', auth, challengeController.getRecruiterChallenges);

// Get challenges for students specifically
router.get('/student', auth, challengeController.getAllChallenges);

// Get all challenges (for students)
router.get('/', auth, challengeController.getAllChallenges);

// Create a new challenge (recruiters only)
router.post('/', auth, challengeController.createChallenge);

// Get specific challenge by ID
router.get('/:id', auth, challengeController.getChallengeById);

// Update challenge (recruiters only)
router.put('/:id', auth, challengeController.updateChallenge);

// Delete challenge (recruiters only)
router.delete('/:id', auth, challengeController.deleteChallenge);

// Toggle challenge status (recruiters only)
router.put('/:id/status', auth, challengeController.toggleChallengeStatus);

// Submit solution to a challenge
router.post('/:id/solutions', auth, solutionController.submitSolution);

// Get solutions for a challenge
router.get('/:id/solutions', auth, solutionController.getSolutions);

// Evaluate a solution (recruiters only)
router.put('/:challengeId/solutions/:solutionId/evaluate', auth, solutionController.evaluateSolution);

module.exports = router;
