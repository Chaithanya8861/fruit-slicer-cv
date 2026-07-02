// particles.js
// Lightweight particle burst effect used when a fruit is sliced.

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.02;
    this.radius = 2 + Math.random() * 3;
    this.color = color;
    this.gravity = 0.15;
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(this.life, 0);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  get dead() {
    return this.life <= 0;
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burst(x, y, color, count = 18) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  update() {
    this.particles.forEach((p) => p.update());
    this.particles = this.particles.filter((p) => !p.dead);
  }

  draw(ctx) {
    this.particles.forEach((p) => p.draw(ctx));
  }
}

// Floating "+10" style score popup text
class ScorePopup {
  constructor(x, y, text, color = "#ffd93d") {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 1;
  }

  update() {
    this.y -= 1.2;
    this.life -= 0.02;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(this.life, 0);
    ctx.fillStyle = this.color;
    ctx.font = "bold 26px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }

  get dead() {
    return this.life <= 0;
  }
}
