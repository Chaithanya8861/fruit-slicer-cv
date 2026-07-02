# 🍉 Fruit Slicer CV

A Fruit-Ninja-style browser game: fruit falls down the screen and you slice it
using your **index finger**, tracked live through your **webcam** with
computer vision (Google's MediaPipe Hands, running entirely in the browser).

## How it works

- **Node.js/Express** (`server.js`) only serves static files — it does no
  computer vision itself.
- All CV happens **client-side** in the browser using MediaPipe Hands
  (loaded from CDN), which returns 21 hand landmarks per frame. Landmark
  `8` (index fingertip) is used as the "blade."
- Each frame, the game checks whether the line segment between the finger's
  previous position and current position intersects any fruit's circular
  hitbox. If it does, the fruit is "sliced."
- Everything is drawn on an HTML5 `<canvas>` — fruit, particle/juice bursts,
  the glowing blade trail, and a small mirrored self-view so you can see your
  hand.

## Project structure

```
fruit-slicer-cv/
├── package.json
├── server.js                 # Express static server
└── public/
    ├── index.html             # Page layout, screens, CDN script includes
    ├── css/
    │   └── style.css          # All styling
    └── js/
        ├── handTracker.js     # MediaPipe Hands wrapper -> fingertip coords
        ├── fruit.js            # Fruit class: physics + slice-hit detection
        ├── particles.js       # Juice-splash particle effects, score popups
        ├── game.js            # Game state machine, scoring, spawning, render loop
        └── main.js            # Wires hand tracker + game + UI together
```

## Setup & run

```bash
cd fruit-slicer-cv
npm install
npm start
```

Then open **http://localhost:3000** in Chrome (or another WebRTC-capable
browser) on a machine with a webcam, and click **"Enable Camera & Start."**
Allow camera permissions when prompted.

> Requires internet access on the client machine the first time you load the
> page, since MediaPipe's model files and helper scripts are pulled from a
> CDN (`cdn.jsdelivr.net`). After that they're cached by the browser.

## Game rules

- Slice fruit with your index fingertip to score points (10–25 pts each,
  varies by fruit).
- Slicing fruit back-to-back quickly builds a **combo multiplier**.
- 💣 **Bombs** cost you a life if sliced — avoid them!
- Missing too many fruits (letting them fall off-screen) also costs a life.
- **3 lives** total — lose them all and it's **Game Over**.
- Reach **200 points** and you **Win**.

## Tuning the difficulty

All the knobs live in `public/js/game.js` inside the `Game` constructor:

| Property | Effect |
|---|---|
| `targetScore` | Score needed to win |
| `maxLives` | Starting lives |
| `missLimit` | How many missed (non-bomb) fruits before you lose a life |
| `spawnIntervalFrames` | Base delay between fruit spawns (lower = faster) |
| `bombChance` | Probability a spawned object is a bomb instead of fruit |

## Extending it

- **Better slice visuals**: swap the emoji `fillText` fruit rendering in
  `fruit.js` for actual sprite images, and render two "half" sprites flying
  apart when sliced (clip an image canvas along the slice angle).
- **Gesture pause menu**: `handTracker.js` already computes a rough
  `isFist` boolean per frame — wire it up in `main.js` to pause/resume.
- **Sound effects**: hook `Web Audio API` calls into `Game._sliceFruit()`
  and `Game._loseLife()`.
- **Server-side leaderboard**: add a small REST endpoint in `server.js`
  (e.g. with a JSON file or SQLite) and POST the final score from
  `main.js`'s `onGameOver`/`onWin` callbacks.
