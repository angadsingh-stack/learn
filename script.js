
"use strict";

/*
  LearnSphere frontend demo.
  localStorage is NOT secure authentication.
  Do not use this account system for real users or sensitive data.
*/

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const KEYS = {
  users: "learnsphere_users_v1",
  session: "learnsphere_session_v1",
  data: "learnsphere_data_v1"
};

const courses = [
  { id: "dsa", title: "Data Structures & Algorithms", short: "DSA",
    category: "Computer Science", level: "Intermediate", duration: "8 weeks",
    description: "Learn arrays, linked lists, stacks, queues, trees and algorithms.",
    color: "#e0e7ff", ink: "#4338ca" },
  { id: "cpp", title: "C++ Programming", short: "C++",
    category: "Programming", level: "Beginner", duration: "6 weeks",
    description: "Learn variables, loops, functions, classes and object-oriented programming.",
    color: "#dbeafe", ink: "#1d4ed8" },
  { id: "java", title: "Java Programming", short: "Java",
    category: "Programming", level: "Beginner", duration: "7 weeks",
    description: "Explore Java fundamentals, classes, inheritance and exceptions.",
    color: "#ffedd5", ink: "#c2410c" },
  { id: "python", title: "Python Programming", short: "Py",
    category: "Programming", level: "Beginner", duration: "5 weeks",
    description: "Start coding with Python, data types, functions and modules.",
    color: "#dcfce7", ink: "#15803d" },
  { id: "html", title: "HTML Fundamentals", short: "HTML",
    category: "Web Development", level: "Beginner", duration: "2 weeks",
    description: "Build web page structures with semantic HTML and forms.",
    color: "#ffedd5", ink: "#ea580c" },
  { id: "css", title: "CSS & Responsive Design", short: "CSS",
    category: "Web Development", level: "Beginner", duration: "3 weeks",
    description: "Style web pages using Flexbox, Grid, animations and media queries.",
    color: "#cffafe", ink: "#0e7490" }
];

const quizzes = [
  { q: "Which data structure follows FIFO?", options: ["Stack", "Queue", "Tree", "Graph"], answer: 1,
    explanation: "A queue follows First In, First Out (FIFO)." },
  { q: "Which symbol ends a normal statement in C++?", options: [":", ";", ".", ","], answer: 1,
    explanation: "A semicolon terminates most C++ statements." },
  { q: "Which keyword is used to inherit a class in Java?", options: ["inherits", "implements", "extends", "superclass"], answer: 2,
    explanation: "The extends keyword is used for class inheritance in Java." },
  { q: "Which Python type stores key-value pairs?", options: ["list", "tuple", "set", "dict"], answer: 3,
    explanation: "A dictionary (dict) stores key-value pairs." },
  { q: "Which HTML element creates a hyperlink?", options: ["<link>", "<a>", "<href>", "<url>"], answer: 1,
    explanation: "The anchor element <a> creates a hyperlink." },
  { q: "Which CSS property changes text color?", options: ["font-style", "background", "color", "text-decoration"], answer: 2,
    explanation: "The color property sets the foreground text color." },
  { q: "What is the average time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n²)", "O(1) always"], answer: 1,
    explanation: "Binary search halves the search interval each step, giving O(log n) time." },
  { q: "Which loop checks its condition before each iteration?", options: ["while", "do-while only", "Neither", "All loops skip conditions"], answer: 0,
    explanation: "A while loop checks its condition before executing its body." },
  { q: "Which HTML attribute provides alternative image text?", options: ["title", "src", "alt", "name"], answer: 2,
    explanation: "The alt attribute provides alternative text for an image." },
  { q: "Which CSS layout system uses rows and columns?", options: ["Float only", "Grid", "Outline", "Opacity"], answer: 1,
    explanation: "CSS Grid is designed for two-dimensional row and column layouts." }
];

let authMode = "login";
let currentUser = null;
let state = null;
let activeQuiz = null;
let toastTimeout = null;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    notify("Unable to save data. Check browser storage settings.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function makeId() {
  return window.crypto?.randomUUID?.() ||
    "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function notify(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2800);
}

function newUserState() {
  return {
    watchlist: [],
    progress: {},
    completed: [],
    quizScores: [],
    notifications: [{
      id: makeId(),
      title: "Welcome to LearnSphere!",
      message: "Explore your courses and start learning today.",
      read: false,
      time: new Date().toISOString()
    }],
    activities: [],
    profile: { bio: "", phone: "" }
  };
}

function loadUserState() {
  const all = readJSON(KEYS.data, {});
  const saved = all[currentUser.email] || {};
  return {
    ...newUserState(),
    ...saved,
    watchlist: Array.isArray(saved.watchlist) ? saved.watchlist : [],
    progress: saved.progress || {},
    completed: Array.isArray(saved.completed) ? saved.completed : [],
    quizScores: Array.isArray(saved.quizScores) ? saved.quizScores : [],
    notifications: Array.isArray(saved.notifications) ? saved.notifications : [],
    activities: Array.isArray(saved.activities) ? saved.activities : [],
    profile: { bio: "", phone: "", ...(saved.profile || {}) }
  };
}

function saveState() {
  if (!currentUser || !state) return;
  const all = readJSON(KEYS.data, {});
  all[currentUser.email] = state;
  writeJSON(KEYS.data, all);
}

function recordActivity(title, detail, icon = "✓") {
  state.activities.unshift({ title, detail, icon, time: new Date().toISOString() });
  state.activities = state.activities.slice(0, 12);
  saveState();
}

function addNotification(title, message) {
  state.notifications.unshift({
    id: makeId(), title, message,
    read: false, time: new Date().toISOString()
  });
  state.notifications = state.notifications.slice(0, 30);
  saveState();
}

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" :
    date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function timeAgo(value) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return dateLabel(value);
}

function progressOf(id) {

function progressOf(id) {
  const saved = state.progress[id];
  const value = typeof saved === "object" && saved !== null
    ? saved.percent
    : saved;

  return Math.min(100, Math.max(0, Number(value) || 0));
}
}

function courseById(id) {
  return courses.find(course => course.id === id);
}

/* Authentication */

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("#authTitle").textContent = signup ? "Create your account" : "Welcome back!";
  $("#authSubtitle").textContent = signup
    ? "Join LearnSphere and start learning."
    : "Sign in to continue learning.";
  $("#nameField").classList.toggle("hidden", !signup);
  $("#authName").required = signup;
  $("#authPassword").autocomplete = signup ? "new-password" : "current-password";
  $("#authSubmit").textContent = signup ? "Create Account" : "Sign In";
  $("#switchText").textContent = signup
    ? "Already have an account?" : "Don't have an account?";
  $("#switchAuth").textContent = signup ? "Sign In" : "Sign Up";
  $("#authError").textContent = "";
}

function authenticate(event) {
  event.preventDefault();

  const email = $("#authEmail").value.trim().toLowerCase();
  const password = $("#authPassword").value;
  const name = $("#authName").value.trim();
  $("#authError").textContent = "";

  if (!email || !$("#authEmail").validity.valid) {
    $("#authError").textContent = "Enter a valid email address.";
    return;
  }
  if (password.length < 6) {
    $("#authError").textContent = "Password must be at least 6 characters.";
    return;
  }

  const users = readJSON(KEYS.users, []);

  if (authMode === "signup") {
    if (name.length < 2) {
      $("#authError").textContent = "Enter your full name.";
      return;
    }
    if (users.some(user => user.email === email)) {
      $("#authError").textContent = "This email already has a demo account. Please sign in.";
      return;
    }

    // Demo only: passwords in this localStorage-based example are NOT secure.
    const user = { id: makeId(), name, email, password };
    users.push(user);

    if (!writeJSON(KEYS.users, users)) return;

    currentUser = user;
    state = newUserState();
    saveState();
    enterApp();
    notify("Account created successfully!");
    return;
  }

  const user = users.find(item => item.email === email && item.password === password);
  if (!user) {
    $("#authError").textContent = "Incorrect email or password. Sign up first if you are new.";
    return;
  }

  currentUser = user;
  writeJSON(KEYS.session, { email: user.email });
  state = loadUserState();
  enterApp();
  notify("Welcome back, " + user.name + "!");
}

function enterApp() {
  writeJSON(KEYS.session, { email: currentUser.email });
  $("#authScreen").classList.add("hidden");
  $("#appScreen").classList.remove("hidden");
  updateHeader();
  renderPage("dashboard");
}

function updateHeader() {
  $("#headerName").textContent = currentUser.name;
  $("#headerAvatar").textContent = currentUser.name.charAt(0).toUpperCase();
  const unread = state.notifications.filter(item => !item.read).length;
  $("#notificationCount").textContent = unread;
  $("#notificationCount").classList.toggle("hidden", unread === 0);
}

function logout() {
  localStorage.removeItem(KEYS.session);
  currentUser = null;
  state = null;
  activeQuiz = null;
  $("#appScreen").classList.add("hidden");
  $("#authScreen").classList.remove("hidden");
  $("#authForm").reset();
  setAuthMode("login");
  $("#sidebar").classList.remove("open");
  notify("You have logged out.");
}

/* Navigation */

const pageNames = {
  dashboard: "Dashboard",
  courses: "Explore Courses",
  watchlist: "My Watchlist",
  quiz: "Quiz Center",
  certificates: "Certificates",
  notifications: "Notifications",
  profile: "My Profile",
  contact: "Contact Us"
};

function renderPage(page) {
  if (!pageNames[page]) page = "dashboard";

  $$(".nav-item[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("#pageCrumb").textContent = pageNames[page];
  $("#sidebar").classList.remove("open");

  const pages = {
    dashboard: renderDashboard,
    courses: renderCourses,
    watchlist: renderWatchlist,
    quiz: renderQuiz,
    certificates: renderCertificates,
    notifications: renderNotifications,
    profile: renderProfile,
    contact: renderContact
  };

  $("#pageContent").innerHTML = pages[page]();
  $("#pageContent").dataset.page = page;
}

function courseCard(course) {
  const progress = progressOf(course.id);
  const saved = state.watchlist.includes(course.id);
  const completed = state.completed.includes(course.id);

  return `
    <article class="course-card">
      <div class="course-cover" style="--cover:${course.color};--cover-text:${course.ink}">
        <span class="course-symbol">${escapeHTML(course.short)}</span>
        <span class="course-tag">${escapeHTML(course.level)}</span>
      </div>
      <div class="course-body">
        <div class="course-meta">
          <span>${escapeHTML(course.category)}</span>
          <span>${escapeHTML(course.duration)}</span>
        </div>
        <h3>${escapeHTML(course.title)}</h3>
        <p>${escapeHTML(course.description)}</p>
        <div class="course-meta">
          <span>${completed ? "Completed" : progress ? "In progress" : "Not started"}</span>
          <strong>${progress}%</strong>
        </div>
        <div class="progress-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="course-actions">
          <button class="btn btn-primary" data-action="open-course" data-id="${course.id}">
            ${completed ? "Review Course" : "Continue"}
          </button>
          <button class="heart-button ${saved ? "saved" : ""}"
                  data-action="toggle-watch" data-id="${course.id}"
                  aria-label="${saved ? "Remove from" : "Add to"} watchlist">
            ${saved ? "♥" : "♡"}
          </button>
        </div>
      </div>
    </article>`;
}

function statCard(label, value, icon, foot) {
  return `<article class="stat-card">
    <div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div>
    <div class="stat-value">${value}</div>
    <div class="stat-foot">${foot}</div>
  </article>`;
}

function renderDashboard() {
  const completed = state.completed.length;
  const inProgress = courses.filter(c => progressOf(c.id) > 0 && progressOf(c.id) < 100).length;
  const average = state.quizScores.length
    ? Math.round(state.quizScores.reduce((sum, item) => sum + item.score, 0) / state.quizScores.length)
    : 0;

  const activities = state.activities.slice(0, 4);
  return `
    <section class="welcome-banner">
      <div>
        <h1>Welcome back, ${escapeHTML(currentUser.name.split(" ")[0])}! 👋</h1>
        <p>Keep building your skills. Every lesson takes you one step further.</p>
        <button class="btn" data-goto="courses">Explore Courses →</button>
      </div>
      <div style="font-size:64px;position:relative;z-index:1" aria-hidden="true">🎓</div>
    </section>

    <div class="grid stats-grid">
      ${statCard("Available Courses", courses.length, "▤", "Explore your next skill")}
      ${statCard("In Progress", inProgress, "◷", "Courses you've started")}
      ${statCard("Completed", completed, "✓", "Courses finished")}
      ${statCard("Quiz Average", average + "%", "◎", "Across your quiz attempts")}
    </div>

    <div class="section-heading">
      <h2>Continue Learning</h2>
      <button class="link-button" data-goto="courses">View all courses →</button>
    </div>
    <div class="grid course-grid">
      ${courses.filter(c => progressOf(c.id) > 0 && progressOf(c.id) < 100).slice(0, 3).map(courseCard).join("") ||
        courses.slice(0, 3).map(courseCard).join("")}
    </div>

    <div class="section-heading"><h2>Your Learning Activity</h2></div>
    <section class="panel">
      ${activities.length ? activities.map(item => `
        <div class="activity-row">
          <span class="activity-icon">${escapeHTML(item.icon)}</span>
          <div class="activity-text">
            <strong>${escapeHTML(item.title)}</strong>
            <small>${escapeHTML(item.detail)} · ${timeAgo(item.time)}</small>
          </div>
        </div>`).join("") :
        `<div class="empty-state">Your learning activity will appear here after you begin a course or take a quiz.</div>`}
    </section>`;
}

function renderCourses() {
  return `
    <div class="page-heading">
      <div><h1>Explore Courses</h1><p>Find your next skill and learn at your own pace.</p></div>
    </div>
    <div class="section-heading">
      <h2>All Courses (${courses.length})</h2>
      <input id="courseSearch" class="search-input" type="search"
             placeholder="Search courses..." aria-label="Search courses">
    </div>
    <div id="courseGrid" class="grid course-grid">${courses.map(courseCard).join("")}</div>`;
}

function renderWatchlist() {
  const saved = courses.filter(course => state.watchlist.includes(course.id));
  return `
    <div class="page-heading">
      <div><h1>My Watchlist</h1><p>Courses you've saved for later.</p></div>
    </div>
    ${saved.length
      ? `<div class="grid course-grid">${saved.map(courseCard).join("")}</div>`
      : `<div class="empty-state"><strong>Your watchlist is empty</strong>Save a course using the heart icon.<br><button class="btn btn-primary gap-top" data-goto="courses">Browse Courses</button></div>`}`;
}

function renderCourseDetail(id) {
  const course = courseById(id);
  if (!course) return renderCourses();

  const progress = progressOf(id);
  const completed = state.completed.includes(id);

  return `
    <div class="page-heading">
      <div><h1>${escapeHTML(course.title)}</h1><p>${escapeHTML(course.category)} · ${escapeHTML(course.duration)}</p></div>
      <button class="btn btn-outline" data-goto="courses">← All Courses</button>
    </div>
    <section class="panel course-detail">
      <div class="course-cover" style="--cover:${course.color};--cover-text:${course.ink};border-radius:12px;margin-bottom:22px">
        <span class="course-symbol">${escapeHTML(course.short)}</span>
        <span class="course-tag">${escapeHTML(course.level)}</span>
      </div>
      <h2>About this course</h2>
      <p>${escapeHTML(course.description)}</p>
      <h3>What you'll learn</h3>
      <ul>
        <li>Understand the key concepts and terminology.</li>
        <li>Practice the fundamentals through small exercises.</li>
        <li>Review your progress and test your understanding.</li>
      </ul>
      <div class="lesson-box">
        <strong>Lesson 1: Introduction</strong>
        <p>Start by learning the basic concepts of ${escapeHTML(course.title)}. Review the important terms, understand the fundamentals, and practice with a small example.</p>
        <p><strong>Practice task:</strong> Write down three key ideas you learned in this lesson.</p>
      </div>
      <p><strong>Course progress: ${progress}%</strong></p>
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="wrap-actions gap-top">
        ${progress < 100
          ? `<button class="btn btn-primary" data-action="advance-course" data-id="${id}">${progress === 0 ? "Start Learning" : "Complete Next Lesson"}</button>`
          : `<span class="badge">Course Completed</span>`}
        <button class="btn btn-outline" data-action="toggle-watch" data-id="${id}">
          ${state.watchlist.includes(id) ? "♥ Remove from Watchlist" : "♡ Add to Watchlist"}
        </button>
      </div>
      <p class="muted gap-top">This is sample learning content. Add your own full lessons, videos, and exercises to make this a complete learning platform.</p>
    </section>`;
}

/* Quiz */

function renderQuiz() {
  if (!activeQuiz) {
    const last = state.quizScores[0];
    return `
      <div class="page-heading"><div><h1>Quiz Center</h1><p>Test your programming knowledge with a 10-question quiz.</p></div></div>
      <section class="panel" style="max-width:760px">
        <div class="stat-icon" style="width:54px;height:54px;font-size:25px">◎</div>
        <h2 style="margin-top:18px">Programming Fundamentals Quiz</h2>
        <p class="muted" style="line-height:1.8">10 multiple-choice questions · One point per correct answer. Review the explanations after each answer.</p>
        ${last ? `<div class="lesson-box">Last score: <strong>${last.score}/10 (${last.percent}%)</strong> · ${dateLabel(last.time)}</div>` : ""}
        <button class="btn btn-primary gap-top" data-action="start-quiz">Start Quiz →</button>
        <h3 class="gap-top">Previous attempts</h3>
        ${state.quizScores.length ? state.quizScores.slice(0, 5).map((item, i) => `
          <div class="activity-row">
            <span class="activity-icon">${i + 1}</span>
            <div class="activity-text"><strong>${item.score}/10 · ${item.percent}%</strong><small>${dateLabel(item.time)}</small></div>
          </div>`).join("") : `<p class="muted">No attempts yet. Start your first quiz!</p>`}
      </section>`;
  }

  const index = activeQuiz.index;
  const question = quizzes[index];

  return `
    <div class="page-heading"><div><h1>Programming Quiz</h1><p>Question ${index + 1} of ${quizzes.length}</p></div></div>
    <section class="panel" style="max-width:760px">
      <div class="course-meta"><span>Question ${index + 1}</span><strong>${activeQuiz.answers.filter(a => a !== null).length}/${quizzes.length} answered</strong></div>
      <div class="progress-track"><div class="progress-fill" style="width:${(index + 1) / quizzes.length * 100}%"></div></div>
      <h2 class="gap-top" style="line-height:1.6">${escapeHTML(question.q)}</h2>
      <div class="quiz-options">
        ${question.options.map((option, i) => `
          <button class="quiz-option ${activeQuiz.selected === i ? "selected" : ""}"
                  data-action="select-answer" data-index="${i}">
            <strong>${String.fromCharCode(65 + i)}.</strong> ${escapeHTML(option)}
          </button>`).join("")}
      </div>
      ${activeQuiz.feedback ? `<div class="quiz-feedback">${activeQuiz.feedback}</div>` : ""}
      <div class="wrap-actions">
        <button class="btn btn-primary" data-action="${activeQuiz.feedback ? "next-question" : "check-answer"}"
                ${activeQuiz.selected === null && !activeQuiz.feedback ? "disabled" : ""}>
          ${activeQuiz.feedback ? (index === quizzes.length - 1 ? "Finish Quiz" : "Next Question →") : "Check Answer"}
        </button>
        <button class="btn btn-outline" data-action="cancel-quiz">Exit Quiz</button>
      </div>
    </section>`;
}

function startQuiz() {
  activeQuiz = { index: 0, selected: null, feedback: "", score: 0, answers: Array(quizzes.length).fill(null) };
  renderPage("quiz");
}

function selectAnswer(index) {
  if (!activeQuiz || activeQuiz.feedback) return;
  activeQuiz.selected = index;
  renderPage("quiz");
}

function checkAnswer() {
  if (!activeQuiz || activeQuiz.selected === null) return;
  const question = quizzes[activeQuiz.index];
  const correct = activeQuiz.selected === question.answer;

  activeQuiz.answers[activeQuiz.index] = activeQuiz.selected;
  if (correct) activeQuiz.score++;

  activeQuiz.feedback = `${correct ? "✓ Correct!" : "✗ Not quite."} ${escapeHTML(question.explanation)}`;
  renderPage("quiz");
}

function nextQuestion() {
  if (activeQuiz.index < quizzes.length - 1) {
    activeQuiz.index++;
    activeQuiz.selected = null;
    activeQuiz.feedback = "";
    renderPage("quiz");
    return;
  }

  const result = {
    score: activeQuiz.score,
    percent: Math.round(activeQuiz.score / quizzes.length * 100),
    time: new Date().toISOString()
  };

  state.quizScores.unshift(result);
  state.quizScores = state.quizScores.slice(0, 30);
  recordActivity("Completed programming quiz", `Score: ${result.score}/10 (${result.percent}%)`, "◎");
  addNotification("Quiz completed", `You scored ${result.score}/10 (${result.percent}%).`);
  activeQuiz = null;
  saveState();
  renderQuiz();
  notify(`Quiz complete! Your score: ${result.score}/10`);
}

/* Certificates */

function renderCertificates() {
  const completedCourses = courses.filter(course => state.completed.includes(course.id));

  return `
    <div class="page-heading"><div><h1>My Certificates</h1><p>View your course completion achievements.</p></div></div>
    ${completedCourses.length
      ? `<div class="grid course-grid">${completedCourses.map(course => `
        <article class="certificate-card">
          <div class="trophy">🏆</div>
          <p class="eyebrow">COURSE COMPLETION</p>
          <h2>${escapeHTML(course.title)}</h2>
          <p>Presented to <strong>${escapeHTML(currentUser.name)}</strong></p>
          <p class="muted">Completed ${dateLabel(state.progress[course.id]?.completedAt || new Date().toISOString())}</p>
          <span class="badge">Demo Certificate</span>
          <div class="gap-top"><button class="btn btn-primary" data-action="print-certificate" data-id="${course.id}">Print / Save PDF</button></div>
        </article>`).join("")}</div>`
      : `<div class="empty-state"><strong>No certificates yet</strong>Complete a course to unlock its demo certificate.<br><button class="btn btn-primary gap-top" data-goto="courses">Explore Courses</button></div>`}
    <p class="muted gap-top">These are practice certificates created by this demo. They are not official academic credentials.</p>`;
}

function printCertificate(id) {
  const course = courseById(id);
  if (!course || !state.completed.includes(id)) return;

  const popup = window.open("", "_blank");
  if (!popup) {
    notify("Allow pop-ups to print your certificate.");
    return;
  }

  popup.document.write(`<!DOCTYPE html><html><head><title>Demo Certificate</title>
    <style>
      body{font-family:Arial,sans-serif;text-align:center;padding:40px;color:#172033}
      .certificate{border:8px double #2563eb;padding:45px 20px;max-width:750px;margin:30px auto}
      h1{color:#1d4ed8;font-size:35px}h2{font-size:27px}p{line-height:1.8}
      .note{font-size:12px;color:#64748b}
      @media print{button{display:none}}
    </style></head><body><div class="certificate">
    <p>LEARNSPHERE · DEMO PROJECT</p><h1>Certificate of Completion</h1>
    <p>This demo certificate recognizes that</p><h2>${escapeHTML(currentUser.name)}</h2>
    <p>has completed the sample course</p><h2>${escapeHTML(course.title)}</h2>
    <p>Issued on ${dateLabel(state.progress[id]?.completedAt || new Date().toISOString())}</p>
    <p class="note">Practice certificate only. Not an accredited qualification.</p>
    </div><button onclick="window.print()">Print / Save PDF</button></body></html>`);
  popup.document.close();
}

/* Notifications and profile */

function renderNotifications() {
  const items = state.notifications;
  return `
    <div class="page-heading">
      <div><h1>Notifications</h1><p>Stay updated on your learning activities.</p></div>
      ${items.some(item => !item.read) ? `<button class="btn btn-outline" data-action="read-all">Mark all read</button>` : ""}
    </div>
    <section class="panel">
      ${items.length ? items.map(item => `
        <div class="notification-item ${item.read ? "" : "unread"}">
          <span class="activity-icon">${item.read ? "✓" : "●"}</span>
          <div style="flex:1;min-width:0">
            <strong>${escapeHTML(item.title)}</strong>
            <p>${escapeHTML(item.message)}</p>
            <small>${timeAgo(item.time)}</small>
          </div>
          ${!item.read ? `<button class="link-button" data-action="read-notification" data-id="${escapeHTML(item.id)}">Mark read</button>` : ""}
        </div>`).join("") : `<div class="empty-state">You're all caught up!</div>`}
    </section>`;
}

function renderProfile() {
  return `
    <div class="page-heading"><div><h1>My Profile</h1><p>Manage your student information.</p></div></div>
    <div class="profile-layout">
      <section class="panel profile-summary">
        <div class="profile-avatar">${escapeHTML(currentUser.name.charAt(0).toUpperCase())}</div>
        <h2>${escapeHTML(currentUser.name)}</h2>
        <p>${escapeHTML(currentUser.email)}</p>
        <span class="badge">Student · Demo Account</span>
        <div class="grid stats-grid gap-top" style="grid-template-columns:1fr 1fr">
          <div><strong style="font-size:23px">${state.completed.length}</strong><p class="muted">Completed</p></div>
          <div><strong style="font-size:23px">${state.quizScores.length}</strong><p class="muted">Quiz Attempts</p></div>
        </div>
      </section>
      <section class="panel">
        <h2>Edit Profile</h2>
        <form id="profileForm" class="inline-form">
          <div><label for="profileName">Full name</label><input id="profileName" required minlength="2" maxlength="80" value="${escapeHTML(currentUser.name)}"></div>
          <div><label for="profileEmail">Email address</label><input id="profileEmail" value="${escapeHTML(currentUser.email)}" disabled></div>
          <div><label for="profilePhone">Phone (optional)</label><input id="profilePhone" type="tel" maxlength="25" value="${escapeHTML(state.profile.phone)}"></div>
          <div><label for="profileBio">About me</label><textarea id="profileBio" maxlength="500" placeholder="Tell us about your learning goals...">${escapeHTML(state.profile.bio)}</textarea></div>
          <button class="btn btn-primary" type="submit">Save Changes</button>
        </form>
      </section>
    </div>`;
}

function renderContact() {
  return `
    <div class="page-heading"><div><h1>Contact Us</h1><p>Have a question or suggestion? Send us a message.</p></div></div>
    <div class="two-column">
      <section class="panel">
        <h2>Send a Message</h2>
        <form id="contactForm" class="inline-form">
          <div><label for="contactName">Your name</label><input id="contactName" required maxlength="80" value="${escapeHTML(currentUser.name)}"></div>
          <div><label for="contactEmail">Email address</label><input id="contactEmail" type="email" required maxlength="150" value="${escapeHTML(currentUser.email)}"></div>
          <div><label for="contactSubject">Subject</label><input id="contactSubject" required maxlength="120" placeholder="How can we help?"></div>
          <div><label for="contactMessage">Message</label><textarea id="contactMessage" required maxlength="2000" placeholder="Write your message..."></textarea></div>
          <button class="btn btn-primary" type="submit">Save Demo Message</button>
        </form>
        <p class="muted">This demo stores messages in this browser only. It does not send email.</p>
      </section>
      <section class="panel">
        <h2>How can we help?</h2>
        <div class="activity-row"><span class="activity-icon">▤</span><div class="activity-text"><strong>Course support</strong><small>Questions about lessons and progress.</small></div></div>
        <div class="activity-row"><span class="activity-icon">◎</span><div class="activity-text"><strong>Quiz support</strong><small>Help understanding quiz questions.</small></div></div>
        <div class="activity-row"><span class="activity-icon">✉</span><div class="activity-text"><strong>General enquiries</strong><small>Share your feedback or suggestions.</small></div></div>
      </section>
    </div>`;
}

/* Actions */

function toggleWatch(id) {
  if (!courseById(id)) return;
  if (state.watchlist.includes(id)) {
    state.watchlist = state.watchlist.filter(item => item !== id);
    notify("Removed from watchlist.");
  } else {
    state.watchlist.push(id);
    notify("Added to watchlist.");
    addNotification("Course saved", `${courseById(id).title} was added to your watchlist.`);
  }
  saveState();
  renderPage($("#pageContent").dataset.page || "courses");
}

function advanceCourse(id) {
  const course = courseById(id);
  if (!course) return;

  const oldProgress = progressOf(id);
  const nextProgress = Math.min(100, oldProgress + 25);
  state.progress[id] = {
    percent: nextProgress,
    completedAt: nextProgress === 100 ? new Date().toISOString() :
      (state.progress[id]?.completedAt || null)
  };

  if (nextProgress === 100 && !state.completed.includes(id)) {
    state.completed.push(id);
    recordActivity("Course completed", course.title, "🏆");
    addNotification("Course completed!", `Congratulations! You completed ${course.title}. A demo certificate is now available.`);
    notify("Course completed! Demo certificate unlocked.");
  } else {
    recordActivity("Learning progress updated", `${course.title}: ${nextProgress}%`, "✓");
    notify(`Progress updated to ${nextProgress}%.`);
  }

  saveState();
  updateHeader();
  renderCourseDetail(id);
}

function saveProfile(event) {
  event.preventDefault();
  const name = $("#profileName").value.trim();
  if (name.length < 2) {
    notify("Please enter a valid name.");
    return;
  }

  const users = readJSON(KEYS.users, []);
  const index = users.findIndex(user => user.email === currentUser.email);
  if (index < 0) {
    notify("Demo account could not be found. Please log in again.");
    return;
  }

  users[index].name = name;
  if (!writeJSON(KEYS.users, users)) return;

  currentUser = users[index];
  state.profile.phone = $("#profilePhone").value.trim();
  state.profile.bio = $("#profileBio").value.trim();
  saveState();
  updateHeader();
  renderPage("profile");
  notify("Profile updated.");
}

function saveContact(event) {
  event.preventDefault();
  const subject = $("#contactSubject").value.trim();
  const message = $("#contactMessage").value.trim();
  if (!subject || !message) {
    notify("Please complete all required fields.");
    return;
  }

  const all = readJSON("learnsphere_demo_messages_v1", []);
  all.unshift({
    id: makeId(),
    email: currentUser.email,
    name: $("#contactName").value.trim(),
    subject,
    message,
    time: new Date().toISOString()
  });

  if (!writeJSON("learnsphere_demo_messages_v1", all)) return;
  recordActivity("Contact form submitted", subject, "✉");
  $("#contactForm").reset();
  notify("Demo message saved in this browser. It was not emailed.");
}

function markRead(id) {
  const item = state.notifications.find(note => note.id === id);
  if (item) item.read = true;
  saveState();
  updateHeader();
  renderPage("notifications");
}

function markAllRead() {
  state.notifications.forEach(item => item.read = true);
  saveState();
  updateHeader();
  renderPage("notifications");
  notify("All notifications marked as read.");
}

/* Event listeners */

$("#authForm").addEventListener("submit", authenticate);

$("#switchAuth").addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "signup" : "login");
});

$("#logoutBtn").addEventListener("click", logout);

$("#menuToggle").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

document.addEventListener("click", event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton && pageNames[pageButton.dataset.page]) {
    event.preventDefault();
    renderPage(pageButton.dataset.page);
    return;
  }

  const gotoButton = event.target.closest("[data-goto]");
  if (gotoButton) {
    event.preventDefault();
    renderPage(gotoButton.dataset.goto);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton || !currentUser) return;

  const { action, id, index } = actionButton.dataset;

  switch (action) {
    case "open-course":
      renderCourseDetail(id);
      break;
    case "toggle-watch":
      toggleWatch(id);
      break;
    case "advance-course":
      advanceCourse(id);
      break;
    case "start-quiz":
      startQuiz();
      break;
    case "select-answer":
      selectAnswer(Number(index));
      break;
    case "check-answer":
      checkAnswer();
      break;
    case "next-question":
      nextQuestion();
      break;
    case "cancel-quiz":
      activeQuiz = null;
      renderPage("quiz");
      break;
    case "print-certificate":
      printCertificate(id);
      break;
    case "read-notification":
      markRead(id);
      break;
    case "read-all":
      markAllRead();
      break;
  }
});

$("#pageContent").addEventListener("input", event => {
  if (event.target.id !== "courseSearch") return;
  const query = event.target.value.trim().toLowerCase();
  const filtered = courses.filter(course =>
    `${course.title} ${course.category} ${course.description}`.toLowerCase().includes(query)
  );
  $("#courseGrid").innerHTML = filtered.map(courseCard).join("") ||
    `<div class="empty-state">No courses match "${escapeHTML(query)}".</div>`;
});

$("#pageContent").addEventListener("submit", event => {
  if (event.target.id === "profileForm") saveProfile(event);
  if (event.target.id === "contactForm") saveContact(event);
});

/* Restore a demo session when the page is refreshed. */

function initialize() {
  setAuthMode("login");

  const session = readJSON(KEYS.session, null);
  const users = readJSON(KEYS.users, []);
  const user = session && users.find(item => item.email === session.email);

  if (user) {
    currentUser = user;
    state = loadUserState();
    enterApp();
  } else {
    localStorage.removeItem(KEYS.session);
    $("#authScreen").classList.remove("hidden");
    $("#appScreen").classList.add("hidden");
  }
}

initialize();
