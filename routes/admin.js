
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const Grievance = require('../models/Grievance');
const auth = require('../middleware/auth');

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Admin login attempt for email:', email);
    
    // Check if user exists and is admin
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      console.log('Admin user not found with email:', email);
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }
    
    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for admin user:', email);
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }
    
    console.log('Admin login successful for user:', user._id);
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'defaultsecret';
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      jwtSecret,
      { expiresIn: '30d' }
    );
    
    // Update lastActive
    user.lastActive = Date.now();
    await user.save();
    
    // Prepare response data
    const responseUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    };
    
    res.json({
      token,
      user: responseUser
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login', error: error.message });
  }
});

// Create admin
router.post('/create-admin', auth, async (req, res) => {
  try {
    // Ensure user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const { firstName, lastName, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create admin user
    const admin = new User({
      firstName,
      lastName,
      email,
      password,
      role: 'admin'
    });
    
    await admin.save();
    
    res.status(201).json({
      id: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error during admin creation', error: error.message });
  }
});

// Get dashboard stats
router.get('/dashboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Get user counts
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ role: 'student' });
    const recruiters = await User.countDocuments({ role: 'recruiter' });
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Get application counts
    const totalApplications = await Application.countDocuments();
    const pendingApplications = await Application.countDocuments({ status: 'Pending' });
    const acceptedApplications = await Application.countDocuments({ status: 'Accepted' });
    const recentApplications = await Application.countDocuments({
      appliedDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Get opportunity counts
    const totalOpportunities = await Opportunity.countDocuments();
    const activeOpportunities = await Opportunity.countDocuments({ isActive: true });
    
    // Get grievance counts
    const totalGrievances = await Grievance.countDocuments();
    const pendingGrievances = await Grievance.countDocuments({ status: 'pending' });
    const resolvedGrievances = await Grievance.countDocuments({ status: 'resolved' });
    
    res.json({
      users: {
        total: totalUsers,
        students,
        recruiters,
        recent: recentUsers
      },
      applications: {
        total: totalApplications,
        pending: pendingApplications,
        accepted: acceptedApplications,
        recent: recentApplications
      },
      opportunities: {
        total: totalOpportunities,
        active: activeOpportunities
      },
      grievances: {
        total: totalGrievances,
        pending: pendingGrievances,
        resolved: resolvedGrievances
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get users with pagination and filters
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    if (role && role !== 'all') {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get users
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);
    
    res.json({
      users,
      pagination: {
        totalPages,
        currentPage: parseInt(page),
        totalUsers
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting other admins
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }
    
    // Delete user and related data
    await Promise.all([
      User.findByIdAndDelete(userId),
      Application.deleteMany({ student: userId }),
      Opportunity.deleteMany({ organization: userId }),
      Grievance.deleteMany({ user: userId })
    ]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin password reset request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if admin exists
    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found with this email' });
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '1h' }
    );
    
    // In a real application, you would send an email here
    // For now, we'll just return success
    console.log('Password reset token for admin:', resetToken);
    
    res.json({ 
      message: 'Password reset instructions sent to email',
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset admin password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    
    // Find admin
    const admin = await User.findById(decoded.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }
    
    // Update password
    admin.password = password;
    await admin.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
