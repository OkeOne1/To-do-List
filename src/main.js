import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'todo-list/tasks';

const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const notesInput = document.getElementById('task-notes');
const idInput = document.getElementById('task-id');
const resetButton = document.getElementById('reset-btn');
const taskList = document.getElementById('task-list');
const clearCompletedButton = document.getElementById('clear-completed');
const template = document.getElementById('task-item-template');

let tasks = [];
let toastTimer = null;

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
}

async function persistTasks() {
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(tasks) });
}

function resetForm() {
  idInput.value = '';
  titleInput.value = '';
  notesInput.value = '';
  document.getElementById('form-title').textContent = 'Нове завдання';
  form.querySelector('.primary').textContent = 'Зберегти';
}

function renderEmptyState() {
  const empty = document.createElement('li');
  empty.className = 'empty-state';
  empty.textContent = 'Список завдань порожній. Додайте перше завдання!';
  taskList.appendChild(empty);
}

function createTaskElement(task) {
  const fragment = template.content.cloneNode(true);
  const element = fragment.querySelector('li');
  const checkbox = element.querySelector('.task-toggle');
  const title = element.querySelector('.task-title');
  const notes = element.querySelector('.task-notes');
  const editBtn = element.querySelector('.edit');
  const deleteBtn = element.querySelector('.delete');

  element.dataset.id = task.id;
  title.textContent = task.title;
  notes.textContent = task.notes ?? '';
  notes.style.display = task.notes ? 'block' : 'none';
  checkbox.checked = task.completed;
  if (task.completed) {
    element.classList.add('completed');
  }

  checkbox.addEventListener('change', async () => {
    task.completed = checkbox.checked;
    if (task.completed) {
      element.classList.add('completed');
    } else {
      element.classList.remove('completed');
    }
    await persistTasks();
    showToast(task.completed ? 'Завдання виконано!' : 'Завдання повернено у роботу');
  });

  editBtn.addEventListener('click', () => {
    idInput.value = task.id;
    titleInput.value = task.title;
    notesInput.value = task.notes ?? '';
    document.getElementById('form-title').textContent = 'Редагування завдання';
    form.querySelector('.primary').textContent = 'Оновити';
    titleInput.focus();
  });

  deleteBtn.addEventListener('click', async () => {
    tasks = tasks.filter((item) => item.id !== task.id);
    renderTasks();
    await persistTasks();
    showToast('Завдання видалено');
  });

  return element;
}

function renderTasks() {
  taskList.innerHTML = '';
  if (!tasks.length) {
    renderEmptyState();
    return;
  }
  const sorted = [...tasks].sort((a, b) => {
    if (a.completed === b.completed) {
      return a.createdAt - b.createdAt;
    }
    return a.completed ? 1 : -1;
  });
  for (const task of sorted) {
    taskList.appendChild(createTaskElement(task));
  }
}

async function loadTasks() {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        tasks = parsed.map((task) => ({
          id: task.id ?? createId(),
          title: task.title ?? '',
          notes: task.notes ?? '',
          completed: Boolean(task.completed),
          createdAt: task.createdAt ?? Date.now()
        }));
      }
    }
  } catch (error) {
    console.error('Не вдалося зчитати дані зі сховища', error);
    tasks = [];
  }
  renderTasks();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const notes = notesInput.value.trim();
  if (!title) {
    titleInput.focus();
    showToast('Будь ласка, введіть назву завдання');
    return;
  }
  const existingId = idInput.value;
  if (existingId) {
    tasks = tasks.map((task) =>
      task.id === existingId ? { ...task, title, notes } : task
    );
    showToast('Завдання оновлено');
  } else {
    tasks.push({
      id: createId(),
      title,
      notes,
      completed: false,
      createdAt: Date.now()
    });
    showToast('Нове завдання додано');
  }
  await persistTasks();
  renderTasks();
  resetForm();
});

resetButton.addEventListener('click', (event) => {
  event.preventDefault();
  resetForm();
});

clearCompletedButton.addEventListener('click', async () => {
  const initialLength = tasks.length;
  tasks = tasks.filter((task) => !task.completed);
  if (tasks.length === initialLength) {
    showToast('Немає виконаних завдань для видалення');
    return;
  }
  await persistTasks();
  renderTasks();
  showToast('Виконані завдання очищено');
});

loadTasks();
