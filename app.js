const API = "http://localhost:3000";
let token = null;
let editingTaskId = null;
let sharingTaskId = null;
let allTasks = [];

console.log("Task Manager initialized");

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const authBtn = document.getElementById("authBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

loginTab.addEventListener("click", () => {
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  authBtn.textContent = "Login";
});

registerTab.addEventListener("click", () => {
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  authBtn.textContent = "Register";
});

authBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  const endpoint = loginTab.classList.contains("active") ? "login" : "register";

  try {
    const res = await fetch(`${API}/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Authentication failed");
      return;
    }

    token = data.access_token;
    console.log("Logged in successfully, token:", token);
    showApp();
  } catch (err) {
    console.error("Auth error:", err);
    alert("Connection error. Make sure backend is running on localhost:3000");
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  token = null;
  allTasks = [];
  document.getElementById("auth-card").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
  emailInput.value = "";
  passwordInput.value = "";
});

function showApp() {
  document.getElementById("auth-card").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  loadTasks();
}

async function loadTasks() {
  const res = await fetch('/tasks', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const tasks = await res.json();

  tasksContainer.innerHTML = tasks.map(renderTask).join('');
}


function renderTask(task) {
  const canEdit = task.isOwner || task.permission === 'WRITE';
  const isShared = !task.isOwner;

  return `
    <div class="task-card">
      <h3>${task.title}</h3>
      <p>${task.description || ''}</p>

      <span class="badge ${isShared ? 'shared' : 'owner'}">
        ${isShared ? '↓ Shared with you' : '✓ Owner'}
      </span>

      <div class="actions">
        ${canEdit ? `<button onclick="editTask(${task.id})">Edit</button>` : ''}
        ${task.isOwner ? `<button onclick="shareTask(${task.id})">Share</button>` : ''}
      </div>
    </div>
  `;
}



function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

document.getElementById("newTaskBtn").addEventListener("click", () => {
  editingTaskId = null;
  document.getElementById("taskModalTitle").textContent = "Create New Task";
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDesc").value = "";
  document.getElementById("taskModal").classList.remove("hidden");
});

document.getElementById("saveTaskBtn").addEventListener("click", async () => {
  const title = document.getElementById("taskTitle").value.trim();
  const description = document.getElementById("taskDesc").value.trim();

  if (!title) {
    alert("Please enter a task title");
    return;
  }

  const taskData = {
    title: title,
    description: description,
  };

  try {
    let res;

    if (editingTaskId) {
      console.log("UPDATING task:", editingTaskId, taskData);
      res = await fetch(`${API}/tasks/${editingTaskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });
    } else {
      console.log("CREATING task:", taskData);
      res = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });
    }

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to save task");
    }

    const result = await res.json();
    console.log("Task saved successfully:", result);

    closeTaskModal();
    await loadTasks();
  } catch (err) {
    console.error("Save task error:", err);
    alert("Failed to save task: " + err.message);
  }
});

document
  .getElementById("cancelTaskBtn")
  .addEventListener("click", closeTaskModal);

function closeTaskModal() {
  document.getElementById("taskModal").classList.add("hidden");
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDesc").value = "";
  editingTaskId = null;
}

function handleEditTask(taskId) {
  console.log("EDIT CLICKED for task:", taskId);
  editingTaskId = taskId;

  const task = allTasks.find((t) => t.id === taskId);

  if (task) {
    document.getElementById("taskModalTitle").textContent = "Edit Task";
    document.getElementById("taskTitle").value = task.title;
    document.getElementById("taskDesc").value = task.description || "";
    document.getElementById("taskModal").classList.remove("hidden");
    console.log("Edit modal opened for task:", task);
  } else {
    alert("Task not found");
  }
}

function handleShareTask(taskId, taskTitle) {
  console.log("SHARE CLICKED for task:", taskId);
  sharingTaskId = taskId;
  document.getElementById("shareTaskTitle").textContent = taskTitle;
  document.getElementById("shareEmail").value = "";
  document.getElementById("sharePermission").value = "READ";
  document.getElementById("shareModal").classList.remove("hidden");
}

document
  .getElementById("confirmShareBtn")
  .addEventListener("click", async () => {
    const email = document.getElementById("shareEmail").value.trim();
    const permission = document.getElementById("sharePermission").value;

    if (!email) {
      alert("Please enter an email address");
      return;
    }

    const shareData = {
      email: email,
      permission: permission,
    };

    try {
      console.log("SHARING task:", sharingTaskId, "with:", shareData);

      const res = await fetch(`${API}/tasks/${sharingTaskId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(shareData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to share task");
      }

      const result = await res.json();
      console.log("Task shared successfully:", result);

      closeShareModal();
      alert(`✓ Task shared successfully with ${email}!`);
      await loadTasks();
    } catch (err) {
      console.error("Share task error:", err);
      alert("Failed to share task: " + err.message);
    }
  });

document
  .getElementById("cancelShareBtn")
  .addEventListener("click", closeShareModal);

function closeShareModal() {
  document.getElementById("shareModal").classList.add("hidden");
  document.getElementById("shareEmail").value = "";
  sharingTaskId = null;
}

document.getElementById("taskModal").addEventListener("click", (e) => {
  if (e.target.id === "taskModal") closeTaskModal();
});

document.getElementById("shareModal").addEventListener("click", (e) => {
  if (e.target.id === "shareModal") closeShareModal();
});
