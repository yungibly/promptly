import { left } from '../scene.js';

// Live text and the input marker as participants in a system. Roles are fixed
// cell reservations; systems read them as windows, obstacles, or sources and
// paint them last, so generated art never covers a live field.
export function roles(config, rng) {
  const list = [];
  // A static label shortens the directory so the text stays a compact line.
  const room = config.label ? 32 - [...config.label].length : 24;
  if (config.info !== false) list.push({ role: 'username', width: 8 }, { role: 'directory', width: Math.max(8, Math.min(room, rng.int(16, 24))) });
  if (config.label) list.push({ role: 'label', text: config.label, width: [...config.label].length });
  if (list.length > 1 && rng.chance(0.25)) list.reverse();
  // Text inks come from the palette roles, whose contrast is guaranteed.
  const [user, path] = rng.pick([[5, 2], [2, 5], [5, 3], [3, 4], [2, 3], [4, 5]]);
  for (const role of list) role.ink = role.role === 'username' ? user : role.role === 'directory' ? path : 4;
  return list;
}

// Lay roles out on one row; returns the first free column after them.
export function line(list, row, x, gap = 2) {
  for (const role of list) { role.row = row; role.x = x; x += role.width + gap; }
  return list.length ? x - gap : x;
}

// Distance (in square units, a cell being two units tall) from a point to the
// nearest role, with a one-cell side margin. Used for halos and attraction.
export function clearance(list, margin = 1) {
  return (x, y) => Math.min(Infinity, ...list.map((role) => {
    const dx = Math.max(0, role.x - margin - x, x - (role.x + role.width + margin));
    const dy = Math.max(0, role.row * 2 - y, y - (role.row * 2 + 2));
    return Math.hypot(dx, dy);
  }));
}

export function paint(scene, list, at = (role) => left(role.x)) {
  for (const role of list) {
    if (role.role === 'label') scene.text(role.row, at(role), role.text, role.ink);
    else scene.slot(role.row, at(role), role.role, role.width, role.ink);
  }
}

export function marker(scene, row, x, rng) {
  scene.text(row, left(x), rng.pick(['›', '›', '❯', '>']), 4);
  scene.runs.at(-1).purpose = 'input';
  return x + 2;
}
