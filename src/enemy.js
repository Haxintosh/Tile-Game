export class Enemy {
  constructor(maxHealth, damage, speed, x, y) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.damage = damage;
    this.speed = speed;
    this.x = x;
    this.y = y;

    this.path = [];
    this.currentPathIndex = 0;
  }

  draw(ctx, x, y) {
    ctx.fillStyle = "red";
    ctx.fillRect(x, y, 20, 20);
  }

  update() {
    if (this.path.length === 0) return;

    const target = this.path[this.currentPathIndex];
    if (!target) return;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.speed) {
      this.x = target.x;
      this.y = target.y;
      this.currentPathIndex++;

      if (this.currentPathIndex >= this.path.length) {
        this.currentPathIndex = this.path.length - 1;
      }
    } else {
      const angle = Math.atan2(dy, dx);
      this.x += Math.cos(angle) * this.speed;
      this.y += Math.sin(angle) * this.speed;
    }
  }

  setPath(path) {
    this.path = path;
    // check if already in movement to avoid teleporting
    // if (Math.floor(this.x))
    this.currentPathIndex = 1;
  }
}
