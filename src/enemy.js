export class Enemy {
  constructor(maxHealth, damage, speed, x, y, w, h) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.damage = damage;
    this.speed = speed;
    this.x = x;
    this.y = y;

    this.width = w; // hitbox
    this.height = h;

    this.path = [];
    this.currentPathIndex = 0;

    this.isDead = false;
    this.lastAtk = Date.now();
    this.atkCD = 1500; // s
    this.projectiles = [];
  }

  draw(ctx, x, y) {
    if (this.isDead) return;
    ctx.fillStyle = "red";
    ctx.fillRect(x, y, this.width, this.height);
  }

  update() {
    if (this.health <= 0) {
      this.isDead = true;
    }
    if (this.path.length === 0) return;
    if (this.isDead) return;

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
    this.cleanProjectilesArray();
  }

  setPath(path) {
    this.path = path;
    // check if already in movement to avoid teleporting
    // if (Math.floor(this.x))
    this.currentPathIndex = 1;
  }

  damage(damage) {
    this.health -= damage;
    if (this.health <= 0) {
      this.isDead = true;
    }
  }
  cleanProjectilesArray() {
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }
}
