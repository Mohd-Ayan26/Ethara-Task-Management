const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

const POPULATE = [
  { path: 'assignees', select: 'fullName email' },
  { path: 'assignee',  select: 'fullName email' },
  { path: 'creator',   select: 'fullName email' },
  { path: 'project',   select: 'name color' },
  { path: 'userStatuses.user', select: 'fullName email' }
];

// ── Guard middleware ─────────────────────────────────────────────────────────
const canAccessTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const project = await Project.findById(task.project);
    const member  = project?.members.find(m => m.user.toString() === req.user._id.toString());

    if (!member && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    req.task          = task;
    req.projectMember = member;
    next();
  } catch (err) { next(err); }
};

// ── GET /api/tasks ───────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { project, status, priority, assignee, search, sort } = req.query;

    let query = {};

    if (project) {
      query.project = project;
    } else if (req.user.role !== 'admin') {
      const userProjects = await Project.find({ 'members.user': req.user._id }).select('_id');
      const ids = userProjects.map(p => p._id);
      // Members only see tasks they are assigned to
      query.$and = [
        { project: { $in: ids } },
        { $or: [{ assignees: req.user._id }, { assignee: req.user._id }] }
      ];
    }

    const addFilter = c => { if (query.$and) query.$and.push(c); else Object.assign(query, c); };
    if (priority) addFilter({ priority });
    if (assignee) addFilter({ $or: [{ assignees: assignee }, { assignee }] });
    if (search)   addFilter({ $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] });

    // For members, filter by their personal status (inside userStatuses), not global status
    if (status && req.user.role !== 'admin') {
      addFilter({ 'userStatuses': { $elemMatch: { user: req.user._id, status } } });
    } else if (status) {
      addFilter({ status });
    }

    const sortMap = { dueDate: 'dueDate', priority: '-priority', title: 'title' };
    const tasks = await Task.find(query).populate(POPULATE).sort(sortMap[sort] || '-createdAt');

    // For member views, attach their personal status as a convenience field
    const enriched = tasks.map(t => {
      const obj = t.toJSON();
      if (req.user.role !== 'admin') {
        const mine = t.userStatuses?.find(us => us.user?._id?.toString() === req.user._id.toString() || us.user?.toString() === req.user._id.toString());
        obj.myStatus = mine?.status || 'todo';
        obj.myCompletedAt = mine?.completedAt || null;
      }
      return obj;
    });

    res.json({ tasks: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// ── POST /api/tasks ──────────────────────────────────────────────────────────
router.post('/', protect, [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('project').notEmpty().withMessage('Project is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const project = await Project.findById(req.body.project);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
    if (member?.role === 'member' && req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can create tasks.' });

    const { title, description, priority, assignees, dueDate, tags } = req.body;
    const assigneeIds = Array.isArray(assignees) ? assignees.filter(Boolean) : (assignees ? [assignees] : []);

    // Build per-user status entries (all start at 'todo')
    const userStatuses = assigneeIds.map(uid => ({ user: uid, status: 'todo' }));

    const task = await Task.create({
      title, description, priority,
      assignees: assigneeIds,
      assignee: assigneeIds[0] || null,
      userStatuses,
      status: 'todo',
      dueDate, tags,
      project: req.body.project,
      creator: req.user._id
    });
    await task.populate(POPULATE);

    const assigneeNames = task.assignees.map(a => a.fullName).join(', ') || 'Unassigned';
    await Project.findByIdAndUpdate(req.body.project, {
      $push: { activityLog: { user: req.user._id, action: 'created task', target: title, detail: `Assigned to: ${assigneeNames}` } }
    });

    res.status(201).json({ message: 'Task created', task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// ── GET /api/tasks/:id ───────────────────────────────────────────────────────
router.get('/:id', protect, canAccessTask, async (req, res) => {
  try {
    await req.task.populate([...POPULATE, { path: 'comments.user', select: 'fullName' }]);
    const obj = req.task.toJSON();
    // Attach caller's personal status
    const mine = req.task.userStatuses?.find(us =>
      (us.user?._id || us.user)?.toString() === req.user._id.toString()
    );
    obj.myStatus = mine?.status || null;
    res.json({ task: obj });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch task.' }); }
});

// ── PUT /api/tasks/:id ───────────────────────────────────────────────────────
router.put('/:id', protect, canAccessTask, async (req, res) => {
  try {
    const { title, description, priority, assignees, dueDate, tags, status, userStatus } = req.body;
    const isMember = req.projectMember?.role === 'member' && req.user.role !== 'admin';

    // ── Case 1: Member updating ONLY their own personal status ────────────
    if (userStatus) {
      if (!['todo', 'inprogress', 'done'].includes(userStatus)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }

      const task = req.task;
      const idx = task.userStatuses.findIndex(us =>
        (us.user?._id || us.user)?.toString() === req.user._id.toString()
      );
      if (idx === -1) return res.status(403).json({ error: 'You are not assigned to this task.' });

      task.userStatuses[idx].status = userStatus;
      if (userStatus === 'done') task.userStatuses[idx].completedAt = new Date();
      else task.userStatuses[idx].completedAt = undefined;

      // Recompute aggregate
      task.status = Task.recomputeAggregateStatus(task.userStatuses);
      if (task.status === 'done' && !task.completedAt) task.completedAt = new Date();
      if (task.status !== 'done') task.completedAt = undefined;

      task.markModified('userStatuses');
      await task.save();
      await task.populate(POPULATE);

      await Project.findByIdAndUpdate(task.project._id || task.project, {
        $push: {
          activityLog: {
            user: req.user._id,
            action: 'updated task',
            target: task.title,
            detail: `${req.user.fullName || 'User'} marked as ${userStatus.toUpperCase()}`
          }
        }
      });

      const obj = task.toJSON();
      obj.myStatus = userStatus;
      return res.json({ message: 'Status updated', task: obj });
    }

    // ── Case 2: Member trying to update non-status fields ─────────────────
    if (isMember) {
      return res.status(403).json({ error: 'Members can only update their own task status.' });
    }

    // ── Case 3: Admin / project-admin updating task fields ────────────────
    const updates = {};
    if (title)            updates.title       = title;
    if (description !== undefined) updates.description = description;
    if (priority)         updates.priority    = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;
    if (tags)             updates.tags        = tags;

    // Re-assign: rebuild userStatuses keeping existing statuses for unchanged assignees
    if (assignees !== undefined) {
      const ids = Array.isArray(assignees) ? assignees.filter(Boolean) : (assignees ? [assignees] : []);
      const existingMap = {};
      req.task.userStatuses.forEach(us => {
        existingMap[(us.user?._id || us.user).toString()] = us;
      });
      updates.assignees    = ids;
      updates.assignee     = ids[0] || null;
      updates.userStatuses = ids.map(uid => existingMap[uid.toString()] || { user: uid, status: 'todo' });

      // Recompute aggregate from new userStatuses
      updates.status = Task.recomputeAggregateStatus(updates.userStatuses);
      if (updates.status === 'done') updates.completedAt = new Date();
      else updates.completedAt = null;
    }

    // Admin can also override global status directly (bypasses per-user)
    if (status && !assignees) {
      updates.status = status;
      if (status === 'done') updates.completedAt = new Date();
      else updates.completedAt = null;
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate(POPULATE);

    await Project.findByIdAndUpdate(task.project._id || task.project, {
      $push: { activityLog: { user: req.user._id, action: 'updated task', target: task.title, detail: 'details updated' } }
    });

    res.json({ message: 'Task updated', task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// ── DELETE /api/tasks/:id ────────────────────────────────────────────────────
router.delete('/:id', protect, canAccessTask, async (req, res) => {
  try {
    if (req.projectMember?.role === 'member' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete tasks.' });
    }
    const { title, project } = req.task;
    await Task.findByIdAndDelete(req.params.id);
    await Project.findByIdAndUpdate(project, {
      $push: { activityLog: { user: req.user._id, action: 'deleted task', target: title } }
    });
    res.json({ message: 'Task deleted.' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete task.' }); }
});

// ── POST /api/tasks/:id/comments ─────────────────────────────────────────────
router.post('/:id/comments', protect, canAccessTask, [
  body('text').trim().isLength({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { user: req.user._id, text: req.body.text } } },
      { new: true }
    ).populate('comments.user', 'fullName');
    res.json({ message: 'Comment added', comments: task.comments });
  } catch (err) { res.status(500).json({ error: 'Failed to add comment.' }); }
});

module.exports = router;
