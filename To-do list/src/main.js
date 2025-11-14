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
const insightActive = document.getElementById('insight-active');
const insightActiveLabel = document.getElementById('insight-active-label');
const insightFocus = document.getElementById('insight-focus');
const insightFocusLabel = document.getElementById('insight-focus-label');
const insightHistory = document.getElementById('insight-history');
const insightHistoryLabel = document.getElementById('insight-history-label');
const statusMode = document.getElementById('status-mode');
const statusDay = document.getElementById('status-day');

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
  document.getElementById('form-title').textContent = 'Фокус-редактор';
  form.querySelector('.primary').textContent = 'Сохранить';
}

function renderEmptyState() {
  const empty = document.createElement('li');
  empty.className = 'empty-state';
  empty.textContent = 'Список пуст. Добавь первую задачу.';
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
    showToast(task.completed ? 'Задача завершена!' : 'Задача снова в работе');
  });

  editBtn.addEventListener('click', () => {
    idInput.value = task.id;
    titleInput.value = task.title;
    notesInput.value = task.notes ?? '';
    document.getElementById('form-title').textContent = 'Редактирование';
    form.querySelector('.primary').textContent = 'Обновить';
    titleInput.focus();
  });

  deleteBtn.addEventListener('click', async () => {
    tasks = tasks.filter((item) => item.id !== task.id);
    renderTasks();
    await persistTasks();
    showToast('Задача удалена');
  });

  return element;
}

function renderTasks() {
  taskList.innerHTML = '';
  if (!tasks.length) {
    renderEmptyState();
    updateDashboardStats();
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
  updateDashboardStats();
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

// (Submit and reset handlers moved down to modal-aware handlers to avoid duplicates)

clearCompletedButton.addEventListener('click', async () => {
  const initialLength = tasks.length;
  tasks = tasks.filter((task) => !task.completed);
  if (tasks.length === initialLength) {
    showToast('Нет выполненных задач для очистки');
    return;
  }
  await persistTasks();
  renderTasks();
  showToast('Готово! Завершенные удалены');
});

loadTasks();

// --- Morphing modal logic: button -> modal animation (iOS-like) ---
const createBtn = document.getElementById('create-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalPanel = document.getElementById('modal-panel');
const originalFormParent = form ? form.parentElement : null;

function openFormModal(fromButton = true) {
  if (!form || !modalOverlay || !modalPanel) return;

  // move form into modal panel to preserve event listeners
  modalPanel.appendChild(form);
  modalOverlay.setAttribute('aria-hidden', 'false');

  // compute start rect from button
  const startRect = createBtn.getBoundingClientRect();
  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const targetWidth = Math.min(720, vw - 48);
  const targetLeft = (vw - targetWidth) / 2;

  modalPanel.style.setProperty('--start-left', startRect.left + 'px');
  modalPanel.style.setProperty('--start-top', startRect.top + 'px');
  modalPanel.style.setProperty('--start-width', startRect.width + 'px');
  modalPanel.style.setProperty('--start-height', startRect.height + 'px');
  modalPanel.style.setProperty('--target-left', targetLeft + 'px');
  modalPanel.style.setProperty('--target-width', targetWidth + 'px');

  // trigger animation
  modalPanel.classList.add('animating');
  requestAnimationFrame(() => {
    modalPanel.classList.add('expanded');
  });

  // focus title after animation
  modalPanel.addEventListener('transitionend', function once(e) {
    if (e.propertyName === 'transform' || e.propertyName === 'width') {
      const titleInput = document.getElementById('task-title');
      if (titleInput) titleInput.focus();
      modalPanel.removeEventListener('transitionend', once);
    }
  });
}

function closeFormModal(toButton = true) {
  if (!form || !modalOverlay || !modalPanel) return;

  // animate back
  modalPanel.classList.remove('expanded');
  modalPanel.classList.add('closing');

  modalPanel.addEventListener('transitionend', function once(e) {
    if (e.propertyName === 'transform' || e.propertyName === 'width') {
      // move form back to original location
      if (originalFormParent) originalFormParent.appendChild(form);
      modalOverlay.setAttribute('aria-hidden', 'true');
      modalPanel.classList.remove('animating', 'closing');
      modalPanel.removeEventListener('transitionend', once);
    }
  });
}

// wire create button
if (createBtn) {
  createBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openFormModal(true);
  });
}

// if cancel/reset clicked while modal is open, close modal
if (resetButton) {
  resetButton.addEventListener('click', (event) => {
    event.preventDefault();
    resetForm();
    // if modal open, close it
    if (modalOverlay && modalOverlay.getAttribute('aria-hidden') === 'false') {
      closeFormModal(true);
    }
  });
}

// close modal after submit
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const notes = notesInput.value.trim();
  if (!title) {
    titleInput.focus();
    showToast('Введите название задачи');
    return;
  }
  const existingId = idInput.value;
  if (existingId) {
    tasks = tasks.map((task) =>
      task.id === existingId ? { ...task, title, notes } : task
    );
    showToast('Задача обновлена');
  } else {
    tasks.push({
      id: createId(),
      title,
      notes,
      completed: false,
      createdAt: Date.now()
    });
    showToast('Новая задача добавлена');
  }
  await persistTasks();
  renderTasks();
  resetForm();
  // close modal if open
  if (modalOverlay && modalOverlay.getAttribute('aria-hidden') === 'false') {
    closeFormModal(true);
  }
});

function formatStatusDayString() {
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  const formatted = formatter.format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function updateDashboardStats() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const active = total - completed;

  if (insightActive) {
    insightActive.textContent = active.toString();
  }
  if (insightActiveLabel) {
    insightActiveLabel.textContent = total
      ? `из ${total} в списке`
      : 'добавь первую задачу';
  }

  const focusSlots = active > 0 ? Math.min(6, Math.max(1, Math.ceil(active / 2))) : 0;
  if (insightFocus) {
    insightFocus.textContent = focusSlots.toString();
  }
  if (insightFocusLabel) {
    insightFocusLabel.textContent =
      focusSlots > 0 ? `по 45 мин · ${focusSlots} блока` : 'забронируй время под задачи';
  }

  const historyPercent = total ? Math.round((completed / total) * 100) : 0;
  if (insightHistory) {
    insightHistory.textContent = `${historyPercent}%`;
  }
  if (insightHistoryLabel) {
    insightHistoryLabel.textContent = total
      ? `закрыто ${completed} из ${total}`
      : 'нет завершённых задач';
  }

  if (statusDay) {
    statusDay.textContent = formatStatusDayString();
  }
  if (statusMode) {
    let mode = 'Сконцентрировано';
    if (active === 0) {
      mode = 'Свободно';
    } else if (active > 6) {
      mode = 'Интенсивно';
    } else if (active > 3) {
      mode = 'Собрано';
    }
    statusMode.textContent = mode;
  }
}

updateDashboardStats();
