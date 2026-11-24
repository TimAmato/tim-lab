export function greetingFor(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function tapLabel(count) {
  return `Tapped ${count} ${count === 1 ? 'time' : 'times'}`;
}
