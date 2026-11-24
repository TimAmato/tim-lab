// Pure to-do logic (no DOM, no network) so it can be unit-tested in Node.

export const MAX_TITLE = 500;
export const FILTERS = ['all', 'active', 'done'];

/** Trim and collapse whitespace. Returns '' for blank input. */
export function normalizeTitle(input) {
  return String(input ?? '').replace(/\s+/g, ' ').trim();
}

/** Returns an error message, or null if the title is OK to save. */
export function validateTitle(input) {
  const title = normalizeTitle(input);
  if (!title) return 'Type something first.';
  if (title.length > MAX_TITLE) return `Keep it under ${MAX_TITLE} characters.`;
  return null;
}

/** Open tasks first (newest on top), then finished tasks (most recently finished on top). */
export function sortTodos(todos) {
  const time = (s) => (s ? Date.parse(s) : 0);
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done) return time(b.done_at) - time(a.done_at) || time(b.created_at) - time(a.created_at);
    return time(b.created_at) - time(a.created_at);
  });
}

export function filterTodos(todos, filter) {
  if (filter === 'active') return todos.filter((t) => !t.done);
  if (filter === 'done') return todos.filter((t) => t.done);
  return todos;
}

export function visibleTodos(todos, filter) {
  return sortTodos(filterTodos(todos, filter));
}

export function counts(todos) {
  const done = todos.filter((t) => t.done).length;
  return { total: todos.length, done, active: todos.length - done };
}

export function remainingLabel(active) {
  if (active === 0) return 'All done';
  return `${active} ${active === 1 ? 'task' : 'tasks'} left`;
}

export function emptyMessage(filter, total) {
  if (total === 0) return 'No tasks yet. Add one above.';
  if (filter === 'active') return 'Nothing left to do.';
  if (filter === 'done') return 'Nothing finished yet.';
  return 'No tasks.';
}

/** The fields to send to the database when toggling a task. */
export function togglePatch(todo, now = new Date()) {
  const done = !todo.done;
  return { done, done_at: done ? now.toISOString() : null };
}

/** Replace one item in a list by id, returning a new list. */
export function replaceById(todos, id, patch) {
  return todos.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

export function removeById(todos, id) {
  return todos.filter((t) => t.id !== id);
}

/** Turn a Supabase error into something readable on a phone. */
export function friendlyError(error) {
  const msg = error?.message || String(error || 'Something went wrong.');
  if (error?.code === '42P01' || error?.code === 'PGRST205' || /todo_items/.test(msg) && /not (exist|find)/i.test(msg)) {
    return 'The todo_items table is missing. Run apps/todo/supabase/migrations/001_todo_items.sql in Supabase.';
  }
  if (/failed to fetch|network/i.test(msg)) return 'Network problem. Check your connection and try again.';
  return msg;
}
