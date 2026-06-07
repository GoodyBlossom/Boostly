(function () {
  "use strict";

  const taskList = document.getElementById("taskList");
  const taskForm = document.getElementById("taskForm");
  const taskTitle = document.getElementById("taskTitle");
  const taskPriority = document.getElementById("taskPriority");
  const template = document.getElementById("taskTemplate");
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const themeToggle = document.getElementById("themeToggle");
  const doneCount = document.getElementById("doneCount");
  const openCount = document.getElementById("openCount");
  const focusCount = document.getElementById("focusCount");
  const storageKey = "taskflowlite.tasks.v1";
  const themeKey = "taskflowlite.theme.v1";

  let filter = "all";
  let tasks = loadTasks();

  function loadTasks() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(saved)) {
        return saved;
      }
    } catch (error) {
      localStorage.removeItem(storageKey);
    }

    return [
      createTask("Plan the next three priorities", "focus"),
      createTask("Review what can wait", "next"),
      createTask("Clear one small admin task", "later")
    ];
  }

  function createTask(title, priority) {
    return {
      id: String(Date.now()) + Math.random().toString(16).slice(2),
      title,
      priority,
      done: false,
      createdAt: new Date().toISOString()
    };
  }

  function saveTasks() {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
  }

  function saveTheme(theme) {
    localStorage.setItem(themeKey, theme);
  }

  function applyTheme() {
    const saved = localStorage.getItem(themeKey);
    const theme = saved || "light";
    document.documentElement.dataset.theme = theme;
  }

  function setFilter(nextFilter) {
    filter = nextFilter;
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.filter === filter);
    });
    render();
  }

  function visibleTasks() {
    if (filter === "done") {
      return tasks.filter((task) => task.done);
    }
    if (filter === "open") {
      return tasks.filter((task) => !task.done);
    }
    if (filter === "focus") {
      return tasks.filter((task) => task.priority === "focus" && !task.done);
    }
    return tasks;
  }

  function priorityLabel(priority) {
    return {
      focus: "Focus lane",
      next: "Next lane",
      later: "Later lane"
    }[priority] || "Task";
  }

  function render() {
    taskList.replaceChildren();

    const done = tasks.filter((task) => task.done).length;
    doneCount.textContent = done;
    openCount.textContent = tasks.length - done;
    focusCount.textContent = tasks.filter((task) => task.priority === "focus" && !task.done).length;

    const rows = visibleTasks();
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Nothing here yet.";
      taskList.append(empty);
      return;
    }

    rows.forEach((task) => {
      const row = template.content.firstElementChild.cloneNode(true);
      row.dataset.priority = task.priority;
      row.classList.toggle("done", task.done);
      row.querySelector("h2").textContent = task.title;
      row.querySelector("p").textContent = priorityLabel(task.priority);
      row.querySelector(".check").addEventListener("click", () => toggleTask(task.id));
      row.querySelector(".delete").addEventListener("click", () => deleteTask(task.id));
      taskList.append(row);
    });
  }

  function toggleTask(id) {
    tasks = tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task);
    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    render();
  }

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = taskTitle.value.trim();
    if (!title) {
      return;
    }
    tasks.unshift(createTask(title, taskPriority.value));
    taskTitle.value = "";
    saveTasks();
    setFilter("all");
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setFilter(tab.dataset.filter));
  });

  themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    saveTheme(nextTheme);
  });

  applyTheme();
  render();
}());
