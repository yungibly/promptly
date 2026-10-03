import { Scene, anchor as a, left as l, right as r, middle as m } from './scene.js';

const runes = [...'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'];
const sigils = ['◈', '◈', '⊙', '⌬', '◇', '⊕'];
const word = (rng, n = 3) => Array.from({ length: n }, () => rng.pick(runes)).join(' ');
const constellation = (rng) => rng.pick(['VESPER', 'NACRE', 'MOTH', 'IO', 'UNDERTOW', 'ECHO', 'HALO', 'NULL']);
const serial = (rng) => rng.int(0, 255).toString(16).padStart(2, '0').toUpperCase();

function signal({ rng, ornament, label, complexity, glyphs }) {
  const s = new Scene(complexity >= 4 ? 4 : 3, glyphs);
  const bend = a(rng.int(320, 490));
  const gate = a(rng.int(640, 780));
  const id = serial(rng);
  s.fill(0, l(2), bend, '─', 0)
    .text(0, l(), '╭─', 1)
    .text(0, l(3), `⟨${ornament.pick(sigils)}:${label}⟩`, 2)
    .text(0, bend, '╮', 1)
    .fill(1, bend, gate, '─', 0)
    .text(1, bend, '╰', 1)
    .text(1, gate, '╮', 1)
    .fill(0, gate, r(-1), '·', 0)
    .text(0, gate, '╭', 1)
    .text(0, r(), `⟦ ${constellation(rng)}:${id} ⟧`, 3, 'right')
    .text(1, l(), '│', 1)
    .text(1, l(3), `${word(ornament)}  ⌁  ${ornament.pick(sigils)}`, 3)
    .text(1, a(540), ` ⊣ ${word(ornament, 2)} ⊢ `, 4, 'center')
    .fill(1, gate, r(), '─', 0)
    .text(1, gate, '┴', 1)
    .text(1, r(), '╯', 1);
  if (complexity >= 3) {
    s.text(0, a(230), ` ${ornament.pick(['· ◇ ·', '╴╴◈╶╶', '┤:├'])} `, 4, 'center', 100);
    s.text(1, a(880), ` ${word(ornament, 2)} `, 3, 'center', 100);
  }
  if (complexity >= 4) {
    s.text(2, l(), '│', 1)
      .fill(2, a(170), a(750), ' ', 0)
      .text(2, a(330), '╵', 0)
      .text(2, a(540), '⋮', 3)
      .text(2, a(750), '·  ◌  ·', 0, 'center');
  }
  s.text(s.rows - 1, l(), '╰─', 1).text(s.rows - 1, l(3), '◈', 4);
  return { scene: s, cursor: 5, rightPrompt: '⟨ · ⌬ · ⟩' };
}

function reliquary({ rng, ornament, label, complexity, glyphs }) {
  const s = new Scene(complexity >= 4 ? 6 : 5, glyphs);
  const eye = a(rng.int(460, 600));
  const ex = (offset) => ({ ...eye, offset });
  const leftGate = a(220), rightGate = a(800);
  // A suspended, nested diamond; its equator physically joins both banks.
  s.text(0, l(1), `╭⟦ ${label} ⟧`, 2)
    .text(0, eye, '◇', 4, 'center')
    .text(0, r(), `⟦ ${constellation(rng)} / ${serial(rng)} ⟧╮`, 3, 'right')
    .text(1, l(1), '│', 1)
    .fill(1, l(2), ex(-5), '─', 0)
    .text(1, ex(-5), '╮  ╱ ◇ ╲  ╭', 1)
    .fill(1, ex(6), r(), '─', 0)
    .text(1, r(), '│', 1)
    .text(2, l(1), '╞', 1)
    .fill(2, l(2), ex(-6), '═', 0)
    .text(2, ex(-6), `╪═╡ ⟨ ${ornament.pick(sigils)} ⟩ ╞═╪`, 3)
    .fill(2, ex(7), r(), '═', 0)
    .text(2, r(), '╡', 1)
    .text(2, leftGate, ` ⟦ ${word(ornament)} ⟧ `, 2, 'center')
    .text(2, rightGate, ` ⟦ ${word(ornament)} ⟧ `, 2, 'center')
    .text(3, l(1), '│', 1)
    .text(3, ex(-5), '╯  ╲ ◇ ╱  ╰', 1)
    .text(3, r(), '╵', 1);
  if (complexity >= 3) {
    s.text(0, leftGate, '·  ╷  ·', 0, 'center')
      .text(0, rightGate, '·  ╷  ·', 0, 'center')
      .text(1, leftGate, '┴', 1, 'center')
      .text(1, rightGate, '┴', 1, 'center')
      .text(3, leftGate, '╵  ⋮  ╵', 3, 'center')
      .text(3, rightGate, '╵  ⋮  ╵', 3, 'center');
  }
  if (complexity >= 4) {
    s.text(4, l(1), '│', 1).text(4, eye, '▿', 4, 'center');
    s.fill(4, a(300), ex(-3), '┄', 0).fill(4, ex(4), a(720), '┄', 0);
    if (complexity === 5) {
      s.text(4, a(300), '╰', 1).text(4, a(720), '╯', 1)
        .text(1, a(100), ' ╳ ', 3, 'center', 100)
        .text(1, a(910), ' ╳ ', 3, 'center', 100);
    }
  }
  s.text(s.rows - 1, l(1), '╰─╼', 1).text(s.rows - 1, l(5), '◇', 4);
  return { scene: s, cursor: 7, rightPrompt: '╵ ◇ ╵' };
}

function mycelium({ rng, ornament, label, complexity, glyphs }) {
  const s = new Scene(complexity >= 4 ? 6 : 5, glyphs);
  // Interleaved filaments: a few continuous strands, then seeded side growth.
  const start = a(rng.int(190, 260));
  const fork = a(rng.int(380, 440));
  const end = a(rng.int(700, 810));
  s.text(0, l(2), `· ${label} ·`, 2)
    .text(0, r(-1), `⌁ ${constellation(rng).toLowerCase()} ⌁`, 3, 'right')
    .text(1, l(1), '╭', 1)
    .fill(1, l(2), start, '─', 1)
    .text(1, start, '╮', 1)
    .fill(2, start, end, '─', 1)
    .text(2, start, '╰', 1)
    .text(2, end, '╯', 1)
    .fill(1, end, r(-1), '─', 1)
    .text(1, end, '╭', 1)
    .text(1, r(-1), '╮', 1)
    .text(2, l(1), '│', 1)
    .text(2, r(-1), '╵', 1)
    .fill(3, l(2), fork, '┄', 0)
    .text(3, l(1), '├', 1)
    .text(3, fork, '╯', 0)
    .text(2, fork, '┬', 1)
    .text(2, a(550), ` ∘ ${ornament.pick(sigils)} ∘ `, 4, 'center');
  const count = complexity + 2;
  for (let i = 0; i < count; i++) {
    const branch = 300 + Math.floor(i * 390 / count) + rng.int(-15, 15);
    // The central fruiting body owns its clearance on the main filament.
    if (branch > 490 && branch < 610) continue;
    const pos = a(branch);
    const up = i % 2 === 0;
    s.text(up ? 1 : 3, pos, ornament.pick(up ? ['╷', '╱°', '╭◦', '⋰·'] : ['╵', '╲·', '╰∘', '⋱·']), i % 3 === 0 ? 3 : 0);
    s.text(2, pos, up ? '┴' : '┬', 1);
  }
  if (complexity >= 4) {
    s.text(4, l(1), '│', 1)
      .text(4, a(260), '·  ∘', 0)
      .text(4, a(580), `◌ ${word(ornament, 2)} ◌`, 3, 'center')
      .text(3, a(850), '⋰  ◇', 2);
  }
  s.text(s.rows - 1, l(1), '╰⌁', 1).text(s.rows - 1, l(4), '▹', 2);
  return { scene: s, cursor: 6, rightPrompt: '· ∘ ·' };
}

function orrery({ rng, ornament, label, complexity, glyphs }) {
  const s = new Scene(complexity >= 4 ? 6 : 5, glyphs);
  const center = a(rng.int(440, 580));
  const c = (offset) => ({ ...center, offset });
  s.text(0, l(1), `╭─ ${label}`, 2)
    .text(0, center, '·     ◌     ·', 0, 'center')
    .text(0, r(), `${constellation(rng)}  ${serial(rng)} ◦`, 3, 'right')
    .text(1, l(1), '│', 1)
    .fill(1, a(210), c(-7), '─', 0)
    .text(1, a(210), '╭', 1)
    .text(1, center, '╭──────┴──────╮', 1, 'center')
    .fill(1, c(8), a(840), '─', 0)
    .text(1, a(840), '╮', 1)
    .fill(2, l(2), r(), '·', 0)
    .text(2, l(1), '├', 1)
    .text(2, r(), '┤', 1)
    .text(2, a(210), '⊙', 2)
    .text(2, a(840), '⊕', 3)
    .text(2, center, `((  ⟨ ${ornament.pick(sigils)} ⟩  ))`, 4, 'center')
    .text(3, l(1), '│', 1)
    .fill(3, a(210), c(-7), '─', 0)
    .text(3, a(210), '╰', 1)
    .text(3, center, '╰──────┬──────╯', 1, 'center')
    .fill(3, c(8), a(840), '─', 0)
    .text(3, a(840), '╯', 1);
  if (complexity >= 3) {
    s.text(1, a(310), ' ◇ ', 3, 'center', 100)
      .text(3, a(710), ' ◌ ', 2, 'center', 100)
      .text(2, a(100), ` ${word(ornament, 2)} `, 3, 'center')
      .text(2, a(920), ` ${word(ornament, 2)} `, 2, 'center');
  }
  if (complexity >= 4) {
    s.text(4, l(1), '│', 1)
      .text(4, center, '·     ▿     ·', 0, 'center')
      .text(0, a(210), '╷', 0)
      .text(0, a(840), '╷', 0);
  }
  if (complexity === 5) {
    s.text(4, a(310), '⟨ · ⟩', 3, 'center')
      .text(0, a(710), '⟨ : ⟩', 2, 'center');
  }
  s.text(s.rows - 1, l(1), '╰─', 1).text(s.rows - 1, l(4), '⊙', 4);
  return { scene: s, cursor: 6, rightPrompt: '· ⊕ ·' };
}

export const grammars = {
  signal: { description: 'Asymmetric relay traces and runic packets', build: signal },
  reliquary: { description: 'An alien seal suspended between inscribed rails', build: reliquary },
  mycelium: { description: 'Branching filaments and bioluminescent spores', build: mycelium },
  orrery: { description: 'Nested orbital instruments and satellite glyphs', build: orrery },
};

export function compact({ glyphs, label, sigil }) {
  const s = new Scene(2, glyphs);
  s.text(0, l(), `╭─ ${label}`, 2)
    .fill(0, l(label.length + 5), r(-5), '·', 0)
    .text(0, r(), `⟨${sigil}⟩`, 3, 'right')
    .text(1, l(), '╰─', 1).text(1, l(3), sigil, 4);
  return { scene: s, cursor: 5, rightPrompt: '' };
}
