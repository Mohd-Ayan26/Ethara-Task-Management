const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.get('/dashboard', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    // ── Scoping ──────────────────────────────────────────────────────────
    let projectFilter = {};
    let taskFilter    = {};

    if (!isAdmin) {
      const userProjects = await Project.find({ 'members.user': req.user._id }).select('_id');
      const projectIds   = userProjects.map(p => p._id);
      projectFilter      = { _id: { $in: projectIds } };

      // Member stats use THEIR personal status from userStatuses array
      taskFilter = {
        project:   { $in: projectIds },
        assignees: req.user._id
      };
    }

    // ── Core counts ───────────────────────────────────────────────────────
    const now = new Date();

    let totalTasks, completedTasks, inProgressTasks, overdueTasks, tasksByStatus, tasksByPriority;

    if (isAdmin) {
      // Admin: aggregate status from the task-level status field
      [totalTasks, completedTasks, inProgressTasks, overdueTasks] = await Promise.all([
        Task.countDocuments({}),
        Task.countDocuments({ status: 'done' }),
        Task.countDocuments({ status: 'inprogress' }),
        Task.countDocuments({ status: { $ne: 'done' }, dueDate: { $lt: now } })
      ]);
      tasksByStatus   = await Task.aggregate([{ $group: { _id: '$status',   count: { $sum: 1 } } }]);
      tasksByPriority = await Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]);
    } else {
      // Member: use userStatuses to count their personal state
      const myStatusCounts = await Task.aggregate([
        { $match: taskFilter },
        { $unwind: '$userStatuses' },
        { $match: { 'userStatuses.user': req.user._id } },
        { $group: { _id: '$userStatuses.status', count: { $sum: 1 } } }
      ]);
      const sc = {};
      myStatusCounts.forEach(r => { sc[r._id] = r.count; });
      completedTasks  = sc.done        || 0;
      inProgressTasks = sc.inprogress  || 0;
      const todoTasks = sc.todo        || 0;
      totalTasks      = completedTasks + inProgressTasks + todoTasks;
      tasksByStatus   = Object.entries(sc).map(([k, v]) => ({ _id: k, count: v }));
      overdueTasks    = await Task.countDocuments({ ...taskFilter, dueDate: { $lt: now }, 'userStatuses': { $elemMatch: { user: req.user._id, status: { $ne: 'done' } } } });
      tasksByPriority = await Task.aggregate([
        { $match: taskFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);
    }

    const totalProjects = await Project.countDocuments({ ...projectFilter, status: 'active' });

    // ── Upcoming deadlines ────────────────────────────────────────────────
    const deadlineFilter = isAdmin
      ? { status: { $ne: 'done' }, dueDate: { $gte: now, $lte: new Date(Date.now() + 7 * 86400000) } }
      : { ...taskFilter, dueDate: { $gte: now, $lte: new Date(Date.now() + 7 * 86400000) } };

    const upcomingDeadlines = await Task.find(deadlineFilter)
      .populate('project',   'name color')
      .populate('assignees', 'fullName')
      .sort('dueDate').limit(10);

    // ── Activity logs ─────────────────────────────────────────────────────
    let recentActivity = [];
    if (isAdmin) {
      const projects = await Project.find({})
        .select('activityLog name')
        .populate('activityLog.user', 'fullName email')
        .sort('-updatedAt').limit(20);

      recentActivity = projects
        .flatMap(p => p.activityLog.map(a => ({ ...a.toObject(), projectName: p.name })))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 30);
    } else {
      const projects = await Project.find(projectFilter)
        .select('activityLog name')
        .populate('activityLog.user', 'fullName email');

      recentActivity = projects
        .flatMap(p =>
          p.activityLog
            .filter(a => a.user?._id?.toString() === req.user._id.toString())
            .map(a => ({ ...a.toObject(), projectName: p.name }))
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);
    }

    // ── Admin: per-member task status matrix using userStatuses ───────────
    let memberTaskMatrix = [];
    if (isAdmin) {
      memberTaskMatrix = await Task.aggregate([
        { $unwind: '$userStatuses' },
        {
          $group: {
            _id:    '$userStatuses.user',
            todo:       { $sum: { $cond: [{ $eq: ['$userStatuses.status', 'todo'] },       1, 0] } },
            inprogress: { $sum: { $cond: [{ $eq: ['$userStatuses.status', 'inprogress'] }, 1, 0] } },
            done:       { $sum: { $cond: [{ $eq: ['$userStatuses.status', 'done'] },       1, 0] } },
            total:  { $sum: 1 }
          }
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { 'user.fullName': 1, 'user.email': 1, todo: 1, inprogress: 1, done: 1, total: 1 } },
        { $sort: { total: -1 } },
        { $limit: 20 }
      ]);
    }

    // ── Bar chart: tasks per user (using userStatuses) ────────────────────
    const tasksByUser = await Task.aggregate([
      { $unwind: '$userStatuses' },
      {
        $group: {
          _id:        '$userStatuses.user',
          total:      { $sum: 1 },
          done:       { $sum: { $cond: [{ $eq: ['$userStatuses.status', 'done'] },       1, 0] } },
          inprogress: { $sum: { $cond: [{ $eq: ['$userStatuses.status', 'inprogress'] }, 1, 0] } }
        }
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { 'user.fullName': 1, total: 1, done: 1, inprogress: 1 } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    // ── Admin: activity count per user (how many task actions each user did)
    let userActivityCounts = [];
    if (isAdmin) {
      const allProjects = await Project.find({}).select('activityLog');
      const counts = {};
      allProjects.forEach(p =>
        p.activityLog.forEach(a => {
          const uid = a.user?.toString();
          if (uid) counts[uid] = (counts[uid] || 0) + 1;
        })
      );
      const users = await User.find({ _id: { $in: Object.keys(counts) } }).select('fullName email');
      userActivityCounts = users.map(u => ({ user: u, count: counts[u._id.toString()] || 0 }))
        .sort((a, b) => b.count - a.count);
    }

    res.json({
      stats: {
        totalProjects, totalTasks,
        completedTasks, inProgressTasks,
        todoTasks: totalTasks - completedTasks - inProgressTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      charts: { tasksByStatus, tasksByPriority, tasksByUser },
      memberTaskMatrix,
      userActivityCounts,
      upcomingDeadlines,
      recentActivity,
      isAdmin
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

module.exports = router;
