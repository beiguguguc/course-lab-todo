"use strict";

// 第一步：找到页面元素。后面通过这些变量读取输入和更新页面。
const form = document.querySelector("#task-form");
const courseInput = document.querySelector("#course-input");
const titleInput = document.querySelector("#title-input");
const courseFilter = document.querySelector("#course-filter");
const courseSuggestions = document.querySelector("#course-suggestions");
const statusButtons = document.querySelectorAll("[data-status]");
const taskList = document.querySelector("#task-list");
const errorMessage = document.querySelector("#error-message");
const successMessage = document.querySelector("#success-message");
const STORAGE_KEY = "course-lab-todo-learning-v1";
const statusNames = { active: "未完成", completed: "已完成", all: "全部" };

// 第二步：tasks 始终包含全部任务。筛选条件单独保存，不修改任务数据。
let statusFilter = "active";
let storageReady = true;
let tasks = loadTasks();

function showMessage(text, isError = false) {
  errorMessage.hidden = !isError;
  successMessage.hidden = isError;
  (isError ? errorMessage : successMessage).textContent = text;
}

// 第三步：读取和保存。写入成功后才更新页面，避免显示与保存结果不一致。
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return [];
    const records = JSON.parse(saved);
    const valid = Array.isArray(records) && records.every(task =>
      task && typeof task.id === "string" && task.id.length > 0 &&
      typeof task.course === "string" && task.course.trim().length > 0 &&
      typeof task.title === "string" && task.title.trim().length > 0 &&
      typeof task.completed === "boolean"
    );
    if (!valid || new Set(records.map(task => task.id)).size !== records.length) {
      throw new Error("任务记录格式不正确");
    }
    return records;
  } catch (error) {
    storageReady = false;
    showMessage("无法读取本地任务，已暂停添加，避免覆盖原数据。请检查浏览器存储设置或刷新重试。", true);
    return [];
  }
}

function saveTasks(nextTasks) {
  if (!storageReady) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));
    tasks = nextTasks;
    render();
    return true;
  } catch (error) {
    showMessage("保存失败，本次修改未生效。请检查浏览器存储权限或可用空间后重试。", true);
    render();
    return false;
  }
}

// 第四步：添加、完成和删除。用唯一 id 找任务，而不是用列表中的位置。
form.addEventListener("submit", event => {
  event.preventDefault();
  const course = courseInput.value.trim();
  const title = titleInput.value.trim();
  courseInput.setAttribute("aria-invalid", String(!course));
  titleInput.setAttribute("aria-invalid", String(!title));
  if (!course || !title) {
    showMessage("请填写课程名称和实验任务，内容不能只有空格。", true);
    (!course ? courseInput : titleInput).focus();
    return;
  }
  const newTask = { id: crypto.randomUUID(), course, title, completed: false };
  if (saveTasks([...tasks, newTask])) {
    titleInput.value = "";
    titleInput.focus();
    showMessage("任务已添加。若当前筛选条件不匹配，可切换到未完成和全部课程查看。");
  }
});

for (const input of [courseInput, titleInput]) {
  input.addEventListener("input", () => input.removeAttribute("aria-invalid"));
}

function setCompleted(id, completed) {
  const nextTasks = tasks.map(task => task.id === id ? { ...task, completed } : task);
  if (saveTasks(nextTasks)) {
    showMessage(completed ? "已完成！任务记录已保留，可在已完成列表查看。" : "已恢复为未完成任务。");
  }
}

function deleteTask(id) {
  if (saveTasks(tasks.filter(task => task.id !== id))) {
    showMessage("这条任务已删除，保存的数据已同步更新。");
  }
}

// 第五步：两个条件同时成立，任务才显示。filter() 返回新数组。
function getVisibleTasks() {
  return tasks.filter(task => {
    const courseMatches = !courseFilter.value || task.course === courseFilter.value;
    const statusMatches = statusFilter === "all" ||
      (statusFilter === "completed" ? task.completed : !task.completed);
    return courseMatches && statusMatches;
  });
}

statusButtons.forEach(button => {
  button.addEventListener("click", () => {
    statusFilter = button.dataset.status;
    render();
  });
});
courseFilter.addEventListener("change", render);

function renderCourseOptions() {
  const previousCourse = courseFilter.value;
  const courses = [...new Set(tasks.map(task => task.course))]
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
  courseFilter.replaceChildren(new Option("全部课程", ""));
  courseSuggestions.replaceChildren();
  for (const course of courses) {
    courseFilter.add(new Option(course, course));
    courseSuggestions.append(new Option(course, course));
  }
  // 删除某门课的最后一条任务后，自动回到全部课程。
  courseFilter.value = courses.includes(previousCourse) ? previousCourse : "";
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-completed" : ""}`;
  const label = document.createElement("label");
  label.className = "task-label";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `${task.completed ? "取消完成" : "标记完成"}：${task.title}（${task.course}）`);
  checkbox.addEventListener("change", () => setCompleted(task.id, checkbox.checked));
  const content = document.createElement("span");
  content.className = "task-content";
  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;
  const course = document.createElement("span");
  course.className = "course-tag";
  course.textContent = task.course;
  content.append(title, course);
  label.append(checkbox, content);
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.setAttribute("aria-label", `删除：${task.title}（${task.course}）`);
  deleteButton.title = "删除任务";
  // 这段 SVG 是固定图标；用户输入始终通过 textContent 显示。
  deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';
  deleteButton.addEventListener("click", () => deleteTask(task.id));
  item.append(label, deleteButton);
  return item;
}

// 第六步：统一刷新统计、筛选选项、任务列表和空状态。
function render() {
  renderCourseOptions();
  const completedCount = tasks.filter(task => task.completed).length;
  document.querySelector("#active-count").textContent = tasks.length - completedCount;
  document.querySelector("#completed-count").textContent = completedCount;
  document.querySelector("#total-count").textContent = tasks.length;
  statusButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.status === statusFilter));
  });
  const visibleTasks = getVisibleTasks();
  taskList.replaceChildren(...visibleTasks.map(createTaskElement));
  document.querySelector("#list-summary").textContent =
    `${statusNames[statusFilter]} · ${courseFilter.value || "全部课程"} · 显示 ${visibleTasks.length} 项`;
  const emptyState = document.querySelector("#empty-state");
  emptyState.hidden = visibleTasks.length > 0;
  let heading = "当前条件下没有任务";
  let description = "试试切换课程或完成状态，查看其他任务。";
  if (!storageReady) {
    heading = "暂时无法读取任务";
    description = "请先检查浏览器存储设置，已有数据不会被覆盖。";
  } else if (tasks.length === 0) {
    heading = "还没有待办实验";
    description = "添加第一项任务，开始整理你的学习安排。";
  } else if (!courseFilter.value && statusFilter === "active") {
    heading = "当前任务都已完成";
    description = "做得不错！你可以到已完成列表回顾，也可以添加新任务。";
  } else if (!courseFilter.value && statusFilter === "completed") {
    heading = "还没有已完成的任务";
    description = "完成一项实验后，勾选它，记录就会出现在这里。";
  }
  document.querySelector("#empty-heading").textContent = heading;
  document.querySelector("#empty-description").textContent = description;
  document.querySelector("#add-button").disabled = !storageReady;
}

render();
