// fruit.js
// A single falling fruit (or bomb). Fruits are drawn as emoji for simplicity
// (no external image assets needed) but the class is structured so you can
// swap fillText() for drawImage() later if you want sprite art.

const FRUIT_TYPES = [
  { emoji: "🍎", points: 10, color: "#ff5252" },
  { emoji: "🍊", points: 10, color: "#ffa726" },
  { emoji: "🍋", points: 15, color: "#ffee58" },
  { emoji: "🍇", points: 15, color: "#ab47bc" },
  { emoji: "🍉", points: 20, color: "#66bb6a" },
  { emoji: "🍓", points: 20, color: "#ec407a" },
  { emoji: "🥝", points: 25, color: "#9ccc65" },
];

const BOMB_TYPE = { emoji: "💣", points: 0, color: "#333" };

class Fruit {
  constructor(canvasWidth, canvasHeight, isBomb = false) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.isBomb = isBomb;
    this.type = isBomb
      ? BOMB_TYPE
      : FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];

    this.radius = 34 + Math.random() * 10;

    // Spawn just above the top edge at a random x position
    this.x = this.radius + Math.random() * (canvasWidth - this.radius * 2);
    this.y = canvasHeight + this.radius;

    // Launch upward with an arc, like classic fruit-slicing games,
    // then gravity pulls it back down. "Falling down" feel is preserved
    // because most of its screen time is spent descending.
    const speedVariance = Math.random() * 2;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = -(13 + speedVariance + canvasHeight / 220);
    this.gravity = 0.28;

    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.1;

    this.sliced = false;
    this.missed = false;
    this.markedForRemoval = false;
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    // Bounce off side walls so fruit stays roughly in play
    if (this.x < this.radius || this.x > this.canvasWidth - this.radius) {
      this.vx *= -1;
    }

    // Missed: fell past the bottom of the screen without being sliced
    if (this.y - this.radius > this.canvasHeight + 40 && !this.sliced) {
      this.missed = true;
      this.markedForRemoval = true;
    }
  }

  draw(ctx) {
    if (this.sliced) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.font = `${this.radius * 2}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.type.emoji, 0, 0);
    ctx.restore();
  }

  // Distance from a point to this fruit's center — used for slice detection
  distanceTo(x, y) {
    return Math.hypot(this.x - x, this.y - y);
  }

  containsPoint(x, y) {
    return this.distanceTo(x, y) <= this.radius;
  }

  // Checks if the line segment from (x1,y1) to (x2,y2) — the finger's
  // recent movement — passes through this fruit's circular hitbox.
  intersectsSegment(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return this.containsPoint(x1, y1);
    }

    let t = ((this.x - x1) * dx + (this.y - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return this.distanceTo(closestX, closestY) <= this.radius;
  }

  slice() {
    this.sliced = true;
    this.markedForRemoval = true;
  }
}
