const API = "/api";

const tokenKey = "nexora_token";

let token = localStorage.getItem(tokenKey);

let tasks = [];

let editingId = null;

let currentUser = null;

let draggedTaskId = null;

let statusChart = null;

let priorityChart = null;


/* =========================
   DOM HELPER
========================= */

const $ = (selector) => document.querySelector(selector);


/* =========================
   HTML SECURITY
========================= */

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================
   TOAST
========================= */

function showToast(message) {

  const toast = $("#toast");

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


/* =========================
   API
========================= */

async function request(url, options = {}) {

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API}${url}`,
    {
      ...options,
      headers
    }
  );

  if (response.status === 204) {
    return null;
  }

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {

    if (response.status === 401) {
      logout(false);
    }

    throw new Error(
      data.message ||
      "Não foi possível concluir a operação."
    );
  }

  return data;
}


/* =========================
   AUTH
========================= */

function setAuthMode(mode) {

  document
    .querySelectorAll(".tab")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.authTab === mode
      );

    });

  $("#login-form")
    .classList.toggle(
      "hidden",
      mode !== "login"
    );

  $("#register-form")
    .classList.toggle(
      "hidden",
      mode !== "register"
    );
}


function getInitials(name = "") {

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "NX";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}


function showApp(user) {

  currentUser = user;

  $("#auth-screen")
    .classList.add("hidden");

  $("#app-screen")
    .classList.remove("hidden");

  $("#user-name").textContent =
    user.name || "Usuário";

  $("#hero-name").textContent =
    (user.name || "Usuário")
      .split(" ")[0];

  $("#user-avatar").textContent =
    getInitials(user.name);
}


function showAuth() {

  $("#app-screen")
    .classList.add("hidden");

  $("#auth-screen")
    .classList.remove("hidden");
}


function logout(showMessage = true) {

  token = null;

  currentUser = null;

  tasks = [];

  localStorage.removeItem(tokenKey);

  showAuth();

  if (showMessage) {
    showToast("Você saiu da sua conta.");
  }
}


/* =========================
   LOAD USER
========================= */

async function loadMe() {

  const user = await request("/me");

  showApp(user);

  await loadTasks();
}


/* =========================
   LOAD TASKS
========================= */

async function loadTasks() {

  tasks = await request("/tasks");

  renderTasks();

  updateStats();

  updateCharts();

  updateNotifications();
}


/* =========================
   TASK FILTER
========================= */

function getFilteredTasks() {

  const search =
    $("#search-input")
      .value
      .trim()
      .toLowerCase();

  const filter =
    $("#filter-select").value;

  return tasks.filter(task => {

    const matchesSearch =
      task.title
        .toLowerCase()
        .includes(search) ||

      (task.description || "")
        .toLowerCase()
        .includes(search);

    const matchesFilter =
      filter === "all" ||

      (
        filter === "pending" &&
        !task.completed
      ) ||

      (
        filter === "done" &&
        task.completed
      ) ||

      (
        filter === "high" &&
        task.priority === "high"
      );

    return (
      matchesSearch &&
      matchesFilter
    );
  });
}


/* =========================
   DATE HELPERS
========================= */

function formatDate(date) {

  if (!date) {
    return "";
  }

  const [year, month, day] =
    String(date)
      .slice(0, 10)
      .split("-");

  return `${day}/${month}/${year}`;
}


function getDateStatus(date) {

  if (!date) {
    return "normal";
  }

  const due = new Date(
    `${String(date).slice(0, 10)}T23:59:59`
  );

  const now = new Date();

  const today = new Date();

  today.setHours(23, 59, 59, 999);

  const tomorrow = new Date(today);

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  if (due < now) {
    return "overdue";
  }

  if (due <= tomorrow) {
    return "soon";
  }

  return "normal";
}


function dueBadge(task) {

  if (!task.due_date) {
    return "";
  }

  const status =
    getDateStatus(task.due_date);

  const date =
    formatDate(task.due_date);

  if (
    status === "overdue" &&
    !task.completed
  ) {

    return `
      <span class="badge overdue">
        ⚠ Atrasada · ${date}
      </span>
    `;
  }

  if (
    status === "soon" &&
    !task.completed
  ) {

    return `
      <span class="badge due-soon">
        ⏰ ${date}
      </span>
    `;
  }

  return `
    <span class="badge">
      📅 ${date}
    </span>
  `;
}


/* =========================
   PRIORITY
========================= */

function priorityLabel(priority) {

  return {
    low: "Baixa",
    medium: "Média",
    high: "Alta"
  }[priority] || priority;
}


/* =========================
   RENDER TASKS
========================= */

function createTaskCard(task) {

  return `
    <article
      class="task-card ${task.completed ? "done" : ""}"
      draggable="true"
      data-task-id="${task.id}"
    >

      <div
        class="drag-handle"
        title="Arrastar tarefa"
        aria-label="Arrastar tarefa"
      >
        ⋮⋮
      </div>

      <input
        class="check"
        type="checkbox"
        data-action="toggle"
        data-id="${task.id}"
        ${task.completed ? "checked" : ""}
        aria-label="Concluir tarefa"
      >

      <div>

        <h3>
          ${escapeHtml(task.title)}
        </h3>

        <p class="task-description">
          ${escapeHtml(
            task.description ||
            "Sem descrição."
          )}
        </p>

        <div class="meta">

          <span
            class="badge priority-${task.priority}"
          >
            ${priorityLabel(task.priority)}
          </span>

          ${dueBadge(task)}

          <span class="badge">
            ${task.completed
              ? "Concluída"
              : "Pendente"}
          </span>

        </div>

      </div>


      <div class="task-actions">

        <button
          type="button"
          data-action="edit"
          data-id="${task.id}"
        >
          Editar
        </button>

        <button
          type="button"
          data-action="delete"
          data-id="${task.id}"
        >
          Excluir
        </button>

      </div>

    </article>
  `;
}


function renderTasks() {

  const visible =
    getFilteredTasks();

  const pending =
    visible.filter(
      task => !task.completed
    );

  const done =
    visible.filter(
      task => task.completed
    );

  $("#pending-list").innerHTML =
    pending.length
      ? pending.map(createTaskCard).join("")
      : `<div class="empty">Nenhuma tarefa pendente.</div>`;

  $("#done-list").innerHTML =
    done.length
      ? done.map(createTaskCard).join("")
      : `<div class="empty">Nenhuma tarefa concluída.</div>`;

  $("#pending-count").textContent =
    pending.length;

  $("#done-count").textContent =
    done.length;

  $("#empty-state")
    .classList.toggle(
      "hidden",
      visible.length !== 0
    );

  setupDragAndDrop();
}


/* =========================
   STATS
========================= */

function updateStats() {

  const total =
    tasks.length;

  const pending =
    tasks.filter(
      task => !task.completed
    ).length;

  const done =
    tasks.filter(
      task => task.completed
    ).length;

  const high =
    tasks.filter(
      task =>
        task.priority === "high" &&
        !task.completed
    ).length;

  $("#stat-total").textContent =
    total;

  $("#stat-pending").textContent =
    pending;

  $("#stat-done").textContent =
    done;

  $("#stat-high").textContent =
    high;
}


/* =========================
   CHARTS
========================= */

function updateCharts() {

  if (
    typeof Chart === "undefined"
  ) {
    return;
  }

  const pending =
    tasks.filter(
      task => !task.completed
    ).length;

  const done =
    tasks.filter(
      task => task.completed
    ).length;

  const low =
    tasks.filter(
      task => task.priority === "low"
    ).length;

  const medium =
    tasks.filter(
      task => task.priority === "medium"
    ).length;

  const high =
    tasks.filter(
      task => task.priority === "high"
    ).length;


  /* STATUS */

  const statusCanvas =
    $("#status-chart");

  if (statusCanvas) {

    if (statusChart) {
      statusChart.destroy();
    }

    statusChart =
      new Chart(
        statusCanvas,
        {
          type: "doughnut",

          data: {
            labels: [
              "Pendentes",
              "Concluídas"
            ],

            datasets: [
              {
                data: [
                  pending,
                  done
                ],

                backgroundColor: [
                  "#f6b84b",
                  "#35d49a"
                ],

                borderColor:
                  "#0c192c",

                borderWidth: 5
              }
            ]
          },

          options: {
            responsive: true,

            maintainAspectRatio: false,

            cutout: "68%",

            plugins: {
              legend: {
                position: "bottom",

                labels: {
                  color: "#8fa1bd",

                  padding: 18,

                  usePointStyle: true
                }
              }
            }
          }
        }
      );
  }


  /* PRIORITY */

  const priorityCanvas =
    $("#priority-chart");

  if (priorityCanvas) {

    if (priorityChart) {
      priorityChart.destroy();
    }

    priorityChart =
      new Chart(
        priorityCanvas,
        {
          type: "bar",

          data: {
            labels: [
              "Baixa",
              "Média",
              "Alta"
            ],

            datasets: [
              {
                label: "Tarefas",

                data: [
                  low,
                  medium,
                  high
                ],

                backgroundColor: [
                  "#35d49a",
                  "#f6b84b",
                  "#ff6b7a"
                ],

                borderRadius: 8,

                borderSkipped: false
              }
            ]
          },

          options: {
            responsive: true,

            maintainAspectRatio: false,

            plugins: {
              legend: {
                display: false
              }
            },

            scales: {
              x: {
                grid: {
                  display: false
                },

                ticks: {
                  color: "#8fa1bd"
                }
              },

              y: {
                beginAtZero: true,

                ticks: {
                  precision: 0,

                  color: "#8fa1bd"
                },

                grid: {
                  color:
                    "rgba(148,163,184,.08)"
                }
              }
            }
          }
        }
      );
  }
}


/* =========================
   NOTIFICATIONS
========================= */

function getNotifications() {

  const notifications = [];

  const now = new Date();

  const tomorrow =
    new Date(now);

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  tasks.forEach(task => {

    if (
      task.completed ||
      !task.due_date
    ) {
      return;
    }

    const due =
      new Date(
        `${String(task.due_date).slice(0, 10)}T23:59:59`
      );

    if (due < now) {

      notifications.push({
        type: "danger",
        icon: "⚠",
        title: "Tarefa atrasada",
        message:
          `${task.title} está atrasada.`
      });

      return;
    }

    if (due <= tomorrow) {

      notifications.push({
        type: "warning",
        icon: "⏰",
        title: "Prazo próximo",
        message:
          `${task.title} vence em breve.`
      });
    }

  });

  return notifications;
}


function updateNotifications() {

  const notifications =
    getNotifications();

  const count =
    notifications.length;

  const countElement =
    $("#notification-count");

  countElement.textContent =
    count > 9 ? "9+" : count;

  countElement.classList.toggle(
    "hidden",
    count === 0
  );

  $("#notification-summary").textContent =
    count === 0
      ? "Tudo tranquilo"
      : `${count} aviso${count > 1 ? "s" : ""}`;


  const list =
    $("#notification-list");

  if (!count) {

    list.innerHTML = `
      <div class="notification-empty">
        Nenhuma notificação.
      </div>
    `;

    return;
  }


  list.innerHTML =
    notifications.map(item => `

      <div
        class="notification-item ${item.type === "warning" ? "warning" : ""}"
      >

        <div class="notification-icon">
          ${item.icon}
        </div>

        <div>

          <strong>
            ${escapeHtml(item.title)}
          </strong>

          <p>
            ${escapeHtml(item.message)}
          </p>

        </div>

      </div>

    `).join("");
}


/* =========================
   BROWSER NOTIFICATIONS
========================= */

async function enableBrowserNotifications() {

  if (
    !("Notification" in window)
  ) {

    showToast(
      "Seu navegador não suporta notificações."
    );

    return;
  }


  const permission =
    await Notification.requestPermission();


  if (
    permission === "granted"
  ) {

    showToast(
      "Notificações ativadas."
    );

    sendBrowserNotifications();

  } else {

    showToast(
      "Permissão de notificações não concedida."
    );
  }
}


function sendBrowserNotifications() {

  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const notifications =
    getNotifications();

  if (!notifications.length) {
    return;
  }

  const first =
    notifications[0];

  new Notification(
    `Nexora — ${first.title}`,
    {
      body: first.message,
      icon: "/nexora-logo.png"
    }
  );
}


/* =========================
   TASK DIALOG
========================= */

function openTaskDialog(task = null) {

  editingId =
    task?.id || null;

  $("#dialog-title").textContent =
    task
      ? "Editar tarefa"
      : "Nova tarefa";

  $("#task-id").value =
    task?.id || "";

  $("#task-title").value =
    task?.title || "";

  $("#task-description").value =
    task?.description || "";

  $("#task-priority").value =
    task?.priority || "medium";

  $("#task-due-date").value =
    task?.due_date
      ? task.due_date.slice(0, 10)
      : "";

  $("#task-dialog").showModal();

  $("#task-title").focus();
}


function closeTaskDialog() {

  if (
    $("#task-dialog").open
  ) {
    $("#task-dialog").close();
  }

  editingId = null;
}


/* =========================
   SAVE TASK
========================= */

async function handleTaskSubmit(event) {

  event.preventDefault();

  const payload = {

    title:
      $("#task-title").value.trim(),

    description:
      $("#task-description").value.trim(),

    priority:
      $("#task-priority").value,

    due_date:
      $("#task-due-date").value ||
      null
  };


  if (!payload.title) {

    showToast(
      "Digite um título para a tarefa."
    );

    return;
  }


  try {

    if (editingId) {

      await request(
        `/tasks/${editingId}`,
        {
          method: "PUT",

          body:
            JSON.stringify(payload)
        }
      );

      showToast(
        "Tarefa atualizada."
      );

    } else {

      await request(
        "/tasks",
        {
          method: "POST",

          body:
            JSON.stringify(payload)
        }
      );

      showToast(
        "Tarefa criada."
      );
    }


    closeTaskDialog();

    await loadTasks();

  } catch (error) {

    showToast(
      error.message
    );
  }
}


/* =========================
   TOGGLE TASK
========================= */

async function toggleTask(id) {

  try {

    await request(
      `/tasks/${id}/toggle`,
      {
        method: "PATCH"
      }
    );

    await loadTasks();

  } catch (error) {

    showToast(
      error.message
    );
  }
}


/* =========================
   DRAG & DROP
========================= */

function setupDragAndDrop() {

  const cards =
    document.querySelectorAll(
      ".task-card"
    );

  const zones =
    document.querySelectorAll(
      ".drop-zone"
    );


  cards.forEach(card => {

    card.addEventListener(
      "dragstart",
      handleDragStart
    );

    card.addEventListener(
      "dragend",
      handleDragEnd
    );

  });


  zones.forEach(zone => {

    zone.addEventListener(
      "dragover",
      handleDragOver
    );

    zone.addEventListener(
      "dragleave",
      handleDragLeave
    );

    zone.addEventListener(
      "drop",
      handleDrop
    );

  });
}


function handleDragStart(event) {

  const card =
    event.currentTarget;

  draggedTaskId =
    Number(card.dataset.taskId);

  card.classList.add(
    "dragging"
  );

  event.dataTransfer.effectAllowed =
    "move";

  event.dataTransfer.setData(
    "text/plain",
    String(draggedTaskId)
  );
}


function handleDragEnd(event) {

  event.currentTarget
    .classList.remove(
      "dragging"
    );

  draggedTaskId = null;

  document
    .querySelectorAll(
      ".drop-zone"
    )
    .forEach(zone => {

      zone.classList.remove(
        "drag-target"
      );

    });

  document
    .querySelectorAll(
      ".task-column"
    )
    .forEach(column => {

      column.classList.remove(
        "drag-over"
      );

    });
}


function handleDragOver(event) {

  event.preventDefault();

  const zone =
    event.currentTarget;

  zone.classList.add(
    "drag-target"
  );

  const column =
    zone.closest(
      ".task-column"
    );

  if (column) {
    column.classList.add(
      "drag-over"
    );
  }

  event.dataTransfer.dropEffect =
    "move";
}


function handleDragLeave(event) {

  const zone =
    event.currentTarget;

  if (
    !zone.contains(
      event.relatedTarget
    )
  ) {

    zone.classList.remove(
      "drag-target"
    );

    const column =
      zone.closest(
        ".task-column"
      );

    if (column) {
      column.classList.remove(
        "drag-over"
      );
    }
  }
}


async function handleDrop(event) {

  event.preventDefault();

  const zone =
    event.currentTarget;

  const status =
    zone.dataset.dropStatus;

  const id =
    Number(
      event.dataTransfer.getData(
        "text/plain"
      )
    ) || draggedTaskId;


  zone.classList.remove(
    "drag-target"
  );

  const column =
    zone.closest(
      ".task-column"
    );

  if (column) {
    column.classList.remove(
      "drag-over"
    );
  }


  if (!id) {
    return;
  }


  const task =
    tasks.find(
      item => item.id === id
    );


  if (!task) {
    return;
  }


  const shouldComplete =
    status === "done";


  if (
    Boolean(task.completed) ===
    shouldComplete
  ) {
    return;
  }


  try {

    await request(
      `/tasks/${id}/toggle`,
      {
        method: "PATCH"
      }
    );

    showToast(
      shouldComplete
        ? "Tarefa concluída."
        : "Tarefa reaberta."
    );

    await loadTasks();

  } catch (error) {

    showToast(
      error.message
    );
  }
}


/* =========================
   DELETE
========================= */

async function deleteTask(id) {

  if (
    !confirm(
      "Excluir esta tarefa?"
    )
  ) {
    return;
  }


  try {

    await request(
      `/tasks/${id}`,
      {
        method: "DELETE"
      }
    );

    showToast(
      "Tarefa excluída."
    );

    await loadTasks();

  } catch (error) {

    showToast(
      error.message
    );
  }
}


/* =========================
   AUTH EVENTS
========================= */

document
  .querySelectorAll("[data-auth-tab]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        setAuthMode(
          button.dataset.authTab
        );

      }
    );

  });


/* LOGIN */

$("#login-form")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      try {

        const data =
          await request(
            "/auth/login",
            {
              method: "POST",

              body:
                JSON.stringify({
                  email:
                    $("#login-email")
                      .value,

                  password:
                    $("#login-password")
                      .value
                })
            }
          );


        token =
          data.token;

        localStorage.setItem(
          tokenKey,
          token
        );

        showApp(
          data.user
        );

        await loadTasks();

        showToast(
          "Login realizado."
        );

      } catch (error) {

        showToast(
          error.message
        );
      }

    }
  );


/* REGISTER */

$("#register-form")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      try {

        const data =
          await request(
            "/auth/register",
            {
              method: "POST",

              body:
                JSON.stringify({
                  name:
                    $("#register-name")
                      .value,

                  email:
                    $("#register-email")
                      .value,

                  password:
                    $("#register-password")
                      .value
                })
            }
          );


        token =
          data.token;

        localStorage.setItem(
          tokenKey,
          token
        );

        showApp(
          data.user
        );

        await loadTasks();

        showToast(
          "Conta criada com sucesso."
        );

      } catch (error) {

        showToast(
          error.message
        );
      }

    }
  );


/* LOGOUT */

$("#logout-btn")
  .addEventListener(
    "click",
    () => logout(true)
  );


/* NEW TASK */

$("#new-task-btn")
  .addEventListener(
    "click",
    () => openTaskDialog()
  );


/* DIALOG */

$("#close-dialog")
  .addEventListener(
    "click",
    closeTaskDialog
  );

$("#cancel-dialog")
  .addEventListener(
    "click",
    closeTaskDialog
  );

$("#task-form")
  .addEventListener(
    "submit",
    handleTaskSubmit
  );


/* SEARCH */

$("#search-input")
  .addEventListener(
    "input",
    renderTasks
  );


/* FILTER */

$("#filter-select")
  .addEventListener(
    "change",
    renderTasks
  );


/* TASK ACTIONS */

document
  .querySelector("#app-screen")
  .addEventListener(
    "click",
    async event => {

      const button =
        event.target.closest(
          "[data-action]"
        );

      if (!button) {
        return;
      }


      const id =
        Number(
          button.dataset.id
        );

      const action =
        button.dataset.action;


      if (
        action === "edit"
      ) {

        const task =
          tasks.find(
            item =>
              item.id === id
          );

        if (task) {
          openTaskDialog(task);
        }

      }


      if (
        action === "delete"
      ) {

        await deleteTask(id);

      }

    }
  );


/* CHECKBOX */

document
  .querySelector("#app-screen")
  .addEventListener(
    "change",
    async event => {

      const input =
        event.target.closest(
          '[data-action="toggle"]'
        );

      if (!input) {
        return;
      }

      await toggleTask(
        Number(
          input.dataset.id
        )
      );

    }
  );


/* =========================
   NOTIFICATION UI
========================= */

$("#notification-btn")
  .addEventListener(
    "click",
    event => {

      event.stopPropagation();

      $("#notification-panel")
        .classList.toggle(
          "hidden"
        );
    }
  );


$("#enable-notifications")
  .addEventListener(
    "click",
    enableBrowserNotifications
  );


document.addEventListener(
  "click",
  event => {

    const wrapper =
      event.target.closest(
        ".notification-wrapper"
      );

    if (!wrapper) {

      $("#notification-panel")
        .classList.add(
          "hidden"
        );
    }

  }
);


/* =========================
   INIT
========================= */

(async function init() {

  if (!token) {
    return;
  }


  try {

    await loadMe();

  } catch {

    token = null;

    localStorage.removeItem(
      tokenKey
    );

    showAuth();

  }

})();