/**
 * Cloudflare Worker: Student Task Management Application
 * 
 * Functions:
 * 1. REST API endpoints for CRUD operations backed by Cloudflare Workers KV (TASKS_KV).
 * 2. Directly serves the modern Web Interface (HTML, CSS, JS) so the entire app
 *    runs serverlessly without needing separate hosting!
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API ROUTES: /api/tasks and /api/tasks/:id
      if (url.pathname.startsWith("/api/tasks")) {
        const idMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
        const taskId = idMatch ? decodeURIComponent(idMatch[1]) : null;

        // GET /api/tasks (list all)
        if (method === "GET" && !taskId) {
          const list = await env.TASKS_KV.list();
          const taskPromises = list.keys.map(async (key) => {
            const val = await env.TASKS_KV.get(key.name, "json");
            return val || { id: key.name, title: "Unknown", status: "Pending", priority: "Medium" };
          });
          const tasks = await Promise.all(taskPromises);
          // Sort newest first
          tasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          return jsonResponse(tasks);
        }

        // POST /api/tasks (create new)
        if (method === "POST" && !taskId) {
          const body = await request.json();
          if (!body.title) {
            return jsonResponse({ error: "Task title is required" }, 400);
          }
          const randomSuffix = Math.floor(100 + Math.random() * 900);
          const newId = body.id || `T${randomSuffix}`;
          const task = {
            id: newId,
            title: body.title,
            priority: body.priority || "Medium",
            status: body.status || "Pending",
            createdAt: new Date().toISOString(),
          };
          await env.TASKS_KV.put(newId, JSON.stringify(task));
          return jsonResponse(task, 201);
        }

        // GET /api/tasks/:id (get single)
        if (method === "GET" && taskId) {
          const task = await env.TASKS_KV.get(taskId, "json");
          if (!task) {
            return jsonResponse({ error: "Task not found" }, 404);
          }
          return jsonResponse(task);
        }

        // PUT /api/tasks/:id (update)
        if (method === "PUT" && taskId) {
          const existing = await env.TASKS_KV.get(taskId, "json");
          if (!existing) {
            return jsonResponse({ error: "Task not found" }, 404);
          }
          const body = await request.json();
          const updated = {
            ...existing,
            title: body.title !== undefined ? body.title : existing.title,
            priority: body.priority !== undefined ? body.priority : existing.priority,
            status: body.status !== undefined ? body.status : existing.status,
            updatedAt: new Date().toISOString(),
          };
          await env.TASKS_KV.put(taskId, JSON.stringify(updated));
          return jsonResponse(updated);
        }

        // DELETE /api/tasks/:id (delete)
        if (method === "DELETE" && taskId) {
          const existing = await env.TASKS_KV.get(taskId);
          if (!existing) {
            return jsonResponse({ error: "Task not found" }, 404);
          }
          await env.TASKS_KV.delete(taskId);
          return jsonResponse({ message: `Task ${taskId} successfully deleted`, id: taskId });
        }

        return jsonResponse({ error: "Endpoint not found" }, 404);
      }

      // STATIC ASSET ROUTES (Serve Embedded UI)
      if (url.pathname === "/style.css") {
        return new Response(STYLE_CSS, {
          headers: { "Content-Type": "text/css; charset=utf-8", ...corsHeaders },
        });
      }

      if (url.pathname === "/script.js") {
        return new Response(SCRIPT_JS, {
          headers: { "Content-Type": "application/javascript; charset=utf-8", ...corsHeaders },
        });
      }

      // Default: Serve HTML for / or any non-API route
      return new Response(INDEX_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
      });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  },
};

// Embedded Web Application Frontend
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Task Manager</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="header-content">
        <h1>🎓 Student Task Manager</h1>
        <p class="subtitle">Automated Serverless Infrastructure via Terraform on Cloudflare Workers &amp; KV</p>
      </div>
      <div class="stats-bar" id="statsBar">
        <div class="stat-pill">Total: <span id="statTotal">0</span></div>
        <div class="stat-pill pending">Pending: <span id="statPending">0</span></div>
        <div class="stat-pill completed">Completed: <span id="statCompleted">0</span></div>
      </div>
    </header>

    <main class="main-content">
      <section class="card form-card">
        <h2>➕ Create New Task</h2>
        <form id="taskForm">
          <div class="form-group">
            <label for="taskTitle">Task Title</label>
            <input type="text" id="taskTitle" placeholder="e.g. Complete Cloud Computing Assignment" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="taskPriority">Priority</label>
              <select id="taskPriority">
                <option value="High">High</option>
                <option value="Medium" selected>Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div class="form-group">
              <label for="taskStatus">Status</label>
              <select id="taskStatus">
                <option value="Pending" selected>Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" id="submitBtn">Add Task</button>
        </form>
      </section>

      <section class="toolbar">
        <input type="text" id="searchInput" placeholder="🔍 Search tasks by title or ID..." class="search-input">
        <div class="filter-group">
          <select id="filterPriority" class="filter-select">
            <option value="ALL">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select id="filterStatus" class="filter-select">
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </section>

      <section class="card table-card">
        <div class="card-header">
          <h2>📋 Academic Tasks</h2>
          <button class="btn btn-secondary btn-sm" id="refreshBtn">🔄 Refresh</button>
        </div>
        <div class="table-responsive">
          <table class="task-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Task Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="taskTableBody">
              <tr>
                <td colspan="6" class="text-center text-muted">Loading tasks from Workers KV...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>Mini Project: Infrastructure as Code (IaC) &bull; Cloudflare Workers &bull; Workers KV &bull; Terraform</p>
    </footer>
  </div>

  <div id="toast" class="toast"></div>

  <script src="/script.js"></script>
</body>
</html>`;

const STYLE_CSS = `:root {
  --primary: #f6821f;
  --primary-hover: #e06f10;
  --bg-gradient: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  --card-bg: #ffffff;
  --text-main: #1e293b;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
  --badge-high: #ef4444;
  --badge-medium: #f59e0b;
  --badge-low: #10b981;
  --status-pending: #f59e0b;
  --status-progress: #3b82f6;
  --status-completed: #10b981;
  --radius: 10px;
}
* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
body { background: #f1f5f9; color: var(--text-main); min-height: 100vh; padding: 24px; }
.container { max-width: 1000px; margin: 0 auto; }
.header { background: var(--bg-gradient); color: #fff; padding: 28px; border-radius: var(--radius); margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.header h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 6px; }
.subtitle { color: #cbd5e1; font-size: 0.9rem; }
.stats-bar { display: flex; gap: 10px; }
.stat-pill { background: rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
.stat-pill.pending span { color: #fde047; }
.stat-pill.completed span { color: #86efac; }
.card { background: var(--card-bg); border-radius: var(--radius); padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid var(--border-color); }
.form-card h2 { font-size: 1.2rem; margin-bottom: 16px; }
.form-group { margin-bottom: 16px; flex: 1; }
.form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
.form-group input, .form-group select { width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.95rem; outline: none; }
.form-group input:focus, .form-group select:focus { border-color: var(--primary); }
.form-row { display: flex; gap: 16px; }
.btn { padding: 10px 20px; border: none; border-radius: 6px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.1s; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-secondary { background: #e2e8f0; color: var(--text-main); }
.btn-secondary:hover { background: #cbd5e1; }
.btn-sm { padding: 6px 12px; font-size: 0.8rem; }
.btn-danger { background: #fee2e2; color: #dc2626; }
.btn-danger:hover { background: #fecaca; }
.btn-action { background: #e0f2fe; color: #0284c7; }
.btn-action:hover { background: #bae6fd; }
.toolbar { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
.search-input { flex: 2; min-width: 200px; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; background: #fff; }
.filter-group { display: flex; gap: 10px; flex: 1; }
.filter-select { padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: #fff; font-size: 0.85rem; flex: 1; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.table-responsive { overflow-x: auto; }
.task-table { width: 100%; border-collapse: collapse; text-align: left; }
.task-table th, .task-table td { padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; }
.task-table th { background: #f8fafc; color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; }
.badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.priority-high { background: #fee2e2; color: var(--badge-high); }
.priority-medium { background: #fef3c7; color: var(--badge-medium); }
.priority-low { background: #d1fae5; color: var(--badge-low); }
.status-pending { background: #fef3c7; color: var(--status-pending); }
.status-in-progress { background: #dbeafe; color: var(--status-progress); }
.status-completed { background: #d1fae5; color: var(--status-completed); }
.actions-cell { display: flex; gap: 6px; }
.text-center { text-align: center; }
.text-muted { color: var(--text-muted); }
.footer { text-align: center; margin-top: 32px; color: var(--text-muted); font-size: 0.85rem; }
.toast { position: fixed; bottom: 24px; right: 24px; background: #1e293b; color: #fff; padding: 12px 20px; border-radius: 6px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); font-size: 0.9rem; opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 100; }
.toast.show { opacity: 1; }
@media (max-width: 768px) { .form-row, .toolbar { flex-direction: column; } }`;

const SCRIPT_JS = `let tasks = [];
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskPriority = document.getElementById("taskPriority");
const taskStatus = document.getElementById("taskStatus");
const taskTableBody = document.getElementById("taskTableBody");
const searchInput = document.getElementById("searchInput");
const filterPriority = document.getElementById("filterPriority");
const filterStatus = document.getElementById("filterStatus");
const refreshBtn = document.getElementById("refreshBtn");
const statTotal = document.getElementById("statTotal");
const statPending = document.getElementById("statPending");
const statCompleted = document.getElementById("statCompleted");
const toast = document.getElementById("toast");

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

async function loadTasks() {
  try {
    const res = await fetch("/api/tasks");
    if (!res.ok) throw new Error("Failed to load tasks");
    tasks = await res.json();
    renderTasks();
    updateStats();
  } catch (err) {
    taskTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="color: #ef4444;">Error: ' + err.message + '</td></tr>';
  }
}

function renderTasks() {
  const q = searchInput.value.trim().toLowerCase();
  const pf = filterPriority.value;
  const sf = filterStatus.value;
  const filtered = tasks.filter(t => {
    const mQ = (t.title && t.title.toLowerCase().includes(q)) || (t.id && t.id.toLowerCase().includes(q));
    const mP = pf === "ALL" || t.priority === pf;
    const mS = sf === "ALL" || t.status === sf;
    return mQ && mP && mS;
  });

  if (filtered.length === 0) {
    taskTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No tasks found.</td></tr>';
    return;
  }

  taskTableBody.innerHTML = filtered.map(t => {
    const pCls = t.priority === "High" ? "priority-high" : t.priority === "Medium" ? "priority-medium" : "priority-low";
    const sCls = t.status === "Completed" ? "status-completed" : t.status === "In Progress" ? "status-in-progress" : "status-pending";
    const dt = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "N/A";
    return '<tr>' +
      '<td><strong>' + escapeHtml(t.id) + '</strong></td>' +
      '<td>' + escapeHtml(t.title) + '</td>' +
      '<td><span class="badge ' + pCls + '">' + escapeHtml(t.priority) + '</span></td>' +
      '<td><span class="badge ' + sCls + '">' + escapeHtml(t.status) + '</span></td>' +
      '<td class="text-muted" style="font-size: 0.8rem;">' + dt + '</td>' +
      '<td class="actions-cell">' +
        '<button class="btn btn-action btn-sm" onclick="toggleTaskStatus(\\'' + t.id + '\\', \\'' + t.status + '\\')">' +
          (t.status === "Completed" ? "↩ Reopen" : "✔ Done") +
        '</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteTask(\\'' + t.id + '\\')">🗑 Delete</button>' +
      '</td>' +
    '</tr>';
  }).join("");
}

function updateStats() {
  statTotal.textContent = tasks.length;
  statPending.textContent = tasks.filter(t => t.status !== "Completed").length;
  statCompleted.textContent = tasks.filter(t => t.status === "Completed").length;
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = taskTitle.value.trim();
  const priority = taskPriority.value;
  const status = taskStatus.value;
  if (!title) return;
  try {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority, status })
    });
    if (!res.ok) throw new Error("Failed to create task");
    const newTask = await res.json();
    tasks.unshift(newTask);
    taskTitle.value = "";
    renderTasks();
    updateStats();
    showToast("Task " + newTask.id + " created!");
  } catch (err) {
    showToast("Error: " + err.message);
  }
});

window.toggleTaskStatus = async function(id, cur) {
  const next = cur === "Completed" ? "Pending" : "Completed";
  try {
    const res = await fetch("/api/tasks/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next })
    });
    if (!res.ok) throw new Error("Update failed");
    const updated = await res.json();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) tasks[idx] = updated;
    renderTasks();
    updateStats();
    showToast("Task " + id + " updated to " + next);
  } catch (err) {
    showToast("Error: " + err.message);
  }
};

window.deleteTask = async function(id) {
  if (!confirm("Are you sure you want to delete task " + id + "?")) return;
  try {
    const res = await fetch("/api/tasks/" + id, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
    updateStats();
    showToast("Task " + id + " deleted!");
  } catch (err) {
    showToast("Error: " + err.message);
  }
};

searchInput.addEventListener("input", renderTasks);
filterPriority.addEventListener("change", renderTasks);
filterStatus.addEventListener("change", renderTasks);
refreshBtn.addEventListener("click", () => { loadTasks(); showToast("Refreshed!"); });
loadTasks();`;
