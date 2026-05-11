import { useState, useEffect, useRef } from 'react';
import { Flag, Calendar, Users, AlignLeft, Type, ChevronDown, Check, X } from 'lucide-react';

const PRIORITIES = [
  { value: 'low',      label: 'LOW',      color: '#00ff41' },
  { value: 'medium',   label: 'MEDIUM',   color: '#ffea00' },
  { value: 'high',     label: 'HIGH',     color: '#ff6b00' },
  { value: 'critical', label: 'CRITICAL', color: '#ff0090' }
];

const STATUSES = [
  { value: 'todo',       label: 'TO DO',       color: '#7ab8d4' },
  { value: 'inprogress', label: 'IN PROGRESS', color: '#00f5ff' },
  { value: 'done',       label: 'DONE',        color: '#00ff41' }
];

// ── Multi-user dropdown ──────────────────────────────────────────────────────
function AssigneeDropdown({ members, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Normalise members to { id, name } shape (handles both project-member format and raw user format)
  const options = members.map(m => ({
    id: m.user?._id || m._id,
    name: m.user?.fullName || m.fullName || 'Unknown'
  })).filter(o => o.id);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const allSelected = options.length > 0 && options.every(o => selected.includes(o.id));

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : options.map(o => o.id));
  };

  const selectedNames = selected
    .map(id => options.find(o => o.id === id)?.name)
    .filter(Boolean);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '10px 14px',
          background: 'rgba(0,245,255,0.03)', border: `1px solid ${open ? 'var(--neon-cyan)' : 'var(--border-dim)'}`,
          borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)', fontSize: '14px', transition: 'all 0.2s',
          boxShadow: open ? '0 0 0 2px rgba(0,245,255,0.1)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <Users size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          {selected.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>Select assignees…</span>
          ) : (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {selectedNames.slice(0, 3).map(name => (
                <span key={name} style={{
                  background: 'rgba(0,245,255,0.12)', border: '1px solid rgba(0,245,255,0.3)',
                  borderRadius: 3, padding: '1px 6px',
                  fontFamily: 'var(--font-display)', fontSize: '9px',
                  color: 'var(--neon-cyan)', letterSpacing: '0.5px'
                }}>
                  {name.split(' ')[0]}
                </span>
              ))}
              {selectedNames.length > 3 && (
                <span style={{
                  background: 'rgba(0,245,255,0.08)', borderRadius: 3, padding: '1px 6px',
                  fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)'
                }}>+{selectedNames.length - 3}</span>
              )}
            </div>
          )}
        </div>
        <ChevronDown size={13} color="var(--text-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(0,245,255,0.08)',
          overflow: 'hidden'
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-dim)' }}>
            <input
              autoFocus
              className="cyber-input"
              style={{ fontSize: '13px', padding: '7px 10px' }}
              placeholder="Search operatives…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Select All */}
          <button
            type="button"
            onClick={toggleAll}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: allSelected ? 'rgba(0,245,255,0.06)' : 'transparent',
              border: 'none', borderBottom: '1px solid var(--border-dim)',
              cursor: 'pointer', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = allSelected ? 'rgba(0,245,255,0.06)' : 'transparent'}
          >
            {/* Checkbox */}
            <div style={{
              width: 16, height: 16, borderRadius: 3,
              border: `1.5px solid ${allSelected ? 'var(--neon-cyan)' : 'var(--border-glow)'}`,
              background: allSelected ? 'var(--neon-cyan)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'all 0.15s'
            }}>
              {allSelected && <Check size={10} color="var(--bg-void)" strokeWidth={3} />}
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1.5px', color: 'var(--neon-cyan)' }}>
              SELECT ALL ({options.length})
            </span>
          </button>

          {/* Member list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                No operatives found
              </div>
            ) : (
              filtered.map(opt => {
                const isChecked = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', background: isChecked ? 'rgba(0,245,255,0.06)' : 'transparent',
                      border: 'none', cursor: 'pointer', transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = 'rgba(0,245,255,0.03)'; }}
                    onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                      border: `1.5px solid ${isChecked ? 'var(--neon-cyan)' : 'var(--border-glow)'}`,
                      background: isChecked ? 'var(--neon-cyan)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}>
                      {isChecked && <Check size={10} color="var(--bg-void)" strokeWidth={3} />}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: isChecked
                        ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))'
                        : 'linear-gradient(135deg, #1a3a5c, #0d2240)',
                      border: `1px solid ${isChecked ? 'var(--neon-cyan)' : 'var(--border-dim)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                      color: isChecked ? 'var(--bg-void)' : 'var(--text-secondary)',
                      transition: 'all 0.15s'
                    }}>
                      {opt.name[0]?.toUpperCase()}
                    </div>

                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '14px',
                      color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isChecked ? 600 : 400
                    }}>
                      {opt.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with selected count & clear */}
          {selected.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 14px', borderTop: '1px solid var(--border-dim)',
              background: 'rgba(0,245,255,0.02)'
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--neon-cyan)' }}>
                {selected.length} operative{selected.length > 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--neon-pink)', fontFamily: 'var(--font-display)',
                  fontSize: '9px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <X size={10} /> CLEAR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main TaskForm ────────────────────────────────────────────────────────────
export default function TaskForm({ onSubmit, members = [], initialData = {}, loading = false, submitLabel = 'CREATE TASK', isAdmin = false }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignees: [],
    dueDate: '',
    ...initialData,
    // normalise legacy assignee string into array
    assignees: initialData.assignees
      ? (Array.isArray(initialData.assignees)
          ? initialData.assignees.map(a => a?._id || a).filter(Boolean)
          : [initialData.assignees?._id || initialData.assignees].filter(Boolean))
      : []
  });

  useEffect(() => {
    const raw = initialData.assignees;
    const ids = raw
      ? (Array.isArray(raw) ? raw.map(a => a?._id || a).filter(Boolean) : [raw?._id || raw].filter(Boolean))
      : [];
    setForm({
      title: '', description: '', status: 'todo', priority: 'medium', dueDate: '',
      ...initialData,
      assignees: ids
    });
  }, [JSON.stringify(initialData)]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form });
  };

  const Label = ({ children }) => (
    <label style={{
      fontFamily: 'var(--font-display)', fontSize: '10px',
      color: 'var(--neon-cyan)', letterSpacing: '2px',
      display: 'block', marginBottom: 8
    }}>
      {children}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Title */}
      <div>
        <Label>TASK TITLE *</Label>
        <div style={{ position: 'relative' }}>
          <Type size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="cyber-input" style={{ paddingLeft: 34 }} placeholder="Describe the mission…"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </div>
      </div>

      {/* Description */}
      <div>
        <Label>DESCRIPTION</Label>
        <div style={{ position: 'relative' }}>
          <AlignLeft size={13} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <textarea className="cyber-input" style={{ paddingLeft: 34, resize: 'vertical', minHeight: 80 }}
            placeholder="Operational details…" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
        </div>
      </div>

      {/* Priority */}
      <div>
        <Label>PRIORITY LEVEL</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {PRIORITIES.map(p => (
            <button key={p.value} type="button" onClick={() => setForm(f => ({ ...f, priority: p.value }))} style={{
              padding: '8px 4px', textAlign: 'center',
              background: form.priority === p.value ? `${p.color}18` : 'transparent',
              border: `1px solid ${form.priority === p.value ? p.color : 'var(--border-dim)'}`,
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '1px',
              color: form.priority === p.value ? p.color : 'var(--text-muted)', transition: 'all 0.15s'
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <Label>STATUS</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {STATUSES.map(s => (
            <button key={s.value} type="button" onClick={() => setForm(f => ({ ...f, status: s.value }))} style={{
              padding: '8px 4px', textAlign: 'center',
              background: form.status === s.value ? `${s.color}18` : 'transparent',
              border: `1px solid ${form.status === s.value ? s.color : 'var(--border-dim)'}`,
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '1px',
              color: form.status === s.value ? s.color : 'var(--text-muted)', transition: 'all 0.15s'
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-assignee */}
      {members.length > 0 && (
        <div>
          <Label>ASSIGN OPERATIVES</Label>
          <AssigneeDropdown
            members={members}
            selected={form.assignees}
            onChange={ids => setForm(f => ({ ...f, assignees: ids }))}
          />
        </div>
      )}

      {/* Due Date */}
      <div>
        <Label>DUE DATE</Label>
        <div style={{ position: 'relative' }}>
          <Calendar size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="date" className="cyber-input" style={{ paddingLeft: 34 }}
            value={form.dueDate ? form.dueDate.split('T')[0] : ''}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading} style={{
        marginTop: 4, padding: '13px',
        background: loading ? 'rgba(0,245,255,0.2)' : 'var(--neon-cyan)',
        border: 'none', borderRadius: 'var(--radius-sm)',
        color: 'var(--bg-void)', fontFamily: 'var(--font-display)',
        fontSize: '11px', fontWeight: 700, letterSpacing: '2px',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: loading ? 'none' : '0 0 20px rgba(0,245,255,0.3)',
        transition: 'all 0.2s'
      }}>
        {loading ? 'PROCESSING…' : submitLabel}
      </button>
    </form>
  );
}
