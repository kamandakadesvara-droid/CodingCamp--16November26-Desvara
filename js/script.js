/* ============================================================
   My Dashboard — script
   Single JS file. All data is saved to localStorage.
   Features: greeting + clock, custom name, focus timer,
   to-do list (add/edit/done/delete, no duplicates), quick links,
   and a light/dark theme toggle.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Tiny localStorage helper ---------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* storage may be full or blocked; fail silently */
      }
    }
  };

  /* ============================================================
     THEME (Challenge: Light / Dark mode)
     ============================================================ */
  const root = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  applyTheme(store.get("theme", "light"));

  themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    store.set("theme", next);
  });

  /* ============================================================
     CLOCK + GREETING + CUSTOM NAME
     (Challenge: Custom name in greeting)
     ============================================================ */
  const clockEl = document.getElementById("clock");
  const dateEl = document.getElementById("date");
  const greetingEl = document.getElementById("greeting");
  const nameInput = document.getElementById("name-input");

  function greetingFor(hour) {
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Good night";
  }

  function tick() {
    const now = new Date();

    // Time HH:MM:SS
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    clockEl.textContent = `${h}:${m}:${s}`;

    // Date, e.g. "Monday, 26 November 2025"
    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // Greeting, with optional name
    const name = store.get("userName", "");
    greetingEl.textContent = name
      ? `${greetingFor(now.getHours())}, ${name}!`
      : `${greetingFor(now.getHours())}!`;
  }

  // Load saved name into the input
  nameInput.value = store.get("userName", "");
  nameInput.addEventListener("input", () => {
    store.set("userName", nameInput.value.trim());
    tick();
  });

  tick();
  setInterval(tick, 1000);

  /* ============================================================
     FOCUS TIMER (Pomodoro, 25 minutes)
     ============================================================ */
  const timerDisplay = document.getElementById("timer-display");
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const resetBtn = document.getElementById("reset-btn");
  const sessionsCountEl = document.getElementById("sessions-count");

  const TOTAL_SECONDS = 25 * 60;
  let timeLeft = TOTAL_SECONDS;
  let timerId = null;
  let running = false;

  function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function renderTimer() {
    timerDisplay.textContent = formatTime(timeLeft);
  }

  function startTimer() {
    if (running) return;
    running = true;
    startBtn.disabled = true;
    timerId = setInterval(() => {
      timeLeft--;
      renderTimer();
      if (timeLeft <= 0) {
        clearInterval(timerId);
        timerId = null;
        running = false;
        startBtn.disabled = false;
        timeLeft = TOTAL_SECONDS;
        renderTimer();
        const sessions = store.get("sessions", 0) + 1;
        store.set("sessions", sessions);
        sessionsCountEl.textContent = sessions;
        alert("Focus session complete! Time for a break. ☕");
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
    running = false;
    startBtn.disabled = false;
  }

  function resetTimer() {
    stopTimer();
    timeLeft = TOTAL_SECONDS;
    renderTimer();
  }

  startBtn.addEventListener("click", startTimer);
  stopBtn.addEventListener("click", stopTimer);
  resetBtn.addEventListener("click", resetTimer);

  sessionsCountEl.textContent = store.get("sessions", 0);
  renderTimer();

  /* ============================================================
     TO-DO LIST
     (Challenge: Prevent duplicate tasks)
     ============================================================ */
  const todoForm = document.getElementById("todo-form");
  const todoInput = document.getElementById("todo-input");
  const todoListEl = document.getElementById("todo-list");
  const todoMessage = document.getElementById("todo-message");

  let todos = store.get("todos", []);
  let messageTimer = null;

  function saveTodos() {
    store.set("todos", todos);
  }

  // Case-insensitive duplicate check
  function isDuplicate(text, ignoreId) {
    const lower = text.toLowerCase();
    return todos.some(
      (t) => t.id !== ignoreId && t.text.toLowerCase() === lower
    );
  }

  function flashMessage(msg, isError) {
    clearTimeout(messageTimer);
    todoMessage.textContent = msg;
    todoMessage.classList.toggle("error", !!isError);
    messageTimer = setTimeout(() => {
      todoMessage.textContent = "";
      todoMessage.classList.remove("error");
    }, 2500);
  }

  function renderTodos() {
    todoListEl.innerHTML = "";

    if (todos.length === 0) {
      const li = document.createElement("li");
      li.className = "todo-empty";
      li.textContent = "No tasks yet — add one above!";
      todoListEl.appendChild(li);
      return;
    }

    todos.forEach((todo) => {
      const li = document.createElement("li");
      li.className = "todo-item" + (todo.done ? " done" : "");
      li.dataset.id = todo.id;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = todo.done;
      checkbox.addEventListener("change", () => toggleTodo(todo.id));

      const span = document.createElement("span");
      span.className = "todo-text";
      span.textContent = todo.text;

      const actions = document.createElement("div");
      actions.className = "todo-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "icon-btn";
      editBtn.type = "button";
      editBtn.textContent = "✏️";
      editBtn.title = "Edit";
      editBtn.setAttribute("aria-label", "Edit task");
      editBtn.addEventListener("click", () => editTodo(todo.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn";
      deleteBtn.type = "button";
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Delete";
      deleteBtn.setAttribute("aria-label", "Delete task");
      deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

      actions.append(editBtn, deleteBtn);
      li.append(checkbox, span, actions);
      todoListEl.appendChild(li);
    });
  }

  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (isDuplicate(trimmed)) {
      flashMessage("That task already exists!", true);
      return;
    }
    todos.push({ id: Date.now(), text: trimmed, done: false });
    saveTodos();
    renderTodos();
    flashMessage("Task added.");
  }

  function toggleTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.done = !todo.done;
    saveTodos();
    renderTodos();
  }

  function deleteTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    renderTodos();
  }

  function editTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const li = todoListEl.querySelector(`[data-id="${id}"]`);
    const span = li.querySelector(".todo-text");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-edit-input";
    input.value = todo.text;
    input.maxLength = 100;
    span.replaceWith(input);
    input.focus();
    input.select();

    let saved = false;
    function commit() {
      if (saved) return;
      saved = true;
      const newText = input.value.trim();
      if (!newText) {
        renderTodos(); // empty -> cancel
        return;
      }
      if (isDuplicate(newText, id)) {
        flashMessage("Another task already has that name!", true);
        renderTodos();
        return;
      }
      todo.text = newText;
      saveTodos();
      renderTodos();
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      } else if (e.key === "Escape") {
        saved = true;
        renderTodos();
      }
    });
  }

  todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(todoInput.value);
    todoInput.value = "";
    todoInput.focus();
  });

  renderTodos();

  /* ============================================================
     QUICK LINKS
     ============================================================ */
  const linkForm = document.getElementById("link-form");
  const linkNameInput = document.getElementById("link-name");
  const linkUrlInput = document.getElementById("link-url");
  const linksListEl = document.getElementById("links-list");

  const defaultLinks = [
    { id: 1, name: "Google", url: "https://google.com" },
    { id: 2, name: "YouTube", url: "https://youtube.com" },
    { id: 3, name: "GitHub", url: "https://github.com" }
  ];

  let links = store.get("links", defaultLinks);

  function saveLinks() {
    store.set("links", links);
  }

  function normalizeUrl(url) {
    url = url.trim();
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    return url;
  }

  function renderLinks() {
    linksListEl.innerHTML = "";

    if (links.length === 0) {
      const p = document.createElement("p");
      p.className = "links-empty";
      p.textContent = "No links yet.";
      linksListEl.appendChild(p);
      return;
    }

    links.forEach((link) => {
      const wrap = document.createElement("div");
      wrap.className = "link-item";

      const a = document.createElement("a");
      a.className = "link-btn";
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = link.name;

      const delBtn = document.createElement("button");
      delBtn.className = "icon-btn";
      delBtn.type = "button";
      delBtn.textContent = "✕";
      delBtn.title = "Remove";
      delBtn.setAttribute("aria-label", "Remove link");
      delBtn.addEventListener("click", () => deleteLink(link.id));

      wrap.append(a, delBtn);
      linksListEl.appendChild(wrap);
    });
  }

  function addLink(name, url) {
    name = name.trim();
    url = normalizeUrl(url);
    if (!name || !url) return;
    links.push({ id: Date.now(), name, url });
    saveLinks();
    renderLinks();
  }

  function deleteLink(id) {
    links = links.filter((l) => l.id !== id);
    saveLinks();
    renderLinks();
  }

  linkForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addLink(linkNameInput.value, linkUrlInput.value);
    linkNameInput.value = "";
    linkUrlInput.value = "";
    linkNameInput.focus();
  });

  renderLinks();
})();
