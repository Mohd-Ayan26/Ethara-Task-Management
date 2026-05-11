const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  target: { type: String, default: '' },
  detail: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [3, 'Project name must be at least 3 characters'],
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  color: {
    type: String,
    default: '#00f5ff'
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'completed'],
    default: 'active'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  activityLog: [activitySchema],
  dueDate: { type: Date },
  tags: [{ type: String, trim: true }]
}, { timestamps: true });

// Ensure creator is always a member with admin role
projectSchema.pre('save', function(next) {
  const creatorExists = this.members.some(
    m => m.user.toString() === this.creator.toString()
  );
  if (!creatorExists) {
    this.members.push({ user: this.creator, role: 'admin' });
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
