// The 8 wedges, in counter-clockwise order starting from the right (3 o'clock).
// `kind: 'spider'` means a bad pick: the spider escapes and the player spins again.
// `theme: true` items open a themed dress-up room (see themes.js).
export const ITEMS = [
  { key: 'sun',     name: 'שמש',  emoji: '☀️', kind: 'nice', theme: true,   color: '#4fc2ff', light: '#b8ecff' },
  { key: 'spider',  name: 'עכביש', emoji: '🕷️', kind: 'spider', color: '#8a72d4', light: '#c9bbf7' },
  { key: 'heart',   name: 'לב',   emoji: '❤️', kind: 'nice', theme: true,   color: '#ffd23f', light: '#fff4b5' },
  { key: 'rainbow', name: 'קשת',  emoji: '🌈', kind: 'nice', theme: true,   color: '#4fd1a0', light: '#c6f6e3' },
  { key: 'star',    name: 'כוכב', emoji: '⭐', kind: 'nice', theme: true,   color: '#ff7fa8', light: '#ffd6e3' },
  { key: 'spider',  name: 'עכביש', emoji: '🕷️', kind: 'spider', color: '#8a72d4', light: '#c9bbf7' },
  { key: 'moon',    name: 'ירח',  emoji: '🌙', kind: 'nice', theme: true,   color: '#4357c9', light: '#93a3f2' },
  { key: 'flower',  name: 'פרח',  emoji: '🌸', kind: 'nice', theme: true,   color: '#9be05e', light: '#e2fbc7' },
];
