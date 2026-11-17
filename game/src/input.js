// Keyboard and mouse state, mapped into the 1280x720 play space whatever the window size.

import { VIEW_W, VIEW_H } from './config.js';

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: VIEW_W / 2, y: VIEW_H / 2 - 120, down: false, right: false, clicked: false, moved: false };

  const toView = (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
    mouse.y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
    mouse.moved = true;
  };

  window.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (!held.has(key)) pressed.add(key);
    held.add(key);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
    mouse.right = false;
  });
  canvas.addEventListener('mousemove', toView);
  canvas.addEventListener('mousedown', (event) => {
    toView(event);
    if (event.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
    if (event.button === 2) {
      mouse.right = true;
      pressed.add('RightClick');
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouse.down = false;
    if (event.button === 2) mouse.right = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    mouse,
    isHeld: (...keys) => keys.some((k) => held.has(k)),
    wasPressed: (...keys) => keys.some((k) => pressed.has(k)),
    // Movement as a unit-ish vector from WASD or the arrow keys.
    moveAxis() {
      let x = 0;
      let y = 0;
      if (held.has('a') || held.has('ArrowLeft')) x -= 1;
      if (held.has('d') || held.has('ArrowRight')) x += 1;
      if (held.has('w') || held.has('ArrowUp')) y -= 1;
      if (held.has('s') || held.has('ArrowDown')) y += 1;
      return [x, y];
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
