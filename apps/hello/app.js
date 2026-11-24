import { greetingFor, tapLabel } from './logic.js';
import { isSupabaseConfigured } from '../shared/config.js';

document.getElementById('greeting').textContent = `${greetingFor(new Date().getHours())}, Tim`;

let count = 0;
const countEl = document.getElementById('count');
document.getElementById('tap').addEventListener('click', () => {
  count += 1;
  countEl.textContent = tapLabel(count);
});

document.getElementById('supabase-status').textContent = isSupabaseConfigured
  ? 'Shared Supabase config: set'
  : 'Shared Supabase config: not set yet';
