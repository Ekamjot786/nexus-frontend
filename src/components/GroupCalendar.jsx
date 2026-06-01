import { useState, useEffect } from 'react';
import axios from 'axios';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function GroupCalendar({ conversationId, members, onClose }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', due_date: '', assigned_to: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTasks(); }, [conversationId]);

  const loadTasks = async () => {
    try {
      const { data } = await axios.get(`/api/conversations/${conversationId}/tasks/`);
      setTasks(data);
    } catch {}
  };

  const addTask = async () => {
    if (!form.title || !form.due_date) return;
    setSaving(true);
    try {
      await axios.post(`/api/conversations/${conversationId}/tasks/create/`, form);
      setForm({ title: '', due_date: '', assigned_to: [] });
      setShowForm(false);
      loadTasks();
    } catch {}
    setSaving(false);
  };

  const deleteTask = async (id) => {
    await axios.delete(`/api/conversations/tasks/${id}/`);
    loadTasks();
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const tasksOnDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.due_date === dateStr);
  };

  const tasksForSelected = selectedDate ? tasksOnDate(selectedDate) : [];

  const toggleAssign = (id) => {
    setForm(f => ({
      ...f,
      assigned_to: f.assigned_to.includes(id)
        ? f.assigned_to.filter(x => x !== id)
        : [...f.assigned_to, id]
    }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1e1f22', borderRadius: 16, padding: 28, width: 640, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 18 }}>📅 Group Calendar</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ background: '#2d2f34', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>‹</button>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} style={{ background: '#2d2f34', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, color: '#888', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1;
            const dayTasks = tasksOnDate(day);
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = selectedDate === day;
            return (
              <div key={day} onClick={() => setSelectedDate(isSelected ? null : day)} style={{
                minHeight: 52, borderRadius: 8, padding: '4px 6px', cursor: 'pointer',
                background: isSelected ? '#5865f2' : isToday ? '#2d2f34' : '#25262b',
                border: isToday && !isSelected ? '1px solid #5865f2' : '1px solid transparent',
              }}>
                <div style={{ fontSize: 12, color: isSelected ? '#fff' : isToday ? '#5865f2' : '#aaa', fontWeight: isToday ? 700 : 400 }}>{day}</div>
                {dayTasks.slice(0, 2).map(t => (
                  <div key={t.id} style={{ fontSize: 10, background: '#7c3aed', borderRadius: 3, padding: '1px 4px', marginTop: 2, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 2 && <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>+{dayTasks.length - 2} more</div>}
              </div>
            );
          })}
        </div>

        {/* Selected day tasks */}
        {selectedDate && (
          <div style={{ marginTop: 20, borderTop: '1px solid #2d2f34', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>
                {MONTHS[month]} {selectedDate} — {tasksForSelected.length} task{tasksForSelected.length !== 1 ? 's' : ''}
              </span>
              <button onClick={() => { setForm(f => ({ ...f, due_date: `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDate).padStart(2,'0')}` })); setShowForm(true); }}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer' }}>
                + Add Task
              </button>
            </div>
            {tasksForSelected.length === 0 && <div style={{ color: '#555', fontSize: 13 }}>No tasks for this day.</div>}
            {tasksForSelected.map(t => (
              <div key={t.id} style={{ background: '#25262b', borderRadius: 8, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                  {t.assigned_to.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {t.assigned_to.map(u => (
                        <span key={u.id} style={{ fontSize: 11, background: u.color || '#5865f2', color: '#fff', borderRadius: 4, padding: '2px 7px' }}>{u.username}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Added by {t.created_by}</div>
                </div>
                <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', color: '#ed4245', cursor: 'pointer', fontSize: 16 }}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {/* Add task form */}
        {showForm && (
          <div style={{ marginTop: 16, background: '#25262b', borderRadius: 12, padding: 16 }}>
            <h4 style={{ margin: '0 0 12px', color: '#fff' }}>New Task</h4>
            <input
              placeholder="Task title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ width: '100%', background: '#1e1f22', border: '1px solid #3d3f44', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
            />
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              style={{ width: '100%', background: '#1e1f22', border: '1px solid #3d3f44', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
            />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Assign to:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {members.map(m => (
                  <button key={m.id} onClick={() => toggleAssign(m.id)} style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: form.assigned_to.includes(m.id) ? (m.color || '#5865f2') : '#2d2f34',
                    color: '#fff'
                  }}>{m.username}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addTask} disabled={saving || !form.title || !form.due_date} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? 'Saving...' : 'Add Task'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#2d2f34', color: '#888', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add task button when no date selected */}
        {!selectedDate && !showForm && (
          <button onClick={() => setShowForm(true)} style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 8, border: '1px dashed #3d3f44', background: 'none', color: '#888', cursor: 'pointer', fontSize: 14 }}>
            + Add Task
          </button>
        )}
      </div>
    </div>
  );
}
