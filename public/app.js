const API = "/api";
const tokenKey = "nexora_token";

let token = localStorage.getItem(tokenKey);
let tasks = [];
let editingId = null;

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

async function request(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}${url}`, { ...options, headers });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível concluir a operação.");
  }

  return data;
}

function setAuthMode(mode) {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.authTab === mode);
  });

  $("#login-form").classList.toggle("hidden", mode !== "login");
  $("#register-form").classList.toggle("hidden", mode !== "register");
}

function showApp(user) {
  $("#auth-screen").classList.add("hidden");
  $("#app-screen").classList.remove("hidden");
  $("#user-name").textContent = user.name;
  $("#hero-name").textContent = user.name.split(" ")[0];
}

function showAuth() {
  $("#app-screen").classList.add("hidden");
  $("#auth-screen").classList.remove("hidden");
}

async function loadMe() {
  const user = await request("/me");
  showApp(user);
  await loadTasks();
}

async function loadTasks() {
  tasks = await request("/tasks");
  renderTasks();
}

function renderTasks() {
  const search = $("#search-input").value.trim().toLowerCase();
  const filter = $("#filter-select").value;

  const visible = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search) ||
      (task.description || "").toLowerCase().includes(search);

    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && !task.completed) ||
      (filter === "done" && task.completed) ||
      (filter === "high" && task.priority === "high");

    return matchesSearch && matchesFilter;
  });

  $("#empty-state").classList.toggle("hidden", visible.length !== 0);

  $("#task-list").innerHTML = visible.map(task => `
    <article class="task-card ${task.completed ? "done" : ""}">
      <input class="check" type="checkbox"
        data-action="toggle"
        data-id="${task.id}"
        ${task.completed ? "checked" : ""}
        aria-label="Concluir tarefa">

      <div>
        <h3>${escapeHtml(task.title)}</h3>
        <p class="task-description">${escapeHtml(task.description || "Sem descrição.")}</p>
        <div class="meta">
          <span class="badge priority-${task.priority}">
            ${priorityLabel(task.priority)}
          </span>
          ${task.due_date ? `<span class="badge">📅 ${formatDate(task.due_date)}</span>` : ""}
          <span class="badge">${task.completed ? "Concluída" : "Pendente"}</span>
        </div>
      </div>

      <div class="task-actions">
        <button data-action="edit" data-id="${task.id}">Editar</button>
        <button data-action="delete" data-id="${task.id}">Excluir</button>
      </div>
    </article>
  `).join("");

  updateStats();
}

function updateStats() {
  $("#stat-total").textContent = tasks.length;
  $("#stat-pending").textContent = tasks.filter(t => !t.completed).length;
  $("#stat-done").textContent = tasks.filter(t => t.completed).length;
  $("#stat-high").textContent = tasks.filter(t => t.priority === "high" && !t.completed).length;
}

function priorityLabel(priority) {
  return {
    low: "Baixa",
    medium: "Média",
    high: "Alta"
  }[priority] || priority;
}

function formatDate(date) {
  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function openTaskDialog(task = null) {
  editingId = task?.id || null;
  $("#dialog-title").textContent = task ? "Editar tarefa" : "Nova tarefa";
  $("#task-id").value = task?.id || "";
  $("#task-title").value = task?.title || "";
  $("#task-description").value = task?.description || "";
  $("#task-priority").value = task?.priority || "medium";
  $("#task-due-date").value = task?.due_date ? task.due_date.slice(0, 10) : "";
  $("#task-dialog").showModal();
  $("#task-title").focus();
}

function closeTaskDialog() {
  $("#task-dialog").close();
  editingId = null;
}

async function handleTaskSubmit(event) {
  event.preventDefault();

  const payload = {
    title: $("#task-title").value,
    description: $("#task-description").value,
    priority: $("#task-priority").value,
    dueDate: $("#task-due-date").value || null,
    completed: editingId
      ? tasks.find(t => t.id === editingId)?.completed || false
      : false
  };

  try {
    if (editingId) {
      await request(`/tasks/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      showToast("Tarefa atualizada.");
    } else {
      await request("/tasks", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showToast("Tarefa criada.");
    }

    closeTaskDialog();
    await loadTasks();
  } catch (error) {
    showToast(error.message);
  }
}

async function toggleTask(id) {
  try {
    await request(`/tasks/${id}/toggle`, { method: "PATCH" });
    await loadTasks();
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteTask(id) {
  if (!confirm("Excluir esta tarefa?")) return;

  try {
    await request(`/tasks/${id}`, { method: "DELETE" });
    showToast("Tarefa excluída.");
    await loadTasks();
  } catch (error) {
    showToast(error.message);
  }
}

document.querySelectorAll("[data-auth-tab]").forEach(button => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authTab));
});

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: $("#login-email").value,
        password: $("#login-password").value
      })
    });

    token = data.token;
    localStorage.setItem(tokenKey, token);
    showApp(data.user);
    await loadTasks();
    showToast("Login realizado.");
  } catch (error) {
    showToast(error.message);
  }
});

$("#register-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: $("#register-name").value,
        email: $("#register-email").value,
        password: $("#register-password").value
      })
    });

    token = data.token;
    localStorage.setItem(tokenKey, token);
    showApp(data.user);
    await loadTasks();
    showToast("Conta criada com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
});

$("#logout-btn").addEventListener("click", () => {
  token = null;
  localStorage.removeItem(tokenKey);
  tasks = [];
  showAuth();
});

$("#new-task-btn").addEventListener("click", () => openTaskDialog());
$("#close-dialog").addEventListener("click", closeTaskDialog);
$("#cancel-dialog").addEventListener("click", closeTaskDialog);
$("#task-form").addEventListener("submit", handleTaskSubmit);
$("#search-input").addEventListener("input", renderTasks);
$("#filter-select").addEventListener("change", renderTasks);

$("#task-list").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit") {
    openTaskDialog(tasks.find(task => task.id === id));
  }

  if (action === "delete") {
    await deleteTask(id);
  }
});

$("#task-list").addEventListener("change", async (event) => {
  const input = event.target.closest('[data-action="toggle"]');
  if (input) await toggleTask(Number(input.dataset.id));
});

(async function init() {
  if (!token) return;

  try {
    await loadMe();
  } catch {
    token = null;
    localStorage.removeItem(tokenKey);
    showAuth();
  }
})();