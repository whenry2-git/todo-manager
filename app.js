(() => {
  "use strict";

  const STORAGE_KEY = "todo-manager-v1";
  const TIME_OPTIONS = [0, ...Array.from({ length: 24 }, (_, i) => (i + 1) * 0.5)];

  let state = loadState();
  let activeFilter = "all";
  let searchTerm = "";
  let sortMode = "priority";

  const $ = id => document.getElementById(id);
  const tasksEl = $("tasks");
  const emptyState = $("emptyState");
  const form = $("taskForm");
  const titleInput = $("titleInput");
  const typeInput = $("typeInput");
  const priorityInput = $("priorityInput");
  const timeInput = $("timeInput");
  const dueInput = $("dueInput");
  const notesInput = $("notesInput");
  const searchInput = $("searchInput");
  const sortSelect = $("sortSelect");
  const statusEl = $("status");

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { tasks: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tasks)) throw new Error("Invalid state");

      parsed.tasks = parsed.tasks
        .filter(t => t && typeof t.id === "string" && typeof t.title === "string")
        .map(normalizeTask);

      return parsed;
    } catch {
      return { tasks: [] };
    }
  }

  function normalizeTask(task) {
    const priority = Number(task.priority);
    const time = Number(task.time);
    return {
      id: task.id,
      title: String(task.title).trim().slice(0, 200),
      notes: String(task.notes || "").slice(0, 500),
      type: task.type === "work" ? "work" : "personal",
      priority: Number.isInteger(priority) && priority >= 1 && priority <= 5 ? priority : 3,
      time: Number.isFinite(time) && time >= 0 ? Math.round(time * 2) / 2 : 0,
      dueDate: task.dueDate || "",
      completed: !!task.completed,
      createdAt: task.createdAt || new Date().toISOString(),
      completedAt: task.completedAt || null
    };
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function timeLabel(value) {
    const n = Number(value);
    if (n === 0) return "<30 min";
    if (n === 0.5) return "30 min";
    if (Number.isInteger(n)) return `${n} ${n === 1 ? "hour" : "hours"}`;
    return `${Math.floor(n)} hr 30 min`;
  }

  function priorityLabel(priority) {
    return ["", "Low", "Below normal", "Normal", "High", "Critical"][priority] || "Normal";
  }

  function typeLabel(type) {
    return type === "work" ? "Work" : "Personal";
  }

  function formatDue(date) {
    if (!date) return "No due date";
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "No due date";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.getTime() === today.getTime()) return "Today";
    if (d.getTime() === tomorrow.getTime()) return "Tomorrow";

    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(`${task.dueDate}T00:00:00`) < today;
  }

  function getVisibleTasks() {
    let result = state.tasks.filter(task => {
      if (activeFilter === "personal" && task.type !== "personal") return false;
      if (activeFilter === "work" && task.type !== "work") return false;
      if (activeFilter === "completed" && !task.completed) return false;
      if (activeFilter !== "completed" && task.completed) return false;

      if (searchTerm) {
        const haystack = `${task.title} ${task.notes}`.toLowerCase();
        if (!haystack.includes(searchTerm)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortMode === "priority") {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortMode === "due") {
        if (!a.dueDate && !b.dueDate) return new Date(b.createdAt) - new Date(a.createdAt);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortMode === "time") return b.time - a.time;
      if (sortMode === "title") return a.title.localeCompare(b.title);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }

  function updateCounts() {
    const active = state.tasks.filter(t => !t.completed);
    $("allCount").textContent = active.length ? `(${active.length})` : "";
    $("personalCount").textContent = active.filter(t => t.type === "personal").length ? `(${active.filter(t => t.type === "personal").length})` : "";
    $("workCount").textContent = active.filter(t => t.type === "work").length ? `(${active.filter(t => t.type === "work").length})` : "";
    $("completedCount").textContent = state.tasks.filter(t => t.completed).length ? `(${state.tasks.filter(t => t.completed).length})` : "";
  }

  function setStatus(text) {
    statusEl.textContent = text;
    clearTimeout(setStatus.timer);
    setStatus.timer = setTimeout(() => statusEl.textContent = "", 2200);
  }

  function renderTask(task) {
    const row = document.createElement("article");
    row.className = `task ${task.completed ? "done" : ""} ${isOverdue(task) ? "overdue" : ""}`;
    row.dataset.id = task.id;

    const stars = "★".repeat(task.priority) + "☆".repeat(5 - task.priority);
    const dueText = formatDue(task.dueDate);

    row.innerHTML = `
      <label class="check-wrap">
        <input class="task-check" type="checkbox" ${task.completed ? "checked" : ""} aria-label="Complete ${escapeHtml(task.title)}">
        <span class="custom-check" aria-hidden="true"></span>
      </label>
      <div class="task-main">
        <div class="task-title-row">
          <h3>${escapeHtml(task.title)}</h3>
          <span class="type-badge ${task.type}">${typeLabel(task.type)}</span>
        </div>
        ${task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : ""}
        <div class="task-meta">
          <span class="priority" title="Priority ${task.priority} — ${priorityLabel(task.priority)}">${stars}</span>
          <span>${timeLabel(task.time)}</span>
          <span class="${isOverdue(task) ? "due-overdue" : ""}">${dueText}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-button edit-task" type="button" title="Edit task" aria-label="Edit task">✎</button>
        <button class="icon-button delete-task" type="button" title="Delete task" aria-label="Delete task">×</button>
      </div>
    `;

    row.querySelector(".task-check").addEventListener("change", event => {
      task.completed = event.target.checked;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      save();
      render();
      setStatus(task.completed ? "Task completed." : "Task reopened.");
    });

    row.querySelector(".delete-task").addEventListener("click", () => {
      state.tasks = state.tasks.filter(t => t.id !== task.id);
      save();
      render();
      setStatus("Task deleted.");
    });

    row.querySelector(".edit-task").addEventListener("click", () => openEdit(task));

    return row;
  }

  function render() {
    updateCounts();
    document.querySelectorAll(".filter").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.filter === activeFilter);
    });

    const titles = {
      all: "All tasks",
      personal: "Personal tasks",
      work: "Work tasks",
      completed: "Completed tasks"
    };
    $("listTitle").textContent = titles[activeFilter];

    const visible = getVisibleTasks();
    const activeCount = state.tasks.filter(t => !t.completed).length;
    const totalTime = state.tasks.filter(t => !t.completed).reduce((sum, t) => sum + t.time, 0);
    $("listSummary").textContent = `${visible.length} shown · ${activeCount} active · ${timeLabel(totalTime)} total estimated`;

    tasksEl.innerHTML = "";
    visible.forEach(task => tasksEl.appendChild(renderTask(task)));

    emptyState.hidden = visible.length > 0;
  }

  function populateTimeOptions() {
    timeInput.innerHTML = TIME_OPTIONS.map(value => {
      const selected = value === 1 ? " selected" : "";
      return `<option value="${value}"${selected}>${timeLabel(value)}</option>`;
    }).join("");
  }

  function resetForm() {
    form.reset();
    typeInput.value = "personal";
    priorityInput.value = "3";
    timeInput.value = "1";
  }

  function openEdit(task) {
    const newTitle = prompt("Task", task.title);
    if (newTitle === null) return;
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return;

    const newNotes = prompt("Notes (optional)", task.notes || "");
    if (newNotes === null) return;

    task.title = cleanTitle.slice(0, 200);
    task.notes = newNotes.slice(0, 500);
    save();
    render();
    setStatus("Task updated.");
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    const task = {
      id: makeId(),
      title: title.slice(0, 200),
      notes: notesInput.value.trim().slice(0, 500),
      type: typeInput.value,
      priority: Number(priorityInput.value),
      time: Number(timeInput.value),
      dueDate: dueInput.value,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    state.tasks.push(task);
    save();
    resetForm();
    render();
    setStatus("Task added.");
    titleInput.focus();
  });

  document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      render();
    });
  });

  searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.trim().toLowerCase();
    render();
  });

  sortSelect.addEventListener("change", event => {
    sortMode = event.target.value;
    render();
  });

  $("clearCompleted").addEventListener("click", () => {
    const completed = state.tasks.filter(t => t.completed).length;
    if (!completed) {
      setStatus("No completed tasks to clear.");
      return;
    }
    if (!confirm(`Remove ${completed} completed task${completed === 1 ? "" : "s"}?`)) return;
    state.tasks = state.tasks.filter(t => !t.completed);
    save();
    render();
    setStatus("Completed tasks cleared.");
  });

  populateTimeOptions();
  resetForm();
  render();
})();
