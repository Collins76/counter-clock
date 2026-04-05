# Counter Clock

An animated digital countdown timer with eye-catching SVG icons and a dark, luminous aesthetic. Built with plain HTML, CSS and JavaScript — no build step.

## Features

- Four flip-card digit units: **Days / Hours / Minutes / Seconds**
- Animated SVG icons: rotating sun, flipping hourglass with falling sand, pulsing clock with spinning hands, and an orbiting seconds indicator
- Dark backdrop with drifting neon orbs (cyan / magenta / violet), starfield, and glassmorphism cards
- Start / Pause / Resume / Reset controls with a `datetime-local` target picker
- Target persisted to `localStorage`
- "Time's up!" celebration state
- Responsive layout and `prefers-reduced-motion` support

## Open in your browser

Pick whichever works for you:

- **GitHub Pages** (enable Pages on the `main` branch first, then visit):
  https://collins76.github.io/counter-clock/
- **Live preview without enabling Pages** (via htmlpreview.github.io):
  https://htmlpreview.github.io/?https://github.com/collins76/counter-clock/blob/main/index.html
- **Directly from this branch**:
  https://htmlpreview.github.io/?https://github.com/collins76/counter-clock/blob/claude/animated-countdown-timer-e6IUc/index.html
- **Locally** — clone the repo and double-click `index.html`, or run:
  ```bash
  git clone https://github.com/collins76/counter-clock.git
  cd counter-clock
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

## Project structure

```
counter-clock/
├── index.html   # markup
├── styles.css   # dark luminous theme + animations
└── script.js    # countdown logic
```
