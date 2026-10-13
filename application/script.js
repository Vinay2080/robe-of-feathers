let tasks = [];

// DOM Elements
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

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Fetch all tasks
async function loadTasks() {
  try {
    const res = await fetch("/api/tasks");
    if (!res.ok) throw new Error("Failed to load tasks");
    tasks = await res.json();
    renderTasks();
    updateStats();
  } catch (err) {
    console.error("Error loading tasks:", err);
    taskTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="color: #ef4444;">Error loading tasks: ${err.message}</td></tr>`;
  }
}

// Render tasks with filtering
function renderTasks() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const priorityFilter = filterPriority.value;
  const statusFilter = filterStatus.value;

  const filtered = tasks.filter(t => {
    const matchSearch = (t.title && t.title.toLowerCase().includes(searchTerm)) ||
                        (t.id && t.id.toLowerCase().includes(searchTerm));
    const matchPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchSearch && matchPriority && matchStatus;
  });

  if (filtered.length === 0) {
    taskTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No tasks found.</td></tr>`;
    return;
  }

  taskTableBody.innerHTML = filtered.map(t => {
    const priorityClass = t.priority === "High" ? "priority-high" : t.priority === "Medium" ? "priority-medium" : "priority-low";
    const statusClass = t.status === "Completed" ? "status-completed" : t.status === "In Progress" ? "status-in-progress" : "status-pending";
    const dateFormatted = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "N/A";

    return `
      <tr>
        <td><strong>${escapeHtml(t.id)}</strong></td>
        <td>${escapeHtml(t.title)}</td>
        <td><span class="badge ${priorityClass}">${escapeHtml(t.priority)}</span></td>
        <td><span class="badge ${statusClass}">${escapeHtml(t.status)}</span></td>
        <td class="text-muted" style="font-size: 0.8rem;">${dateFormatted}</td>
        <td class="actions-cell">
          <button class="btn btn-action btn-sm" onclick="toggleTaskStatus('${t.id}', '${t.status}')">
            ${t.status === "Completed" ? "↩ Reopen" : "✔ Done"}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">
            🗑 Delete
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function updateStats() {
  statTotal.textContent = tasks.length;
  statPending.textContent = tasks.filter(t => t.status !== "Completed").length;
  statCompleted.textContent = tasks.filter(t => t.status === "Completed").length;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Add task
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
    showToast(`Task ${newTask.id} created successfully!`);
  } catch (err) {
    showToast("Error creating task: " + err.message);
  }
});

// Toggle / Update task status
window.toggleTaskStatus = async function(id, currentStatus) {
  const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error("Failed to update status");
    const updated = await res.json();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      tasks[idx] = updated;
    }
    renderTasks();
    updateStats();
    showToast(`Task ${id} updated to ${newStatus}!`);
  } catch (err) {
    showToast("Error updating task: " + err.message);
  }
};

// Delete task
window.deleteTask = async function(id) {
  if (!confirm(`Are you sure you want to delete task ${id}?`)) return;

  try {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete task");
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
    updateStats();
    showToast(`Task ${id} deleted successfully!`);
  } catch (err) {
    showToast("Error deleting task: " + err.message);
  }
};

// Event Listeners for Filters
searchInput.addEventListener("input", renderTasks);
filterPriority.addEventListener("change", renderTasks);
filterStatus.addEventListener("change", renderTasks);
refreshBtn.addEventListener("click", () => {
  loadTasks();
  showToast("Tasks refreshed!");
});

// Initial load
loadTasks();
