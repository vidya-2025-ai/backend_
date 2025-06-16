
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Grievance = require('../models/Grievance');
const User = require('../models/User');

// Get all grievances (for students - their own)
router.get('/student', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { status, type, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { createdBy: req.user.id };
    
    if (status) query.status = status;
    if (type) query.type = type;
    
    const grievances = await Grievance.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalCount = await Grievance.countDocuments(query);
    
    const formattedGrievances = grievances.map(grievance => ({
      id: grievance._id,
      _id: grievance._id,
      title: grievance.title,
      description: grievance.description,
      category: grievance.category,
      type: grievance.type,
      status: grievance.status,
      priority: grievance.priority,
      rating: grievance.rating,
      serviceUsed: grievance.serviceUsed,
      platformFeedback: grievance.platformFeedback,
      createdBy: {
        id: grievance.createdBy,
        name: grievance.creatorName,
        role: grievance.creatorRole
      },
      responses: grievance.responses.map(response => ({
        id: response._id,
        _id: response._id,
        content: response.content,
        responder: {
          id: response.responder,
          name: response.responderName,
          role: response.responderRole
        },
        createdAt: response.createdAt
      })),
      createdAt: grievance.createdAt,
      updatedAt: grievance.updatedAt
    }));
    
    res.json({
      grievances: formattedGrievances,
      data: formattedGrievances,
      pagination: {
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching student grievances:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create grievance (for students and recruiters)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, type, rating, serviceUsed, platformFeedback } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const grievanceData = {
      title,
      description,
      category: category || 'general',
      type: type || 'grievance',
      createdBy: req.user.id,
      creatorName: `${user.firstName} ${user.lastName}`,
      creatorRole: user.role
    };

    // Add rating and feedback fields if provided
    if (rating) grievanceData.rating = rating;
    if (serviceUsed) grievanceData.serviceUsed = serviceUsed;
    if (platformFeedback) grievanceData.platformFeedback = platformFeedback;

    const grievance = new Grievance(grievanceData);
    await grievance.save();

    res.status(201).json({
      id: grievance._id,
      _id: grievance._id,
      title: grievance.title,
      description: grievance.description,
      category: grievance.category,
      type: grievance.type,
      status: grievance.status,
      priority: grievance.priority,
      rating: grievance.rating,
      serviceUsed: grievance.serviceUsed,
      platformFeedback: grievance.platformFeedback,
      createdBy: {
        id: grievance.createdBy,
        name: grievance.creatorName,
        role: grievance.creatorRole
      },
      responses: [],
      createdAt: grievance.createdAt,
      updatedAt: grievance.updatedAt
    });
  } catch (error) {
    console.error('Error creating grievance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all grievances for recruiter
router.get('/recruiter', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const { status, type, page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { createdBy: req.user.id };
    
    if (status) query.status = status;
    if (type) query.type = type;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const grievances = await Grievance.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalCount = await Grievance.countDocuments(query);
    
    const formattedGrievances = grievances.map(grievance => ({
      id: grievance._id,
      title: grievance.title,
      description: grievance.description,
      category: grievance.category,
      type: grievance.type,
      status: grievance.status,
      priority: grievance.priority,
      rating: grievance.rating,
      serviceUsed: grievance.serviceUsed,
      platformFeedback: grievance.platformFeedback,
      creatorName: grievance.creatorName,
      creatorRole: grievance.creatorRole,
      responseCount: grievance.responses.length,
      createdAt: grievance.createdAt
    }));
    
    res.json({
      grievances: formattedGrievances,
      pagination: {
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching recruiter grievances:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all grievances for admin
router.get('/admin', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const { status, type, priority, page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { creatorName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const grievances = await Grievance.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalCount = await Grievance.countDocuments(query);
    
    const formattedGrievances = grievances.map(grievance => ({
      id: grievance._id,
      _id: grievance._id,
      title: grievance.title,
      description: grievance.description,
      category: grievance.category,
      type: grievance.type,
      status: grievance.status,
      priority: grievance.priority,
      rating: grievance.rating,
      serviceUsed: grievance.serviceUsed,
      platformFeedback: grievance.platformFeedback,
      createdBy: {
        id: grievance.createdBy,
        name: grievance.creatorName,
        role: grievance.creatorRole
      },
      responses: grievance.responses.map(response => ({
        id: response._id,
        content: response.content,
        responder: {
          id: response.responder,
          name: response.responderName,
          role: response.responderRole
        },
        createdAt: response.createdAt
      })),
      createdAt: grievance.createdAt,
      updatedAt: grievance.updatedAt
    }));
    
    res.json({
      grievances: formattedGrievances,
      pagination: {
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin grievances:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get grievance details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }
    
    // Check if user has permission to view this grievance
    if (req.user.role === 'student' && grievance.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (req.user.role === 'recruiter' && grievance.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    res.json({
      id: grievance._id,
      _id: grievance._id,
      title: grievance.title,
      description: grievance.description,
      category: grievance.category,
      type: grievance.type,
      status: grievance.status,
      priority: grievance.priority,
      rating: grievance.rating,
      serviceUsed: grievance.serviceUsed,
      platformFeedback: grievance.platformFeedback,
      createdBy: {
        id: grievance.createdBy,
        name: grievance.creatorName,
        role: grievance.creatorRole
      },
      responses: grievance.responses.map(response => ({
        id: response._id,
        _id: response._id,
        content: response.content,
        responder: {
          id: response.responder,
          name: response.responderName,
          role: response.responderRole
        },
        createdAt: response.createdAt
      })),
      createdAt: grievance.createdAt,
      updatedAt: grievance.updatedAt
    });
  } catch (error) {
    console.error('Error fetching grievance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add response to grievance
router.post('/:id/responses', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Response content is required' });
    }
    
    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const response = {
      content,
      responder: req.user.id,
      responderName: `${user.firstName} ${user.lastName}`,
      responderRole: user.role,
      createdAt: new Date()
    };
    
    grievance.responses.push(response);
    
    // Update status based on who is responding
    if (user.role === 'admin' && grievance.status === 'pending') {
      grievance.status = 'under-review';
    }
    
    await grievance.save();
    
    const savedResponse = grievance.responses[grievance.responses.length - 1];
    
    res.json({
      id: savedResponse._id,
      _id: savedResponse._id,
      content: savedResponse.content,
      responder: {
        id: savedResponse.responder,
        name: savedResponse.responderName,
        role: savedResponse.responderRole
      },
      createdAt: savedResponse.createdAt
    });
  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update grievance status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }
    
    // Check permissions
    if (req.user.role === 'admin' || 
        (req.user.role === 'recruiter' && grievance.createdBy.toString() === req.user.id) ||
        (req.user.role === 'student' && grievance.createdBy.toString() === req.user.id)) {
      grievance.status = status;
      await grievance.save();
      
      res.json({
        id: grievance._id,
        status: grievance.status
      });
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get grievance analytics for admin
router.get('/admin/analytics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const totalGrievances = await Grievance.countDocuments();
    const pendingGrievances = await Grievance.countDocuments({ status: 'pending' });
    const resolvedGrievances = await Grievance.countDocuments({ status: 'resolved' });
    const feedbackCount = await Grievance.countDocuments({ type: 'feedback' });
    
    // Calculate average rating from feedback
    const ratingsAgg = await Grievance.aggregate([
      { $match: { type: 'feedback', rating: { $exists: true } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    
    const avgRating = ratingsAgg.length > 0 ? ratingsAgg[0].avgRating : 0;
    
    // Get category breakdown
    const categoryBreakdown = await Grievance.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get platform feedback summary
    const platformFeedback = await Grievance.aggregate([
      { 
        $match: { 
          type: 'feedback',
          'platformFeedback.overall': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgUsability: { $avg: '$platformFeedback.usability' },
          avgFeatures: { $avg: '$platformFeedback.features' },
          avgPerformance: { $avg: '$platformFeedback.performance' },
          avgOverall: { $avg: '$platformFeedback.overall' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      summary: {
        total: totalGrievances,
        pending: pendingGrievances,
        resolved: resolvedGrievances,
        feedback: feedbackCount,
        avgRating: parseFloat(avgRating.toFixed(1))
      },
      categoryBreakdown,
      platformFeedback: platformFeedback.length > 0 ? {
        usability: parseFloat(platformFeedback[0].avgUsability?.toFixed(1) || '0'),
        features: parseFloat(platformFeedback[0].avgFeatures?.toFixed(1) || '0'),
        performance: parseFloat(platformFeedback[0].avgPerformance?.toFixed(1) || '0'),
        overall: parseFloat(platformFeedback[0].avgOverall?.toFixed(1) || '0'),
        responseCount: platformFeedback[0].count
      } : null
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get grievance statistics for recruiter dashboard
router.get('/recruiter/statistics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const totalGrievances = await Grievance.countDocuments({ createdBy: req.user.id });
    const pendingGrievances = await Grievance.countDocuments({ createdBy: req.user.id, status: 'pending' });
    const resolvedGrievances = await Grievance.countDocuments({ createdBy: req.user.id, status: 'resolved' });
    const feedbackCount = await Grievance.countDocuments({ createdBy: req.user.id, type: 'feedback' });
    
    res.json({
      totalGrievances,
      pendingGrievances,
      resolvedGrievances,
      feedbackCount,
      avgResolutionTime: 0 // Can be calculated based on response times
    });
  } catch (error) {
    console.error('Error fetching recruiter statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
