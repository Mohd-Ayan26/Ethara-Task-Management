const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account deactivated.' });
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    next(err);
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

const projectAdmin = async (req, res, next) => {
  try {
    const Project = require('../models/Project');
    const projectId = req.params.projectId || req.body.project;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const member = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!member && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Not a project member.' });
    }

    if (member && member.role !== 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Project admin privileges required.' });
    }

    req.project = project;
    next();
  } catch (err) {
    next(err);
  }
};

const projectMember = async (req, res, next) => {
  try {
    const Project = require('../models/Project');
    const projectId = req.params.projectId || req.params.id || req.body.project;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Not a project member.' });
    }

    req.project = project;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { protect, adminOnly, projectAdmin, projectMember };
