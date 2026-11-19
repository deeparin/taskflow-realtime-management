
import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

const initialForm = {
  title: '',
  description: '',
  status: 'TODO',
};

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [token, setToken] = useState(
    () => localStorage.getItem('taskflow_token') || ''
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('taskflow_user') || 'null'
      );
    } catch {
      return null;
    }
  });

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [socketStatus, setSocketStatus] = useState('Disconnected');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  // -------------------------
  // Authentication
  // -------------------------

  async function handleAuth(event) {
    event.preventDefault();

    setLoading(true);
    setError('');
    setMessage('');

    const isRegister = authMode === 'register';

    try {
      const response = await fetch(
        `${API_URL}/auth/${authMode}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            isRegister
              ? { name, email, password }
              : { email, password }
          ),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Authentication failed');
      }

      if (isRegister) {
        setMessage('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
        setAuthMode('login');
        setPassword('');
      } else {
        const { user: loggedInUser, token: accessToken } =
          result.data;

        if (!accessToken || !loggedInUser) {
          throw new Error('Invalid login response');
        }

        localStorage.setItem('taskflow_token', accessToken);
        localStorage.setItem(
          'taskflow_user',
          JSON.stringify(loggedInUser)
        );

        setToken(accessToken);
        setUser(loggedInUser);
        setPassword('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');

    setToken('');
    setUser(null);
    setTasks([]);
    setPassword('');
    setError('');
    setMessage('');
    closeForm();
  }

  // -------------------------
  // Read Tasks
  // -------------------------

  const fetchTasks = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to load tasks');
      }

      if (!Array.isArray(result.data)) {
        throw new Error('Invalid task response');
      }

      setTasks(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // -------------------------
  // Socket.IO
  // -------------------------

  useEffect(() => {
    if (!token) {
      setSocketStatus('Disconnected');
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
    });

    socket.on('connect', () => {
      setSocketStatus('Connected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection failed:', err.message);
      setSocketStatus('Connection failed');
    });

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
    });

    socket.on('task:created', (newTask) => {
      setTasks((current) => {
        if (current.some((task) => task.id === newTask.id)) {
          return current;
        }

        return [...current, newTask];
      });
    });

    socket.on('task:updated', (updatedTask) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === updatedTask.id ? updatedTask : task
        )
      );
    });

    socket.on('task:deleted', ({ id }) => {
      setTasks((current) =>
        current.filter((task) => task.id !== id)
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // -------------------------
  // Form
  // -------------------------

  function openCreateForm() {
    setEditingId(null);
    setForm(initialForm);
    setError('');
    setShowForm(true);
  }

  function openEditForm(task) {
    setEditingId(task.id);

    setForm({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'TODO',
    });

    setError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // -------------------------
  // Create / Update Task
  // -------------------------

  async function handleSubmitTask(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError('กรุณากรอก Task Title');
      return;
    }

    setSaving(true);
    setError('');

    const isEditing = editingId !== null;

    const endpoint = isEditing
      ? `${API_URL}/tasks/${editingId}`
      : `${API_URL}/tasks`;

    try {
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          status: form.status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Unable to save task');
      }

      const savedTask = result.data;

      if (!savedTask || savedTask.id === undefined) {
        throw new Error('Invalid task response from server');
      }

      // Update local state immediately.
      // Socket event may also arrive; updates are idempotent.
      setTasks((current) => {
        if (isEditing) {
          return current.map((task) =>
            task.id === savedTask.id ? savedTask : task
          );
        }

        if (current.some((task) => task.id === savedTask.id)) {
          return current;
        }

        return [...current, savedTask];
      });

      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // -------------------------
  // Delete Task
  // -------------------------

  async function handleDeleteTask(id) {
    const confirmed = window.confirm(
      'คุณต้องการลบ Task นี้ใช่หรือไม่?'
    );

    if (!confirmed) return;

    setError('');

    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Unable to delete task');
      }

      setTasks((current) =>
        current.filter((task) => task.id !== id)
      );
    } catch (err) {
      setError(err.message);
    }
  }

  // -------------------------
  // Login / Register Screen
  // -------------------------

  if (!token) {
    return (
      <main className="auth-container">
        <section className="auth-card">
          <div className="auth-header">
            <h1>TaskFlow</h1>
            <p>Realtime Task Management System</p>
          </div>

          <div className="auth-tabs">
            <button
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => {
                setAuthMode('login');
                setError('');
                setMessage('');
              }}
            >
              Login
            </button>

            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => {
                setAuthMode('register');
                setError('');
                setMessage('');
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth}>
            {authMode === 'register' && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <button className="submit-button" disabled={loading}>
              {loading
                ? 'Please wait...'
                : authMode === 'register'
                  ? 'Create Account'
                  : 'Login'}
            </button>
          </form>

          <button
            className="switch-link"
            onClick={() =>
              setAuthMode(
                authMode === 'login' ? 'register' : 'login'
              )
            }
          >
            {authMode === 'login'
              ? 'Create an account'
              : 'Login here'}
          </button>
        </section>
      </main>
    );
  }

  // -------------------------
  // Task Dashboard
  // -------------------------

  return (
    <main className="container">
      <header className="dashboard-header">
        <div>
          <h1>TaskFlow</h1>
          <p>Welcome, {user?.name || user?.email || 'User'}</p>

          <span
            className={`socket-status ${
              socketStatus === 'Connected' ? 'online' : ''
            }`}
          >
            Socket: {socketStatus}
          </span>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <section className="panel">
        <div className="task-heading">
          <div>
            <h2>My Tasks</h2>
            <span>{tasks.length} tasks</span>
          </div>

          <button className="add-button" onClick={openCreateForm}>
            + Add Task
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <p>Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="empty-message">No tasks found. Create your first task!</p>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div className="task-info">
                  <h3>{task.title}</h3>
                  <p>{task.description || 'No description'}</p>
                  <span className="status">{task.status}</span>
                </div>

                <div className="task-actions">
                  <button
                    className="edit-button"
                    onClick={() => openEditForm(task)}
                  >
                    Edit
                  </button>

                  <button
                    className="delete-button"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="modal-overlay">
          <section className="task-modal">
            <div className="modal-header">
              <h2>{editingId !== null ? 'Edit Task' : 'Create Task'}</h2>

              <button
                className="close-button"
                onClick={closeForm}
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitTask}>
              <div className="form-group">
                <label>Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Enter task description"
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingId !== null
                      ? 'Save Changes'
                      : 'Create Task'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
