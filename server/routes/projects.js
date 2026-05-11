const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect, projectAdmin, projectMember } = require('../middleware/auth');

// @route   GET /api/projects
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query = { 'members.user': req.user._id };
    }

    const projects = await Project.find(query)
      .populate('creator', 'fullName email')
      .populate('members.user', 'fullName email role')
      .sort('-createdAt');

    // Add task counts
    const projectsWithStats = await Promise.all(projects.map(async (project) => {
      const taskCount = await Task.countDocuments({ project: project._id });
      const completedCount = await Task.countDocuments({ project: project._id, status: 'done' });
      const overdueCount = await Task.countDocuments({
        project: project._id,
        status: { $ne: 'done' },
        dueDate: { $lt: new Date() }
      });
      return {
        ...project.toJSON(),
        stats: { total: taskCount, completed: completedCount, overdue: overdueCount }
      };
    }));

    res.json({ projects: projectsWithStats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// @route   POST /api/projects
router.post('/', protect, [
  body('name').trim().isLength({ min: 3 }).withMessage('Project name must be at least 3 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().isHexColor().withMessage('Color must be a valid hex color')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, description, color, dueDate, tags } = req.body;

    const project = await Project.create({
      name, description, color, dueDate, tags,
      creator: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
      activityLog: [{
        user: req.user._id,
        action: 'created project',
        target: name
      }]
    });

    await project.populate('creator', 'fullName email');
    await project.populate('members.user', 'fullName email role');

    res.status(201).json({ message: 'Project created', project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// @route   GET /api/projects/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'fullName email')
      .populate('members.user', 'fullName email role')
      .populate('activityLog.user', 'fullName');

    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const isMember = project.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const tasks = await Task.find({ project: project._id })
      .populate('assignees', 'fullName email')
      .populate('assignee',  'fullName email')
      .populate('creator',   'fullName email')
      .populate('userStatuses.user', 'fullName email');

    // For non-admin members attach their personal status
    const isNonAdmin = req.user.role !== 'admin';
    const enrichedTasks = tasks.map(t => {
      const obj = t.toJSON();
      if (isNonAdmin) {
        const mine = t.userStatuses?.find(us =>
          (us.user?._id || us.user)?.toString() === req.user._id.toString()
        );
        obj.myStatus = mine?.status || 'todo';
      }
      return obj;
    });

    // Admin: per-task breakdown of each assignee's status
    const taskAssignmentAnalytics = tasks.map(t => ({
      taskId:   t._id,
      title:    t.title,
      priority: t.priority,
      dueDate:  t.dueDate,
      overallStatus: t.status,
      assigneeStatuses: (t.userStatuses || []).map(us => ({
        user:        us.user,
        status:      us.status,
        completedAt: us.completedAt
      }))
    }));

    res.json({ project, tasks: enrichedTasks, taskAssignmentAnalytics });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// @route   PUT /api/projects/:id
router.put('/:id', protect, [
  body('name').optional().trim().isLength({ min: 3 })
], async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if ((!member || member.role !== 'admin') && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const { name, description, color, status, dueDate, tags } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color) updates.color = color;
    if (status) updates.status = status;
    if (dueDate) updates.dueDate = dueDate;
    if (tags) updates.tags = tags;

    // Log activity
    const activityEntry = { user: req.user._id, action: 'updated project', target: project.name };
    
    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      { ...updates, $push: { activityLog: activityEntry } },
      { new: true, runValidators: true }
    ).populate('creator', 'fullName email').populate('members.user', 'fullName email role');

    res.json({ message: 'Project updated', project: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// @route   DELETE /api/projects/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if ((!member || member.role !== 'admin') && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    await Task.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// @route   POST /api/projects/:id/members
router.post('/:id/members', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if ((!member || member.role !== 'admin') && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const { userId, role } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const alreadyMember = project.members.some(m => m.user.toString() === userId);
    if (alreadyMember) return res.status(400).json({ error: 'User already a member.' });

    project.members.push({ user: userId, role: role || 'member' });
    project.activityLog.push({
      user: req.user._id,
      action: 'added member',
      target: user.fullName
    });
    await project.save();
    await project.populate('members.user', 'fullName email role');

    res.json({ message: 'Member added', project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add member.' });
  }
});

// @route   DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if ((!member || member.role !== 'admin') && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    if (project.creator.toString() === req.params.userId) {
      return res.status(400).json({ error: 'Cannot remove project creator.' });
    }

    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    project.activityLog.push({
      user: req.user._id,
      action: 'removed member',
      target: req.params.userId
    });
    await project.save();
    await project.populate('members.user', 'fullName email role');

    res.json({ message: 'Member removed', project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

module.exports = router;
