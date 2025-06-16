const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

const corsOptions = {
  origin: 'https://frontend-mu-ashen.vercel.app',
  credentials: true, // required if you're using cookies or sessions
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/resume', require('./routes/resume'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/events', require('./routes/events'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/ats', require('./routes/ats'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/career', require('./routes/career'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/community', require('./routes/community'));
app.use('/api/mentorship', require('./routes/mentorship'));
app.use('/api/micro-internships', require('./routes/micro-internships'));
app.use('/api/grievances', require('./routes/grievances'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
