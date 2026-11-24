import { supabase, signInWithGoogle, signOut } from '../shared/supabase.js';
import {
  normalizeTitle, validateTitle, visibleTodos, counts, remainingLabel, emptyMessage,
  togglePatch, replaceById, removeById, friendlyError,
} from './logic.js';

const TABLE = 'todo_items';
const $ = (id) => document.getElementById(id);
const els = {
  loading: $('loading'), signedOut: $('signed-out'), signedIn: $('signed-in'), error: $('error'),
  signIn: $('sign-in'), signOut: $('sign-out'), who: $('who'), form: $('add-form'), input: $('new-title'),
  list: $('list'), empty: $('empty'), remaining: $('remaining'), clearDone: $('clear-done'),
  filters: document.querySelectorAll('[data-filter]'),
};

let todos = [];
let filter = 'all';
let userId = null;
let editingId = null;

function showError(err) {
  els.error.textContent = err ? friendlyError(err) : '';
  els.error.hidden = !err;
}

function showView(view) {
  els.loading.hidden = view !== 'loading';
  els.signedOut.hidden = view !== 'signed-out';
  els.signedIn.hidden = view !== 'signed-in';
  els.signOut.hidden = view !== 'signed-in';
}

// ---------- rendering ----------

function renderItem(todo) {
  const li = document.createElement('li');
  li.className = `item${todo.done ? ' done' : ''}${todo.pending ? ' pending' : ''}`;
  li.dataset.id = todo.id;

  const check = document.createElement('button');
  check.type = 'button';
  check.className = 'check';
  check.setAttribute('role', 'checkbox');
  check.setAttribute('aria-checked', String(todo.done));
  check.setAttribute('aria-label', todo.done ? 'Mark as not done' : 'Mark as done');
  check.addEventListener('click', () => toggle(todo.id));

  let title;
  if (editingId === todo.id) {
    title = document.createElement('input');
    title.className = 'title-edit';
    title.value = todo.title;
    title.maxLength = 500;
    title.enterKeyHint = 'done';
    title.setAttribute('aria-label', 'Edit task');
    let finished = false;
    const finish = (save) => {
      if (finished) return;
      finished = true;
      editingId = null;
      if (save) rename(todo.id, title.value);
      else render();
    };
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') finish(false);
    });
    title.addEventListener('blur', () => finish(true));
    queueMicrotask(() => { title.focus(); title.setSelectionRange(title.value.length, title.value.length); });
  } else {
    title = document.createElement('span');
    title.className = 'title';
    title.textContent = todo.title; // textContent: never inject user text as HTML
    title.title = 'Tap to edit';
    title.addEventListener('click', () => { if (!todo.pending) { editingId = todo.id; render(); } });
  }

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'delete';
  del.textContent = '×';
  del.setAttribute('aria-label', `Delete “${todo.title}”`);
  del.addEventListener('click', () => remove(todo.id));

  li.append(check, title, del);
  return li;
}

function render() {
  const shown = visibleTodos(todos, filter);
  els.list.replaceChildren(...shown.map(renderItem));
  const c = counts(todos);
  els.empty.hidden = shown.length > 0;
  els.empty.textContent = emptyMessage(filter, c.total);
  els.remaining.textContent = c.total ? remainingLabel(c.active) : '';
  els.clearDone.hidden = c.done === 0;
  els.filters.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
}

// ---------- data ----------

async function load() {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) return showError(error);
  showError(null);
  todos = data;
  render();
}

async function add(rawTitle) {
  const problem = validateTitle(rawTitle);
  if (problem) return showError(problem);
  const title = normalizeTitle(rawTitle);
  const tempId = `temp-${crypto.randomUUID()}`;
  todos = [{ id: tempId, title, done: false, done_at: null, created_at: new Date().toISOString(), pending: true }, ...todos];
  render();
  const { data, error } = await supabase.from(TABLE).insert({ title, user_id: userId }).select().single();
  if (error) {
    todos = removeById(todos, tempId);
    showError(error);
  } else {
    todos = todos.map((t) => (t.id === tempId ? data : t));
    showError(null);
  }
  render();
}

async function update(id, patch) {
  const before = todos;
  todos = replaceById(todos, id, patch);
  render();
  const { error } = await supabase.from(TABLE).update(patch).eq('id', id);
  if (error) {
    todos = before;
    showError(error);
    render();
  } else {
    showError(null);
  }
}

function toggle(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo && !todo.pending) update(id, togglePatch(todo));
}

function rename(id, raw) {
  const todo = todos.find((t) => t.id === id);
  const title = normalizeTitle(raw);
  if (!todo || !title || title === todo.title) return render(); // blank edit = cancel
  const problem = validateTitle(title);
  if (problem) { showError(problem); return render(); }
  update(id, { title });
}

async function remove(id) {
  const before = todos;
  todos = removeById(todos, id);
  render();
  if (String(id).startsWith('temp-')) return;
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) { todos = before; showError(error); render(); }
}

async function clearDone() {
  const doneIds = todos.filter((t) => t.done).map((t) => t.id);
  if (!doneIds.length || !confirm(`Delete ${doneIds.length} finished ${doneIds.length === 1 ? 'task' : 'tasks'}?`)) return;
  const before = todos;
  todos = todos.filter((t) => !t.done);
  render();
  const { error } = await supabase.from(TABLE).delete().in('id', doneIds);
  if (error) { todos = before; showError(error); render(); }
}

// ---------- auth ----------

async function onSession(session) {
  const nextUser = session?.user?.id ?? null;
  if (nextUser === userId && nextUser) return; // token refresh: nothing to do
  userId = nextUser;
  todos = [];
  if (!session) {
    showView('signed-out');
    return;
  }
  const u = session.user;
  els.who.textContent = `Signed in as ${u.user_metadata?.full_name || u.email}`;
  showView('signed-in');
  render();
  await load();
}

// ---------- wiring ----------

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = els.input.value;
  if (validateTitle(value)) return showError(validateTitle(value));
  els.input.value = '';
  add(value);
});
els.filters.forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; render(); }));
els.clearDone.addEventListener('click', clearDone);
els.signIn.addEventListener('click', async () => {
  els.signIn.disabled = true;
  const { error } = await signInWithGoogle();
  if (error) { els.signIn.disabled = false; showError(error); }
});
els.signOut.addEventListener('click', async () => {
  const { error } = await signOut();
  if (error) showError(error);
});

// Refresh when coming back to the app (e.g. after editing on another device).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && userId && editingId === null) load();
});

supabase.auth.onAuthStateChange((_event, session) => {
  // Defer: calling Supabase inside this callback can deadlock the auth lock.
  setTimeout(() => onSession(session), 0);
});
const { data: { session } } = await supabase.auth.getSession();
await onSession(session);
