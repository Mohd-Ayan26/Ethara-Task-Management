const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

// Per-user status instance — each assignee gets their own row
const userStatusSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:      { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
  completedAt: { type: Date }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: {
    type: String, required: true, trim: true,
    minlength: 3, maxlength: 150
  },
  description: {
    type: String, trim: true, maxlength: 1000, default: ''
  },
  priority: {
    type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true
  },

  // ── Multi-assignee: each gets their own status ─────────────────────────
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  userStatuses: [userStatusSchema],   // one entry per assignee

  // ── Aggregate / fallback status (admin-visible overall state) ──────────
  // 'done' only when ALL assignees are done; 'inprogress' if any; else 'todo'
  status: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
  completedAt: { type: Date },

  // legacy compat
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  dueDate:  { type: Date },
  tags:     [{ type: String, trim: true }],
  comments: [commentSchema],
  order:    { type: Number, default: 0 }
}, { timestamps: true });

// ── Helpers ──────────────────────────────────────────────────────────────────
function recomputeAggregateStatus(userStatuses) {
  if (!userStatuses || userStatuses.length === 0) return 'todo';
  const statuses = userStatuses.map(u => u.status);
  if (statuses.every(s => s === 'done'))       return 'done';
  if (statuses.some(s => s === 'inprogress' || s === 'done')) return 'inprogress';
  return 'todo';
}

// When assignees change, reconcile userStatuses (add new entries, drop removed)
taskSchema.pre('save', function (next) {
  if (this.isModified('assignees')) {
    const existingMap = {};
    (this.userStatuses || []).forEach(us => {
      existingMap[us.user.toString()] = us;
    });

    this.userStatuses = (this.assignees || []).map(uid => {
      const key = uid.toString();
      return existingMap[key] || { user: uid, status: 'todo' };
    });

    // Sync legacy field
    this.assignee = this.assignees.length > 0 ? this.assignees[0] : null;
  }

  // Recompute aggregate status whenever userStatuses change
  if (this.isModified('userStatuses') || this.isModified('assignees')) {
    this.status = recomputeAggregateStatus(this.userStatuses);
    if (this.status === 'done' && !this.completedAt) this.completedAt = new Date();
    if (this.status !== 'done') this.completedAt = undefined;
  }

  next();
});

taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.status === 'done') return false;
  return new Date() > new Date(this.dueDate);
});

taskSchema.set('toJSON', { virtuals: true });

// Static helper used by routes
taskSchema.statics.recomputeAggregateStatus = recomputeAggregateStatus;

module.exports = mongoose.model('Task', taskSchema);
