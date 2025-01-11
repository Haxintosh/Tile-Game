import * as UTILS from "/src/utils.js";

export class Weapon {
  constructor(
    name,
    damage,
    speed,
    range,
    type,
    cost,
    image,
    desc,
    projectileColor,
    spread = 0,
    spreadAngle = 0.5,
    numProjectiles = 1,
    magSize = 10,
    reloadTime = 500, // ms
  ) {
    this.name = name;
    this.damage = damage;
    this.speed = speed;
    this.range = range;
    this.type = type;
    this.cost = cost;
    this.image = image;
    this.desc = desc;
    this.projectileColor = projectileColor;
    this.spreadAngle = spreadAngle;
    this.numProjectiles = numProjectiles;
    this.magSize = magSize;
    this.reloadTime = reloadTime;
    this.currentAct = "ready";
    // for in game use
    this.ammo = magSize;

    // rendering
    this.canvas = null;

    // timing properties
    this.lastFired = 0;
    this.lastReloaded = 0;

    // proj
    this.projectiles = [];
  }

  shoot(origin, target) {
    // origin: Vec2, target: Vec2
    if (Date.now() - this.lastReloaded < this.reloadTime) {
      this.currentAct = "reloading";
      console.log("Reloading...");
      return;
    }

    if (this.ammo <= 0) {
      this.currentAct = "no ammo";
      console.log("Out of ammo!");
      if (Date.now() - this.lastReloaded < this.reloadTime) {
        console.log("Reloading...");
        this.currentAct = "reloading";
      }
      return;
    }

    if (Date.now() - this.lastFired < 500 / this.speed) {
      console.log("cooldown");
      this.currentAct = "cooldown";
      return;
    }

    this.currentAct = "ready";
    // calculate direction
    let dir = target.sub(origin).normalize();
    let dirs = [];
    if (this.numProjectiles > 1) {
      if (this.numProjectiles % 2 == 0) {
        for (let i = 0; i < this.numProjectiles; i++) {
          dirs.push(
            dir.rotate((i - this.numProjectiles / 2) * this.spreadAngle),
          );
        }
      } else {
        for (let i = 0; i < this.numProjectiles; i++) {
          dirs.push(
            dir.rotate(
              (i - Math.floor(this.numProjectiles / 2)) * this.spreadAngle,
            ),
          );
        }
      }
    } else {
      dirs.push(dir);
    }
    console.log(dirs);

    let projectiles = [];
    for (let i = 0; i < dirs.length; i++) {
      projectiles.push(
        new Projectile(
          origin,
          dirs[i],
          this.speed,
          this.range,
          this.damage / this.numProjectiles,
          this.projectileColor,
          this.canvas,
        ),
      );
    }

    this.ammo--;
    this.projectiles = this.projectiles.concat(projectiles);
    // console.log(this.projectiles);
    this.lastFired = Date.now();
    return projectiles;
  }

  reload() {
    if (this.ammo == this.magSize) {
      console.log("Magazine is already full!");
      this.currentAct = "ready";
      return;
    }

    if (Date.now() - this.lastReloaded < this.reloadTime) {
      console.log("Reloading...");
      this.currentAct = "reloading";
      return;
    }

    this.lastReloaded = Date.now();
    this.ammo = this.magSize;
  }

  cleanProjectilesArray() {
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  updateProjectiles(tileWidth, scale) {
    // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let i = 0; i < this.projectiles.length; i++) {
      this.projectiles[i].update(tileWidth, scale);
    }
    this.cleanProjectilesArray();
  }

  assignCanvas(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext("2d");
  }
}

export class Projectile {
  constructor(origin, direction, speed, range, damage, color, canvas) {
    this.origin = origin;
    this.position = origin.copy();
    this.direction = direction;
    this.speed = speed;
    this.range = range;
    this.damage = damage;
    this.color = color;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");
    this.alive = true;
  }

  update(tileWidth, scale) {
    if (!this.alive) return;
    this.position = this.position.add(
      this.direction.scale((this.speed * 2) / (tileWidth * scale)),
    );

    // check if projectile has reached max range
    if (
      this.origin.distance(this.position) * tileWidth * scale >
      this.range * 2
    ) {
      this.alive = false;
    }
  }

  // draw(offsetX, offsetY, scale) {
  //   if (!this.alive) return;
  //   this.ctx.beginPath();
  //   this.ctx.arc(this.position.x, this.position.y, 8 * scale, 0, 2 * Math.PI);
  //   this.ctx.fillStyle = this.color;
  //   this.ctx.fill();
  // }
}

// deprecated in favour of draw in tilemap
// draw() {
//   if (!this.ctx) return;
//   if (!this.alive) return;
//   this.ctx.beginPath();
//   this.ctx.arc(
//     this.position.x + this.offsetX,
//     this.position.y + this.offsetY,
//     8,
//     0,
//     2 * Math.PI,
//   );
//   this.ctx.fillStyle = this.color;
//   this.ctx.fill();
// }
export const starterWeapons = [
  new Weapon(
    "Pistol",
    15, // damage
    3, // speed
    500, // range
    "handgun", // type
    100, // cost
    "0_16", // image
    "A reliable semi-automatic handgun. Balanced and easy to use.", // desc
    "#FFD700", // projectileColor
    0, // spread
    0, // spreadAngle
    1, // numProjectiles
    12, // magSize
    1000, // reloadTime
  ),
  new Weapon(
    "Shotgun",
    8, // damage per pellet
    1.5, // speed
    300, // range
    "shotgun", // type
    300, // cost
    "1_32", // image
    "Powerful at close range, spreads projectiles for maximum damage.", // desc
    "#FF4500", // projectileColor
    1, // spread
    0.2, // spreadAngle
    8, // numProjectiles
    6, // magSize
    1500, // reloadTime
  ),
  new Weapon(
    "Assault Rifle",
    10, // damage
    5, // speed
    600, // range
    "rifle", // type
    500, // cost
    "2_32", // image
    "A versatile automatic rifle with a high fire rate.", // desc
    "#32CD32", // projectileColor
    0, // spread
    0.1, // spreadAngle
    1, // numProjectiles
    30, // magSize
    2000, // reloadTime
  ),
  new Weapon(
    "Sniper Rifle",
    50, // damage
    1, // speed
    1000, // range
    "rifle", // type
    800, // cost
    "0_48", // image
    "A high-powered rifle designed for long-range precision.", // desc
    "#0000FF", // projectileColor
    0, // spread
    0, // spreadAngle
    1, // numProjectiles
    5, // magSize
    2500, // reloadTime
  ),
  new Weapon(
    "SMG",
    8, // damage
    8, // speed
    400, // range
    "handgun", // type
    400, // cost
    "7_32", // image
    "A compact submachine gun with a high rate of fire.", // desc
    "#FFFF00", // projectileColor
    2, // spread
    0.2, // spreadAngle
    1, // numProjectiles
    25, // magSize
    1500, // reloadTime
  ),
];

// Tiered Weapons

export const tier1Weapons = [
  new Weapon(
    "Steel Pistol",
    12,
    2.2,
    30,
    "Pistol",
    200,
    "images/steel_pistol.png",
    "A pistol forged from steel. Slightly more powerful and faster than the starter Iron Pistol.",
    "gray",
  ),
  new Weapon(
    "Hardened Rifle",
    18,
    1.7,
    45,
    "Rifle",
    250,
    "images/hardened_rifle.png",
    "A tougher rifle with better damage and range. Still relatively slow.",
    "darkgray",
  ),
  new Weapon(
    "Rapidfire SMG",
    10,
    4.5,
    22,
    "SMG",
    300,
    "images/rapidfire_smg.png",
    "A faster SMG with improved damage. Ideal for close-range skirmishes.",
    "cyan",
  ),
  new Weapon(
    "Crossbow",
    20,
    1.0,
    50,
    "Bow",
    200,
    "images/crossbow.png",
    "A mechanical crossbow with decent damage and range, though slow.",
    "brown",
  ),
  new Weapon(
    "Flintlock Shotgun",
    25,
    1.2,
    15,
    "Shotgun",
    300,
    "images/flintlock_shotgun.png",
    "An old-fashioned shotgun with a short range but high close-quarters damage.",
    "gold",
  ),
];

export const tier2Weapons = [
  new Weapon(
    "Silver Pistol",
    20,
    2.5,
    35,
    "Pistol",
    400,
    "images/silver_pistol.png",
    "A polished silver pistol with balanced stats for intermediate users.",
    "silver",
  ),
  new Weapon(
    "Marksman Rifle",
    28,
    1.8,
    60,
    "Rifle",
    450,
    "images/marksman_rifle.png",
    "A precision rifle with enhanced range and accuracy.",
    "green",
  ),
  new Weapon(
    "Blitz SMG",
    15,
    5.0,
    25,
    "SMG",
    500,
    "images/blitz_smg.png",
    "An SMG with incredible firing speed and moderate damage.",
    "purple",
  ),
  new Weapon(
    "Recurve Bow",
    25,
    1.2,
    70,
    "Bow",
    350,
    "images/recurve_bow.png",
    "A sleek bow with improved range and damage. Slower than firearms.",
    "olive",
  ),
  new Weapon(
    "Double-Barrel Shotgun",
    35,
    1.3,
    20,
    "Shotgun",
    500,
    "images/double_barrel_shotgun.png",
    "A high-damage shotgun with a wider spread but limited range.",
    "red",
  ),
];

export const tier3Weapons = [
  new Weapon(
    "Platinum Pistol",
    30,
    3.0,
    40,
    "Pistol",
    600,
    "images/platinum_pistol.png",
    "A premium pistol offering balanced firepower and speed.",
    "white",
  ),
  new Weapon(
    "Sniper Rifle",
    45,
    1.5,
    100,
    "Rifle",
    700,
    "images/sniper_rifle.png",
    "A long-range rifle capable of delivering devastating damage from afar.",
    "black",
  ),
  new Weapon(
    "Storm SMG",
    20,
    5.5,
    30,
    "SMG",
    650,
    "images/storm_smg.png",
    "A high-speed SMG with substantial damage and slightly better range.",
    "electricblue",
  ),
  new Weapon(
    "Compound Bow",
    40,
    1.5,
    80,
    "Bow",
    500,
    "images/compound_bow.png",
    "A modern bow with superior range and damage output.",
    "teal",
  ),
  new Weapon(
    "Tactical Shotgun",
    50,
    1.8,
    25,
    "Shotgun",
    750,
    "images/tactical_shotgun.png",
    "An advanced shotgun with improved damage and firing rate.",
    "orange",
  ),
];

export const tier4Weapons = [
  new Weapon(
    "Golden Pistol",
    40,
    3.5,
    50,
    "Pistol",
    800,
    "images/golden_pistol.png",
    "A golden pistol with superior power and precision.",
    "gold",
  ),
  new Weapon(
    "Assault Rifle",
    55,
    2.0,
    70,
    "Rifle",
    850,
    "images/assault_rifle.png",
    "A versatile rifle with a good balance of damage, speed, and range.",
    "forestgreen",
  ),
  new Weapon(
    "Cyclone SMG",
    25,
    6.0,
    35,
    "SMG",
    900,
    "images/cyclone_smg.png",
    "An extremely fast SMG capable of shredding enemies at close range.",
    "pink",
  ),
  new Weapon(
    "Longbow",
    50,
    2.0,
    90,
    "Bow",
    700,
    "images/longbow.png",
    "A powerful bow designed for precision and range.",
    "navy",
  ),
  new Weapon(
    "Heavy Shotgun",
    65,
    1.7,
    30,
    "Shotgun",
    950,
    "images/heavy_shotgun.png",
    "A heavy-duty shotgun with devastating damage and a strong spread.",
    "darkred",
  ),
];

export const tier5Weapons = [
  new Weapon(
    "Plasma Pistol",
    50,
    4.0,
    60,
    "Pistol",
    1000,
    "images/plasma_pistol.png",
    "A futuristic pistol that fires plasma rounds, offering high damage and speed.",
    "neonblue",
  ),
  new Weapon(
    "Laser Rifle",
    75,
    2.2,
    120,
    "Rifle",
    1200,
    "images/laser_rifle.png",
    "An advanced rifle with exceptional range and damage.",
    "crimson",
  ),
  new Weapon(
    "Overdrive SMG",
    35,
    7.0,
    40,
    "SMG",
    1100,
    "images/overdrive_smg.png",
    "A cutting-edge SMG with unparalleled firing speed.",
    "yellow",
  ),
  new Weapon(
    "Phoenix Bow",
    65,
    2.5,
    100,
    "Bow",
    900,
    "images/phoenix_bow.png",
    "A legendary bow with tremendous power and range.",
    "fireorange",
  ),
  new Weapon(
    "Ultra Shotgun",
    100,
    2.0,
    40,
    "Shotgun",
    1300,
    "images/ultra_shotgun.png",
    "A top-tier shotgun with devastating close-range firepower.",
    "brightred",
  ),
];
