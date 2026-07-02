// game.js
// The Game class owns the state machine (start / playing / gameover / win),
// fruit spawning, the finger slice trail, scoring, lives, and rendering.

const GAME_STATE = {
  START: "start",
  PLAYING: "playing",
  GAMEOVER: "gameover",
  WIN: "win",
};

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.state = GAME_STATE.START;

    this.fruits = [];
    this.particles = new ParticleSystem();
    this.popups = [];

    this.score = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.targetScore = 200; // reach this to WIN
    this.missLimit = 5; // total missed fruits (not lives) also ends game if too high

    this.missedCount = 0;

    this.combo = 0;
    this.comboTimer = 0;
    this.comboWindowFrames = 45; // ~0.75s at 60fps to keep a combo alive

    // Finger trail: array of recent {x,y,t} points used both for drawing
    // a "blade" trail and for slice-segment intersection tests.
    this.trail = [];
    this.maxTrailPoints = 8;
    this.fingerPos = null; // current { x, y } in canvas space, or null if hand not seen

    this.spawnTimer = 0;
    this.spawnIntervalFrames = 55; // decreases slightly as score increases (difficulty ramp)
    this.bombChance = 0.14;

    this.onScoreChange = null;
    this.onLivesChange = null;
    this.onGameOver = null;
    this.onWin = null;

    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  reset() {
    this.fruits = [];
    this.particles = new ParticleSystem();
    this.popups = [];
    this.score = 0;
    this.lives = this.maxLives;
    this.missedCount = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.trail = [];
    this.spawnTimer = 0;
    this.spawnIntervalFrames = 55;
    this.bombChance = 0.14;
    this._notifyScore();
    this._notifyLives();
  }

  start() {
    this.reset();
    this.state = GAME_STATE.PLAYING;
  }

  // Called by main.js whenever the hand tracker reports a fingertip position
  // (already converted to canvas pixel coordinates), or null if no hand seen.
  updateFingerPosition(point) {
    this.fingerPos = point;
    if (!point) return;

    if (this.state !== GAME_STATE.PLAYING) return;

    const now = performance.now();
    this.trail.push({ x: point.x, y: point.y, t: now });
    if (this.trail.length > this.maxTrailPoints) this.trail.shift();

    // Check slice against the most recent movement segment
    if (this.trail.length >= 2) {
      const a = this.trail[this.trail.length - 2];
      const b = this.trail[this.trail.length - 1];
      this._checkSlices(a.x, a.y, b.x, b.y);
    }
  }

  _checkSlices(x1, y1, x2, y2) {
    for (const fruit of this.fruits) {
      if (fruit.sliced) continue;
      if (fruit.intersectsSegment(x1, y1, x2, y2)) {
        this._sliceFruit(fruit);
      }
    }
  }

  _sliceFruit(fruit) {
    fruit.slice();

    if (fruit.isBomb) {
      this._loseLife(true);
      this.particles.burst(fruit.x, fruit.y, "#ff3b3b", 26);
      this.popups.push(new ScorePopup(fruit.x, fruit.y, "BOMB!", "#ff3b3b"));
      this.combo = 0;
      return;
    }

    // Combo handling: consecutive slices within the combo window increase multiplier
    this.combo += 1;
    this.comboTimer = this.comboWindowFrames;
    const multiplier = 1 + Math.floor(this.combo / 3) * 0.5;
    const gained = Math.round(fruit.type.points * multiplier);

    this.score += gained;
    this.particles.burst(fruit.x, fruit.y, fruit.type.color, 18);
    this.popups.push(
      new ScorePopup(fruit.x, fruit.y, `+${gained}${this.combo > 1 ? ` x${this.combo}` : ""}`)
    );

    this._notifyScore();

    if (this.score >= this.targetScore) {
      this._triggerWin();
    }
  }

  _loseLife(fromBomb = false) {
    this.lives -= 1;
    this._notifyLives();
    if (this.lives <= 0) {
      this._triggerGameOver(fromBomb ? "A bomb got you!" : "Out of lives!");
    }
  }

  _registerMiss() {
    this.missedCount += 1;
    this.combo = 0;
    if (this.missedCount >= this.missLimit) {
      this._loseLife();
    }
  }

  _triggerGameOver(reason) {
    if (this.state !== GAME_STATE.PLAYING) return;
    this.state = GAME_STATE.GAMEOVER;
    if (this.onGameOver) this.onGameOver(reason, this.score);
  }

  _triggerWin() {
    if (this.state !== GAME_STATE.PLAYING) return;
    this.state = GAME_STATE.WIN;
    if (this.onWin) this.onWin(this.score);
  }

  _notifyScore() {
    if (this.onScoreChange) this.onScoreChange(this.score);
  }

  _notifyLives() {
    if (this.onLivesChange) this.onLivesChange(this.lives, this.maxLives);
  }

  _spawnFruit() {
    // Slowly ramp difficulty: faster spawns & more bombs as score climbs
    const difficultyFactor = Math.min(this.score / this.targetScore, 1);
    const interval = Math.max(22, this.spawnIntervalFrames - difficultyFactor * 25);
    this.spawnTimer += 1;

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      const isBomb = Math.random() < this.bombChance + difficultyFactor * 0.08;
      this.fruits.push(new Fruit(this.canvas.width, this.canvas.height, isBomb));
    }
  }

  update() {
    if (this.state !== GAME_STATE.PLAYING) return;

    this._spawnFruit();

    this.fruits.forEach((f) => f.update());

    // Handle misses (fruit fell off screen without slicing)
    this.fruits
      .filter((f) => f.missed)
      .forEach((f) => {
        f.missed = false; // prevent double counting
        if (!f.isBomb) this._registerMiss();
      });

    this.fruits = this.fruits.filter((f) => !f.markedForRemoval);

    this.particles.update();

    this.popups.forEach((p) => p.update());
    this.popups = this.popups.filter((p) => !p.dead);

    if (this.comboTimer > 0) {
      this.comboTimer -= 1;
      if (this.comboTimer === 0) this.combo = 0;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Fruits
    this.fruits.forEach((f) => f.draw(ctx));

    // Particles & popups
    this.particles.draw(ctx);
    this.popups.forEach((p) => p.draw(ctx));

    // Finger "blade" trail
    this._drawTrail(ctx);
  }

  _drawTrail(ctx) {
    if (this.trail.length < 2) return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (let i = 1; i < this.trail.length; i++) {
      const p0 = this.trail[i - 1];
      const p1 = this.trail[i];
      const alpha = i / this.trail.length;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
      ctx.lineWidth = 6 * alpha;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    // Fingertip glow
    const tip = this.trail[this.trail.length - 1];
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 217, 61, 0.9)";
    ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
