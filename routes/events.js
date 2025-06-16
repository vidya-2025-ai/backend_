
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Event = require('../models/Event');

// Get all events for a recruiter
router.get('/recruiter', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const events = await Event.find({ user: req.user.id })
      .sort({ date: 1, time: 1 });

    const formattedEvents = events.map(event => ({
      id: event._id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      type: event.type,
      description: event.description,
      location: event.location,
      status: event.isCompleted ? 'Completed' : 'Upcoming',
      meetingLink: event.meetingLink,
      createdAt: event.createdAt
    }));

    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching recruiter events:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all events for a student
router.get('/student', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // For now, students can see public events or events they're related to
    // This could be expanded to include events from applications, challenges, etc.
    const events = await Event.find({
      $or: [
        { user: req.user.id },
        { relatedTo: { $exists: true } } // Events related to applications/challenges they're part of
      ]
    }).sort({ date: 1, time: 1 });

    const formattedEvents = events.map(event => ({
      id: event._id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      type: event.type,
      description: event.description,
      location: event.location,
      status: event.isCompleted ? 'Completed' : 'Upcoming',
      meetingLink: event.meetingLink,
      createdAt: event.createdAt
    }));

    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching student events:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new event
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      date,
      time,
      type = 'Other',
      description,
      location,
      meetingLink,
      relatedTo,
      onModel
    } = req.body;

    const event = new Event({
      title,
      date: new Date(date),
      time,
      user: req.user.id,
      type,
      description,
      location,
      meetingLink,
      relatedTo,
      onModel
    });

    await event.save();

    const formattedEvent = {
      id: event._id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      type: event.type,
      description: event.description,
      location: event.location,
      status: event.isCompleted ? 'Completed' : 'Upcoming',
      meetingLink: event.meetingLink,
      createdAt: event.createdAt
    };

    res.status(201).json(formattedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an event
router.put('/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const updates = req.body;

    const event = await Event.findById(eventId);
    if (!event || event.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    Object.keys(updates).forEach(key => {
      if (key === 'date') {
        event[key] = new Date(updates[key]);
      } else {
        event[key] = updates[key];
      }
    });

    await event.save();

    const formattedEvent = {
      id: event._id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      type: event.type,
      description: event.description,
      location: event.location,
      status: event.isCompleted ? 'Completed' : 'Upcoming',
      meetingLink: event.meetingLink,
      createdAt: event.createdAt
    };

    res.json(formattedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update event meeting link
router.put('/:eventId/meeting-link', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { meetingLink } = req.body;

    const event = await Event.findById(eventId);
    if (!event || event.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    event.meetingLink = meetingLink;
    await event.save();

    const formattedEvent = {
      id: event._id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      type: event.type,
      description: event.description,
      location: event.location,
      status: event.isCompleted ? 'Completed' : 'Upcoming',
      meetingLink: event.meetingLink,
      createdAt: event.createdAt
    };

    res.json(formattedEvent);
  } catch (error) {
    console.error('Error updating event meeting link:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark event as completed
router.put('/:eventId/complete', auth, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event || event.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    event.isCompleted = true;
    await event.save();

    const formattedEvent = {
      id: event._id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      type: event.type,
      description: event.description,
      location: event.location,
      status: event.isCompleted ? 'Completed' : 'Upcoming',
      meetingLink: event.meetingLink,
      createdAt: event.createdAt
    };

    res.json(formattedEvent);
  } catch (error) {
    console.error('Error completing event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an event
router.delete('/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event || event.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Event.findByIdAndDelete(eventId);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
