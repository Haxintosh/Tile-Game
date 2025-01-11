// OPTIMIZATION: render on a separate canvas at native spritesheet resolution, then scale it up to the display canvas
// this will reduce img processing time per render cycle
// or scale img to display size onload
// OPTIMIZATION: too many loops

// imports
import * as TWEEN from "@tweenjs/tween.js";
import * as WP from "/src/UI-Features/weaponsmith/weapons.js";
import * as PLANT from "./plant.js";
import * as UTILS from "./utils.js";
import * as ENEMY from "./enemy.js";
import * as PF from "./pathfinder.js";

/**
 * Class responsible for rendering a tilemap, handling player movement, interactions, and game logic.
 */
export class TileMapRenderer {
  /**
   * Creates a new TileMapRenderer instance.
   * @param {Object} tileMap - The tilemap data.
   * @param {HTMLImageElement} spritesheet - The spritesheet image for tiles.
   * @param {number} scale - The scaling factor for rendering.
   * @param {HTMLCanvasElement} canvas - The main canvas for rendering the game.
   * @param {HTMLImageElement} playerSpritesheet - The spritesheet for the player's idle animation.
   * @param {HTMLImageElement} walkSpritesheet - The spritesheet for the player's walk animation.
   * @param {HTMLImageElement} runSpritesheet - The spritesheet for the player's run animation.
   * @param {HTMLCanvasElement} uiCanvas - The canvas for rendering UI elements.
   * @param {HTMLImageElement} vegSpritesheet5012 - Spritesheet for plants (stages 0, 1, 2, 5).
   * @param {HTMLImageElement} vegSpritesheet34 - Spritesheet for plants (stages 3, 4).
   */
  constructor(
    tileMap,
    spritesheet,
    scale,
    canvas,
    playerSpritesheet,
    walkSpritesheet,
    runSpritesheet,
    uiCanvas,
    vegSpritesheet5012,
    vegSpritesheet34,
  ) {
    this.tileMap = tileMap;
    this.spritesheet = spritesheet;
    this.playerSpritesheet = playerSpritesheet;
    this.walkSpritesheet = walkSpritesheet;
    this.runSpritesheet = runSpritesheet;

    this.vegSpritesheet5012 = vegSpritesheet5012;
    this.vegSpritesheet34 = vegSpritesheet34;

    this.scale = scale;
    this.canvas = canvas;
    this.uiCanvas = uiCanvas;

    this.offsetX = 0;
    this.offsetY = 0;

    this.playerOffsetX = 0;
    this.playerOffsetY = 0;

    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
    };

    this.deltaT = 0;
    this.lastT = 0;

    this.cameraSync = true;
    this.centerPlayer = true;
    this.lockCamera = false;

    this.camera = {
      x: 0,
      y: 0,
    };
    this.lastDirection = "UP";
    this.lastAction = Date.now();
    this.currentAction = "IDLE";

    this.ANIM_SPEED_IDLE = 200;
    this.ANIM_SPEED_WALK = 100;
    this.ANIM_SPEED_RUN = 75;

    this.lastIDLEFrame = 0;
    this.lastWALKFrame = 0;
    this.lastRUNFrame = 0;

    this.animDeltaT = 0;
    this.animLastT = 0;

    this.speed = 4;
    this.speedMultiplier = 1;

    this.gameTime = 0; // cycle of 0 - 1200000 in ms
    this.msPerHour = 50000; // 50s, total 24h = 1200000ms

    this.currentCollisionBlock = null;

    this.plants = []; // arr<plant>
    this.plantTiles = null;

    this.prevX = 0;
    this.prevY = 0;

    this.isUIOpen = false;

    this.zoom = 1;

    this.currentInteractible = null;

    this.isMovementLocked = false;

    this.interactUI = document.getElementById("interactableUI");
    this.mainShopContainer = document.getElementById("mainShopContainer");
    this.shopHeader = document.getElementById("headerContainer");
    this.scrollItemsContainer = document.getElementById("scrollItemsContainer");
    this.currentItemName = document.getElementById("name");
    this.currentItemPrice = document.getElementById("price");
    this.currentItemImg = document.getElementById("gunPreviewImg");
    this.currentItemDesc = document.getElementById("itemDesc");
    this.currentItemDmg = document.getElementById("dmg");
    this.currentItemRng = document.getElementById("rng");
    this.currentItemSpd = document.getElementById("spd");
    this.currentItemMagSize = document.getElementById("magSize");
    this.currentItemReloadTime = document.getElementById("reloadTime");
    this.priceButton = document.getElementById("priceBtn");
    this.buyButton = document.getElementById("buyBtn");
    this.moneyContainer = document.getElementById("moneyIndContainer");
    this.moneyInd = document.getElementById("moneyInd");

    this.wpTitle = document.getElementById("currWeaponTitleContainer");
    this.ammoInd = document.getElementById("ammoContainer");
    this.rldInd = document.getElementById("reloadStatusIndicator");
    this.actInd = document.getElementById("statusIndicator");

    this.waveHeader = document.getElementById("header");
    this.timerE = document.getElementById("timer");
    this.enemiesLeft = document.getElementById("enemiesLeft");

    this.hpBar = document.getElementById("HPBarBar");
    this.hpVal = document.getElementById("HPBarVal");

    this.expTitle = document.getElementById("expBarTitle");
    this.expBar = document.getElementById("expBarBar");
    this.expVal = document.getElementById("expBarVal");

    this.GAMEBEGIN = false;
    this.page1 = document.getElementById("page1");
    this.page2 = document.getElementById("page2");
    this.page3 = document.getElementById("page3");
    this.success = document.getElementById("success");
    this.btnInduct = document.getElementById("induct");
    this.btnInduct.addEventListener("click", () => {
      this.page1.style.display = "none";
    });
    this.btnStart = document.getElementById("actStart");
    this.btnStart.addEventListener("click", () => {
      this.GAMEBEGIN = true;
      this.page2.style.display = "none";
    });
    this.page3.addEventListener("click", () => {
      location.reload();
    });

    this.totalAmmo = 0;
    this.MAX_AMMO = 100;

    this.hp = 100;
    this.MAX_HP = 100;

    this.exp = 0;
    this.expToNextLevel = (l) => {
      return Math.floor(0.5 * l ** 2);
    };
    this.level = 1;

    this.buyAbleWeapons = WP.starterWeapons;
    this.moveUIDown();
    this.moveMoneyDown();
    // inventory
    this.maxInventorySize = 10;
    this.inventory = [];
    this.weapons = [];
    this.currentWeapon = null;
    // more ui shenanigans
    this.tweenGroup = new TWEEN.Group(); // global tween group deprecated
    // guns guns guns
    this.enableGun = true;
    // pve
    this.enemies = [];
    this.SAFE_ZONE = 400;
    this.UPDATE_PATH_CYCLE = 20; // update path every 240 render cycles
    this.nRenderCycles = 0;

    // pathfind
    this.grid = null;
    this.ogGrid = null;

    // stats
    this.baseStats = {
      health: 15,
      speed: 3.5,
      damage: 5,
      coins: 75,
      exp: 10,
      bulletSpeed: 2,
    };
    this.currentWave = 1;
    this.waves = {
      1: {
        nEnemies: 5,
        healthMul: 1,
        speedMul: 1,
        damageMul: 1,
        coinsMul: 1,
        expMul: 1,
      },
      2: {
        nEnemies: 10,
        healthMul: 1.2,
        speedMul: 1.1,
        damageMul: 1.1,
        coinsMul: 1.2,
        expMul: 1.2,
      },
      3: {
        nEnemies: 12,
        healthMul: 1.4,
        speedMul: 1.2,
        damageMul: 1.2,
        coinsMul: 1.4,
        expMul: 1.4,
      },
      4: {
        nEnemies: 13,
        healthMul: 1.6,
        speedMul: 1.3,
        damageMul: 1.3,
        coinsMul: 1.6,
        expMul: 1.6,
      },
      5: {
        nEnemies: 15,
        healthMul: 1.8,
        speedMul: 1.4,
        damageMul: 1.4,
        coinsMul: 1.8,
        expMul: 1.8,
      },
    };

    this.buffs = ["SPEED", "HEALTH", "DAMAGE", "BULLET_SPEED", "SLOW", "BLIND"];
    this.buffDuration = 10000;
    this.activeBuffs = [];
    this.buffColors = {
      SPEED: "blue",
      HEALTH: "green",
      DAMAGE: "orange",
      BULLET_SPEED: "yellow",
      SLOW: "red",
      BLIND: "black",
    };
    this.debuffs = {
      red: "SLOW",
      black: "BLIND",
    };

    this.actualBuffs = [];
    this.activePlayerModifiers = {
      speed: 1,
      damage: 1,
      health: 1,
      bulletSpeed: 1,
    };
    this.currentGLOBALmodifiers = {};
    this.startGame = false;
  }
  /**
   * Initializes the game by loading assets, setting up the canvas, and adding event listeners.
   */
  async init() {
    this.gunSound = new Audio("AUDIO/gun.mp3");
    this.collideSound = new Audio("AUDIO/collide.mp3");
    this.powerUpSound = new Audio("AUDIO/up.mp3");
    this.winSound = new Audio("AUDIO/win.mp3");
    this.loseSound = new Audio("AUDIO/lose.mp3");
    this.bgMusic = new Audio("AUDIO/bgm.mp3");
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.2;
    this.bgMusic.play();
    this.tileSet = await this.sliceSpritesheetWithIDs(this.spritesheet);
    this.ctx = this.canvas.getContext("2d");
    this.uiCtx = this.uiCanvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.interactUI.style.top = this.height * 1.2 + "px";
    this.grid = this.buildAstarGrid();
    this.playerTiles = await this.sliceSpritesheetWithIDs(
      this.playerSpritesheet,
      32,
    );
    this.walkTiles = await this.sliceSpritesheetWithIDs(
      this.walkSpritesheet,
      32,
    );
    this.runTiles = await this.sliceSpritesheetWithIDs(this.runSpritesheet, 32);

    this.playerTiles = this.organizePlayerTileSet(4, this.playerTiles);
    this.walkTiles = this.organizePlayerTileSet(8, this.walkTiles);
    this.runTiles = this.organizePlayerTileSet(8, this.runTiles);

    this.veg5012 = await this.sliceSpritesheetWithIDs(this.vegSpritesheet5012);
    this.veg34 = await this.sliceSpritesheetWithIDsV2(
      this.vegSpritesheet34,
      16,
      32,
    );
    let tempObj = {};
    for (let i = 0; i < Object.keys(this.veg5012).length; i++) {
      tempObj[i] = this.addPaddingOnTop(this.veg5012[i]);
    }
    this.veg5012 = tempObj;
    this.organizePlantTileset();
    this.plantParse();
    this.addHooks();
    this.debug();

    this.tileWidth = (this.canvas.width * 2) / this.tileMap.mapWidth;
    // this.centerMap();
    this.drawAllLayers();
    this.player = {
      x: this.width / 2,
      y: this.height / 2 - 200,
    };

    this.minInteractionDistance = this.tileWidth * this.scale * 1.5;

    this.animate();

    // PLAYER DATA
    this.coins = 500; // starter coins
    this.weapons = []; // TODO: Remove this array from avaliable weapons
    this.currentWeapon = null;

    this.fillShop(this.buyAbleWeapons);
    this.syncMoney();
    this.teleportPlayer(7, 7);
    this.cheatyGetGun();
    this.initGun();
  }

  // ANIMATE //
  /**
   * Main animation loop. Clears the canvas, redraws all layers, updates and draws plants, handles player movement,
   * collision detection, enemy AI, UI updates, and more.
   */
  animate() {
    if (!this.GAMEBEGIN) {
      requestAnimationFrame(() => this.animate());
      return;
    }
    this.nRenderCycles++;
    this.deltaT = Date.now() - this.lastT;
    this.lastT = Date.now();
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawAllLayers();
    this.drawAndUpdatePlants(); // plant growth && draw
    if (this.enableGun && this.currentWeapon) {
      this.currentWeapon.updateProjectiles(this.tileWidth, this.scale);
      this.drawBullets();
      this.updateGunUi();
      this.enemyBulletCollisionCheck();
      this.updateHeaderUi();
      if (this.enemies.length >= 1) {
        this.enemyAttack();
        this.playerBulletCollisionCheck();
        this.cleanEnemiesArray();
      }
    }
    this.checkWINLOSE();
    this.projectileCollisionDetection();
    this.drawPlayer();
    this.drawAllEnemies();

    this.updateHealthUi();
    this.updateEXPUi();
    this.updateBuffs();
    this.drawBuffs();
    this.waveHandler();

    if (this.nRenderCycles >= this.UPDATE_PATH_CYCLE) {
      this.nRenderCycles = 0;
      if (this.enemies.length > 0) {
        this.enemyPathfindUpdate();
      }
    }
    let interactible = this.findClosestInteractible();
    if (interactible) {
      this.handleInteraction(interactible);
    } else {
      this.hideInteractableUI();
    }

    if (this.tweenGroup) {
      this.tweenGroup.update();
    }
    this.update();
    requestAnimationFrame(() => this.animate());
  }
  /**
   * Updates player position based on keyboard input, handles collision detection,
   * and updates camera position.
   */
  update() {
    // beautiful beautiful beautiful

    let oldX = this.player.x;
    let oldY = this.player.y;

    let oldLastDirection = this.lastDirection;

    let newX = this.player.x;
    let newY = this.player.y;

    if (this.keys.ShiftLeft || this.keys.ShiftRight) {
      this.speedMultiplier = 2;
    } else {
      this.speedMultiplier = 1;
    }
    if (this.keys.KeyW) {
      newY -=
        this.speed * this.speedMultiplier * this.activePlayerModifiers.speed;
      this.lastDirection = "UP";
    }
    if (this.keys.KeyS) {
      newY +=
        this.speed * this.speedMultiplier * this.activePlayerModifiers.speed;
      this.lastDirection = "DOWN";
    }
    if (this.keys.KeyA) {
      newX -=
        this.speed * this.speedMultiplier * this.activePlayerModifiers.speed;
      this.lastDirection = "LEFT";
    }
    if (this.keys.KeyD) {
      newX +=
        this.speed * this.speedMultiplier * this.activePlayerModifiers.speed;
      this.lastDirection = "RIGHT";
    }

    if (
      !this.checkCollision(newX + this.playerOffsetX, newY + this.playerOffsetY)
    ) {
      this.player.x = newX;
      this.player.y = newY;
    } else {
      this.collideSound.play();
      if (this.currentCollisionBlock != "x") {
        this.player.x = newX;
        // console.log("Y");
      }
      if (this.currentCollisionBlock != "y") {
        this.player.y = newY;
        // console.log("X");
      }
    }
    if (this.keys.KeyW || this.keys.KeyS || this.keys.KeyA || this.keys.KeyD) {
      if (this.keys.ShiftLeft || this.keys.ShiftRight) {
        this.currentAction = "RUN";
      } else {
        this.currentAction = "WALK";
      }
    } else {
      this.currentAction = "IDLE";
    }

    if (this.isMovementLocked) {
      this.player.x = oldX;
      this.player.y = oldY;
      this.currentAction = "IDLE";
      this.lastDirection = oldLastDirection;
    }

    if (this.cameraSync) {
      this.camera.x = this.player.x;
      this.camera.y = this.player.y;
    }

    this.offsetX = this.camera.x;
    this.offsetY = this.camera.y;

    if (this.centerPlayer) {
      this.playerOffsetX = this.width / 2 - this.player.x;
      this.playerOffsetY = this.height / 2 - this.player.y;
    }

    this.prevX = this.player.x + this.playerOffsetX;
    this.prevY = this.player.y + this.playerOffsetY;
    const playerTile = this.getTilePosition(this.width / 2, this.height / 2);
    this.pickUpBuff(Math.floor(playerTile.x), Math.floor(playerTile.y));
    this.gameTime += this.deltaT;
  }

  // DRAWS //
  /**
   * Draws all layers of the tilemap.
   */
  drawAllLayers() {
    for (let i = this.tileMap.layers.length - 1; i >= 0; i--) {
      this.drawLayer(this.tileMap.layers[i]);
    }
  }
  /**
   * Draws a single layer of the tilemap.
   * @param {Object} layer - The layer data to draw.
   */
  drawLayer(layer) {
    const precision = 10;
    const epsilonR = 0.009;
    const tiles = layer.tiles;

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const tileImage = this.tileSet[tile.id];
      this.ctx.drawImage(
        tileImage,
        Math.round(
          (tile.x * this.tileWidth * this.scale - this.offsetX) *
            this.zoom *
            precision,
        ) / precision,
        Math.round(
          (tile.y * this.tileWidth * this.scale - this.offsetY) *
            this.zoom *
            precision,
        ) / precision,
        Math.round(
          this.tileWidth * (this.scale + epsilonR) * this.zoom * precision,
        ) / precision,
        Math.round(
          this.tileWidth * (this.scale + epsilonR) * this.zoom * precision,
        ) / precision,
      );
    }
  }
  /**
   * Draws the player character based on the current action (IDLE, WALK, RUN) and direction.
   */
  drawPlayer() {
    this.animDeltaT = Date.now() - this.animLastT;

    const actions = {
      IDLE: {
        frameCount: 4,
        speed: this.ANIM_SPEED_IDLE,
        draw: () => this.drawIdle(),
      },
      WALK: {
        frameCount: 8,
        speed: this.ANIM_SPEED_WALK,
        draw: () => this.drawWalk(),
      },
      RUN: {
        frameCount: 8,
        speed: this.ANIM_SPEED_RUN,
        draw: () => this.drawRun(),
      },
    };

    const currentAction = actions[this.currentAction];

    if (currentAction) {
      if (this.animDeltaT > currentAction.speed) {
        this[`last${this.currentAction}Frame`] =
          (this[`last${this.currentAction}Frame`] + 1) %
          currentAction.frameCount;
        this.animLastT = Date.now();
      }

      currentAction.draw();
    }
  }

  /**
   * Draws the player's idle animation frame.
   */
  drawIdle() {
    const directions = {
      UP: this.playerTiles.up,
      DOWN: this.playerTiles.down,
      LEFT: this.playerTiles.left,
      RIGHT: this.playerTiles.right,
    };
    const tiles = directions[this.lastDirection];
    if (tiles) {
      this.ctx.drawImage(
        tiles[this.lastIDLEFrame],
        this.player.x +
          this.playerOffsetX -
          (17 / 32) * this.scale * this.tileWidth * 1.6,
        this.player.y +
          this.playerOffsetY -
          (12 / 32) * this.scale * this.tileWidth * 2,
        this.scale * this.tileWidth * 1.7,
        this.scale * this.tileWidth * 1.7,
      );
    }
  }

  /**
   * Draws the player's walk animation frame.
   */
  drawWalk() {
    const directions = {
      UP: this.walkTiles.up,
      DOWN: this.walkTiles.down,
      LEFT: this.walkTiles.left,
      RIGHT: this.walkTiles.right,
    };
    const tiles = directions[this.lastDirection];
    if (tiles) {
      this.ctx.drawImage(
        tiles[this.lastWALKFrame],
        this.player.x +
          this.playerOffsetX -
          (17 / 32) * this.scale * this.tileWidth * 1.6,
        this.player.y +
          this.playerOffsetY -
          (12 / 32) * this.scale * this.tileWidth * 2,
        this.scale * this.tileWidth * 1.7,
        this.scale * this.tileWidth * 1.7,
      );
    }
  }

  /**
   * Draws the player's run animation frame.
   */
  drawRun() {
    const directions = {
      UP: this.runTiles.up,
      DOWN: this.runTiles.down,
      LEFT: this.runTiles.left,
      RIGHT: this.runTiles.right,
    };
    const tiles = directions[this.lastDirection];
    if (tiles) {
      this.ctx.drawImage(
        tiles[this.lastRUNFrame],
        this.player.x +
          this.playerOffsetX -
          (17 / 32) * this.scale * this.tileWidth * 1.6,
        this.player.y +
          this.playerOffsetY -
          (12 / 32) * this.scale * this.tileWidth * 2,
        this.scale * this.tileWidth * 1.7,
        this.scale * this.tileWidth * 1.7,
      );
    }
  }

  /**
   * Redraws the tilemap and player. (Currently unused)
   */
  redraw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawAllLayers();
    this.drawPlayer();
    this.drawDayNightCycle();
  }

  /**
   * Draws the day-night cycle overlay. (Currently unused)
   */
  drawDayNightCycle() {
    const currentTime = this.gameTime % 1200000;
    const hour = (currentTime / this.msPerHour) % 24;
    let color;
    if (hour >= 6 && hour < 12) {
      // mornin
      color = this.interpolateColor(
        "rgba(255, 255, 255, 0)",
        "rgba(255, 255, 255, 0)",
        (hour - 6) / 6,
      );
    } else if (hour >= 12 && hour < 18) {
      // post mornin
      color = this.interpolateColor(
        "rgba(255, 255, 255, 0)",
        "rgba(255, 255, 255, 0)",
        (hour - 12) / 6,
      );
    } else if (hour >= 18 && hour < 24) {
      // post post mornin
      color = this.interpolateColor(
        "rgba(255, 255, 255, 0)",
        "rgba(0, 0, 128, 0.5)",
        (hour - 18) / 6,
      );
    } else {
      // eepy time
      color = this.interpolateColor(
        "rgba(0, 0, 42, 0.5)",
        "rgba(255, 255, 255, 0)",
        (hour + 6) / 6,
      );
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Draws buffs on the canvas.
   */
  drawBuffs() {
    for (let i of this.actualBuffs) {
      this.ctx.fillStyle = i.color;
      const posX = i.x * this.tileWidth * this.scale - this.offsetX;
      const posY = i.y * this.tileWidth * this.scale - this.offsetY;
      this.ctx.fillRect(
        posX,
        posY,
        (this.tileWidth * this.scale) / 2,
        (this.tileWidth * this.scale) / 2,
      );
    }
  }

  /**
   * Checks if the player is colliding with a buff and picks it up.
   * @param {number} x - The x-coordinate of the tile to check.
   * @param {number} y - The y-coordinate of the tile to check.
   */
  pickUpBuff(x, y) {
    for (let i of this.actualBuffs) {
      if (i.x === x && i.y === y) {
        this.powerUpSound.play();
        this.activeBuffs.push(i);
        this.actualBuffs.splice(this.actualBuffs.indexOf(i), 1);
      }
    }
  }

  /**
   * Updates the duration of active buffs and applies their effects to the player.
   */
  updateBuffs() {
    // reset
    this.activePlayerModifiers.speed = 1;
    this.activePlayerModifiers.health = 1;
    this.activePlayerModifiers.damage = 1;
    if (this.currentWeapon) {
      for (let p of this.currentWeapon.projectiles) {
        p.damage = this.currentWeapon.damage;
        p.speed = this.currentWeapon.speed;
      }
    }
    this.activePlayerModifiers.bulletSpeed = 1;
    // console.log(this.activeBuffs);
    for (let i of this.activeBuffs) {
      i.duration -= this.deltaT;
      if (i.duration <= 0) {
        this.activeBuffs.splice(this.activeBuffs.indexOf(i), 1);
      }
      if (i.buff === "SPEED") {
        this.activePlayerModifiers.speed = 1.5;
      }
      if (i.buff === "HEALTH") {
        this.activePlayerModifiers.health = 1.5;
      }
      if (i.buff === "DAMAGE") {
        this.activePlayerModifiers.damage = 1.5;
        if (this.currentWeapon) {
          for (let p of this.currentWeapon.projectiles) {
            p.damage = this.currentWeapon.damage * 1.5;
          }
        }
      }
      if (i.buff === "BULLET_SPEED") {
        this.activePlayerModifiers.bulletSpeed = 1.5;
        if (this.currentWeapon) {
          for (let p of this.currentWeapon.projectiles) {
            p.speed = this.currentWeapon.bulletSpeed * 1.5;
          }
        }
      }
      if (i.buff === "SLOW") {
        this.activePlayerModifiers.speed = 0.5;
      }
      if (i.buff === "BLIND") {
        this.isMovementLocked = true;
        this.isUIOpen = true;
        this.startZoomEffect("in");
        i.duration = 0;
      }
    }
    // console.log(this.activePlayerModifiers);
  }
  /**
   * Draws the zoom effect used for transitions
   * @param {number} radius - The radius of the zoom circle.
   */
  drawZoomEffect(radius) {
    this.uiCtx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    this.uiCtx.fillStyle = "rgba(0, 0, 0, 1)";
    this.uiCtx.fillRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);

    this.uiCtx.globalCompositeOperation = "destination-out";
    this.uiCtx.beginPath();
    this.uiCtx.arc(
      this.player.x + this.playerOffsetX,
      this.player.y + this.playerOffsetY,
      radius,
      0,
      Math.PI * 2,
    );
    this.uiCtx.fill();
    this.uiCtx.globalCompositeOperation = "source-over";
  }
  /**
   * Starts the zoom effect animation.
   * @param {string} dir - The direction of the zoom ("in" or "out").
   */
  startZoomEffect(dir) {
    const duration = 1000; // ms
    const finalRadius = 150;
    const initialRadius = Math.max(this.uiCanvas.width, this.uiCanvas.height);
    let actualFinalRadius = finalRadius;
    let actualInitialRadius = initialRadius;

    if (dir === "out") {
      actualFinalRadius = initialRadius;
      actualInitialRadius = finalRadius;
    }

    this.testTween = new TWEEN.Tween({ radius: actualInitialRadius })
      .to({ radius: actualFinalRadius }, duration)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(({ radius }) => {
        this.drawZoomEffect(radius);
      })
      .onComplete(() => {
        // this.uiCtx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
        setTimeout(() => {
          this.testTweenStep2.start();
        }, 750);
      });
    this.testTweenStep2 = new TWEEN.Tween({ radius: actualFinalRadius })
      .to({ radius: 0 }, duration)
      .easing(TWEEN.Easing.Quadratic.In)
      .onUpdate(({ radius }) => {
        this.drawZoomEffect(radius);
      })
      .onComplete(() => {
        setTimeout(() => {
          this.testTweenStep3.start();
        }, 1000);
      });
    this.testTweenStep3 = new TWEEN.Tween({ radius: 0 })
      .to({ radius: actualInitialRadius }, duration)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(({ radius }) => {
        this.drawZoomEffect(radius);
      })
      .onComplete(() => {
        this.uiCtx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
        this.isUIOpen = false;
        this.isMovementLocked = false;
        // console.log("DONE");
      });
    this.tweenGroup.add(this.testTween);
    this.tweenGroup.add(this.testTweenStep2);
    this.tweenGroup.add(this.testTweenStep3);
    // this.testTween.chain(this.testTweenStep2);
    this.testTween.start();
  }
  /**
   * Converts screen coordinates to tile coordinates.
   * @param {number} screenX - The x-coordinate on the screen.
   * @param {number} screenY - The y-coordinate on the screen.
   * @returns {Object} An object with `x` and `y` properties representing the tile coordinates.
   */
  getTilePosition(screenX, screenY) {
    const tileX =
      (screenX + this.offsetX) / (this.tileWidth * this.scale * this.zoom);
    const tileY =
      (screenY + this.offsetY) / (this.tileWidth * this.scale * this.zoom);
    return { x: tileX, y: tileY };
  }
  /**
   * Calculates the offset required to center the camera on a given tile.
   * @param {number} tileX - The x-coordinate of the tile.
   * @param {number} tileY - The y-coordinate of the tile.
   * @returns {Object} An object containing the calculated `offsetX` and `offsetY`.
   */
  getTileOffset(tileX, tileY) {
    const offsetX =
      tileX * this.tileWidth * this.scale * this.zoom - this.width / 2;
    const offsetY =
      tileY * this.tileWidth * this.scale * this.zoom - this.height / 2;
    return { offsetX, offsetY };
  }

  // TELEPORT //
  /**
   * Teleports the player to a specific tile coordinate.
   * @param {number} x - The x-coordinate of the tile to teleport to.
   * @param {number} y - The y-coordinate of the tile to teleport to.
   */
  teleportPlayer(x, y) {
    // ABS TILE COORDs!!!
    let newOffset = this.getTileOffset(x, y);

    this.player.x = newOffset.offsetX;
    this.player.y = newOffset.offsetY;
  }
  /**
   * Draws a red dot the player's position debugging.
   */
  debugPlayerDot() {
    this.ctx.fillStyle = "red";
    this.ctx.fillRect(
      this.player.x + this.playerOffsetX,
      this.player.y + this.playerOffsetY,
      16 * this.scale,
      16 * this.scale,
    );

    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, 16 * this.scale, 16 * this.scale);
    // console.log(this.player)
  }

  debugGrid() {
    for (let x = 0; x < this.width; x += 16 * this.scale) {
      for (let y = 0; y < this.height; y += 16 * this.scale) {
        this.ctx.strokeStyle = "rgba(0,0,0,0.1)";
        this.ctx.strokeRect(x, y, 16 * this.scale, 16 * this.scale);
      }
    }
  }

  // HELPERs  //
  /**
   * Organizes player tileset by direction (up, down, left, right).
   * @param {number} n - The number of frames per direction.
   * @param {Object} tileset - The tileset object containing the image tiles.
   * @returns {Object} The organized tileset.
   */
  organizePlayerTileSet(n, tileset) {
    let newPlayerTileSet = {
      up: {},
      down: {},
      left: {},
      right: {},
    };

    // 0..nth = down
    for (let i = 0; i < n; i++) {
      newPlayerTileSet.down[i] = tileset[i];
    }
    // nth..2n = right
    for (let i = n; i < 2 * n; i++) {
      newPlayerTileSet.right[i - n] = tileset[i];
    }
    // nth..2n = mirrored for right
    for (let i = n; i < 2 * n; i++) {
      newPlayerTileSet.left[i - n] = this.mirrorImage(tileset[i]);
    }
    // 3n..4n = up
    for (let i = 3 * n; i < 4 * n; i++) {
      newPlayerTileSet.up[i - 3 * n] = tileset[i];
    }
    return newPlayerTileSet;
  }

  /**
   * Organizes the plant tileset based on growth stages and vegetable types.
   */
  organizePlantTileset() {
    const tilesets = this.veg5012;
    const tileset34 = this.veg34;

    let plantTileSet = {
      CARROT: {},
      CAULI: {},
      PUMPKIN: {},
      SUNFLOWER: {},
      RADISH: {},
      PARSNIP: {},
      POTATO: {},
      CABBAGE: {},
      BEETROOT: {},
      WHEAT: {},
      KALE: {},
    };

    const vegetables = Object.keys(plantTileSet);
    const tiles = Object.values(tilesets);
    const tiles34 = Object.values(tileset34);

    vegetables.forEach((veg, vegIndex) => {
      // veg5012
      const startIdx = vegIndex * 4;
      const group = tiles.slice(startIdx, startIdx + 4);

      plantTileSet[veg][5] = group[0]; // tile 5
      plantTileSet[veg][0] = group[1]; // tile 0
      plantTileSet[veg][1] = group[2]; // tile 1
      plantTileSet[veg][2] = group[3]; // tile 2

      // veg34
      const startIdx34 = vegIndex * 2;
      const group34 = tiles34.slice(startIdx34, startIdx34 + 2);

      plantTileSet[veg][3] = group34[0]; // tile 3
      plantTileSet[veg][4] = group34[1]; // tile 4
    });

    console.log("Plant Tileset", plantTileSet);
    this.plantTiles = plantTileSet;
    // return plantTileSet;
  }

  centerMap() {
    this.offsetX =
      (this.width - this.tileMap.mapWidth * this.tileWidth * this.scale) / 2;
    this.offsetY =
      (this.height - this.tileMap.mapHeight * this.tileWidth * this.scale) / 2;
  }
  /**
   * Interpolates between two RGBA colors.
   * @param {string} color1 - The first RGBA color string.
   * @param {string} color2 - The second RGBA color string.
   * @param {number} factor - The interpolation factor between 0 and 1.
   * @returns {string} The interpolated RGBA color string.
   */
  interpolateColor(color1, color2, factor) {
    const c1 = this.rgbaToRgb(color1);
    const c2 = this.rgbaToRgb(color2);
    const result = {
      r: Math.round(c1.r + factor * (c2.r - c1.r)),
      g: Math.round(c1.g + factor * (c2.g - c1.g)),
      b: Math.round(c1.b + factor * (c2.b - c1.b)),
      a: c1.a + factor * (c2.a - c1.a),
    };
    return `rgba(${result.r}, ${result.g}, ${result.b}, ${result.a})`;
  }

  /**
   * Converts an RGBA color string to an RGB object.
   * @param {string} rgba - The RGBA color string.
   * @returns {Object} An object with `r`, `g`, `b`, and `a` properties.
   */
  rgbaToRgb(rgba) {
    // epic regex time
    const parts = rgba.match(/rgba?\((\d+), (\d+), (\d+),? ?(\d?.?\d+)?\)/);
    return {
      r: parseInt(parts[1], 10),
      g: parseInt(parts[2], 10),
      b: parseInt(parts[3], 10),
      a: parts[4] ? parseFloat(parts[4]) : 1,
    };
  }

  // COLLISION DETECTION //
  /**
   * Checks for collisions between the player and collidable tiles.
   * @param {number} x - The player's x-coordinate.
   * @param {number} y - The player's y-coordinate.
   * @returns {boolean} True if a collision occurred, false otherwise.
   */
  checkCollision(x, y) {
    const newX = x;
    const newY = y;
    const playerWidth = 20; // hitbox
    const playerHeight = 20;
    const tileWidth = this.tileWidth * this.scale;
    const tileHeight = this.tileWidth * this.scale;

    const prevX = this.prevX;
    const prevY = this.prevY;

    let collisionX = false;
    let collisionY = false;

    for (let layer of this.tileMap.layers) {
      if (layer.collider) {
        for (let tile of layer.tiles) {
          const tileX = tile.x * tileWidth - this.offsetX;
          const tileY = tile.y * tileHeight - this.offsetY;

          // x
          if (
            newX < tileX + tileWidth &&
            newX + playerWidth > tileX &&
            prevY < tileY + tileHeight &&
            prevY + playerHeight > tileY
          ) {
            collisionX = true;
            if (newX > prevX) {
              this.currentCollisionBlock = "x";
            } else if (newX < prevX) {
              this.currentCollisionBlock = "x";
            }
          }

          // y
          if (
            prevX < tileX + tileWidth &&
            prevX + playerWidth > tileX &&
            newY < tileY + tileHeight &&
            newY + playerHeight > tileY
          ) {
            collisionY = true;
            if (newY > prevY) {
              this.currentCollisionBlock = "y";
            } else if (newY < prevY) {
              this.currentCollisionBlock = "y";
            }
          }

          if (collisionX && collisionY) {
            break;
          }
        }
      }
    }

    if (!collisionX && !collisionY) {
      this.currentCollisionBlock = null;
    }

    return collisionX || collisionY;
  }

  // from pong
  /**
   * Checks for collision between a circle and a rectangle.
   * @param {Object} a - The circle object with `x`, `y`, and `radius` properties.
   * @param {Object} b - The rectangle object with `x`, `y`, `width`, and `height` properties.
   * @returns {Object} An object containing `collision` (boolean) and `normal` (Vec2).
   */
  circleRect(a, b) {
    const EPSILON = 0.0001; // margin of error
    // A IS THE CIRCLE
    let cx = a.x;
    let cy = a.y;
    let radius = a.radius;

    // B IS THE RECTANGLE
    let rx = b.x;
    let ry = b.y;
    let rw = b.width;
    let rh = b.height;

    // nearest point rectangle to the circle center
    let testX = cx;
    let testY = cy;

    if (cx < rx) {
      testX = rx;
    } else if (cx > rx + rw) {
      testX = rx + rw;
    }
    if (cy < ry) {
      testY = ry;
    } else if (cy > ry + rh) {
      testY = ry + rh;
    }

    // dist between circle center & nearest point on rect
    let distX = cx - testX;
    let distY = cy - testY;
    let distance = Math.sqrt(distX * distX + distY * distY);

    let isColliding = distance <= radius + EPSILON;

    let normal = new UTILS.Vec2(0, 0);
    if (isColliding && distance > EPSILON) {
      // i love NaN
      normal.x = distX / distance;
      normal.y = distY / distance;
    }

    return { collision: isColliding, normal: normal };
  }

  /**
   * Checks for collisions between enemy characters and player bullets.
   */
  enemyBulletCollisionCheck() {
    for (let i of this.currentWeapon.projectiles) {
      for (let j of this.enemies) {
        // console.log(i, j);
        const r = { x: j.x, y: j.y, width: 1, height: 1 };
        const c = { x: i.position.x, y: i.position.y, radius: 0.01 };
        if (this.circleRect(c, r).collision) {
          j.health -= i.damage;
          if (j.health <= 0) {
            j.health = 0;
            this.dropBuffsEnemy(j.x, j.y);
            this.coins += this.baseStats.coins;
            this.hp += 10;
            if (this.hp > 100) {
              this.hp = 100;
            }
          }
          i.alive = false;
        }
      }
    }
  }

  playerBulletCollisionCheck() {
    for (let i of this.enemies) {
      for (let p of i.projectiles) {
        if (!p.alive) continue;
        const playerCoord = this.getTilePosition(
          this.width / 2,
          this.height / 2,
        );
        const r = { x: playerCoord.x, y: playerCoord.y, width: 1, height: 1 };
        const c = { x: p.position.x, y: p.position.y, radius: 0.01 };
        if (this.circleRect(c, r).collision) {
          this.hp -= p.damage;
          p.alive = false;
          if (this.hp <= 0) {
            this.hp = 0;
            this.gameOver();
          }
        }
      }
    }
  }

  /**
   * Finds the closest interactible tile to the player.
   * @returns {Object | null} The closest interactible tile, or null if none are within range.
   */
  findClosestInteractible() {
    const interactibleLayer = this.tileMap.layers.find(
      (layer) => layer.name === "INTERACTIBLES",
    );
    if (!interactibleLayer) return null;

    const playerX = this.player.x + this.playerOffsetX;
    const playerY = this.player.y + this.playerOffsetY;

    let closestTile = null;
    let minDistance = this.minInteractionDistance;

    for (let tile of interactibleLayer.tiles) {
      const tileX =
        tile.x * this.tileWidth * this.scale -
        this.offsetX +
        (this.tileWidth * this.scale) / 2;
      const tileY =
        tile.y * this.tileWidth * this.scale -
        this.offsetY +
        (this.tileWidth * this.scale) / 2;

      // // debug
      // this.ctx.fillStyle = "rgba(0,0,255,0.5)";
      // this.ctx.fillRect(
      //   tileX,
      //   tileY,
      //   (this.tileWidth * this.scale) / 2,
      //   (this.tileWidth * this.scale) / 2,
      // );
      // this.ctx.fillStyle = "rgba(0,255,0,0.5)";
      // this.ctx.fillRect(
      //   playerX,
      //   playerY,
      //   (this.tileWidth * this.scale) / 2,
      //   (this.tileWidth * this.scale) / 2,
      // );

      const distance = Math.hypot(playerX - tileX, playerY - tileY);
      if (distance < minDistance) {
        minDistance = distance;
        closestTile = tile; // closest tile
      }
    }
    return closestTile;
  }

  /**
   * Handles interaction with interactible tiles.
   * @param {Object} tile - The interactible tile.
   */
  handleInteraction(tile) {
    if (!tile) {
      this.hideInteractableUI();
      this.currentInteractible = null;
      return;
    }

    const interactionMap = {
      93: "ANVIL",
      94: "ANVIL",
      99: "BED",
      100: "BED",
      0: "WEAPON_BUCKET",
      1: "WEAPON_BUCKET",
      90: "LADDER",
      89: "SIGN",
      91: "BEETROOT",
    };

    const positionalDepedents = {
      SIGN: [
        {
          pos: { x: 20, y: 5 },
          val: "THIS IS A TEST SIGN @ POS 20 5",
        },
      ],
    };

    const interactionType = interactionMap[tile.id];
    if (!interactionType) {
      this.hideInteractableUI();
      this.currentInteractible = null;
      return;
    }

    if (positionalDepedents[interactionType]) {
      const dependent = positionalDepedents[interactionType].find(
        (dep) => dep.pos.x === tile.x && dep.pos.y === tile.y,
      );
      if (dependent) {
        this.showInteractableUI(dependent.val);
        this.currentInteractible = interactionType;
        return;
      }
    }
    switch (interactionType) {
      case "ANVIL":
        // console.log("ANVIL");
        this.showInteractableUI("Press E to use the anvil");
        break;
      case "BED":
        // console.log("BED");
        this.showInteractableUI("Press E to sleep");
        break;
      case "WEAPON_BUCKET":
        // console.log("WEAPON_BUCKET");
        this.showInteractableUI("Press E to use the anvil");
        break;
      case "LADDER":
        // console.log("LADDER");
        this.showInteractableUI("Press E to climb the ladder");
        break;
      case "SIGN":
        // console.log("SIGN");
        // this.showInteractableUI("Press E to read the sign");
        break;
      case "BEETROOT":
        // console.log("MELON");
        this.showInteractableUI("Press E to eat the beetroot");
        break;
      default:
        this.hideInteractableUI();
        break;
    }
    this.currentInteractible = interactionMap[tile.id];
  }
  /**
   * Performs the actual interaction logic based on the current interactible.
   */
  handleActualInteraction() {
    switch (this.currentInteractible) {
      case "ANVIL":
        console.log("ANVIL");
        break;
      case "BED":
        console.log("BED");
        this.sleepSequence();
        break;
      case "WEAPON_BUCKET":
        if (this.isUIOpen) return;
        this.isUIOpen = true;
        this.isMovementLocked = true;
        console.log("WEAPON_BUCKET");
        this.moveUIUp();
        this.moveMoneyUp();
        this.hideInteractableUI();
        break;
      case "LADDER":
        console.log("LADDER");
        break;
      case "SIGN":
        console.log("SIGN");
        break;
      case "BEETROOT":
        console.log("BEETROOT");
        break;
      default:
        break;
    }
  }
  /**
   * Self explanatory.
   * @param {string} message - The message to display.
   */
  showInteractableUI(message) {
    if (this.isUIOpen) return;
    this.interactUI.innerText = message;
    this.interactUI.style.top = "90%";
    this.interactUI.style.opacity = 1;
  }
  /**
   * Self explanatory.
   */
  hideInteractableUI() {
    this.interactUI.style.top = "120%";
    this.interactUI.style.opacity = 0;
  }

  /**
   * Self explanatory.
   */
  sleepSequence() {
    if (this.isUIOpen) return;
    // zoom to black
    this.isUIOpen = true;
    this.hideInteractableUI();
    this.isMovementLocked = true;
    this.startZoomEffect("in");
  }

  debug() {
    this.debugGrid();
  }

  // ECONOMY - SHOP //
  /**
   * Purchases an item from the shop and adds it to the player's inventory.
   * @param {string} item - The name of the item to buy.
   */
  buyItem(item) {
    // find the item in the shop
    const itemToBuy = this.buyAbleWeapons.find((i) => i.name === item);
    if (!itemToBuy) return;
    // check if player has enough money
    if (this.coins >= itemToBuy.cost) {
      // deduct the cost from player
      this.coins -= itemToBuy.cost;
      this.syncMoney();
      // add the item to player's inventory
      this.weapons.push(itemToBuy);
      console.log("Bought: ", itemToBuy);
      this.currentWeapon = itemToBuy;
      this.initGun();
      // remove the item from the shop
      this.buyAbleWeapons = this.buyAbleWeapons.filter(
        (i) => i.name !== itemToBuy.name,
      );
      // update the shop
      this.fillShop(this.buyAbleWeapons);
    } else {
      console.log("Not enough money");
    }
  }
  /**
   * Fills the shop UI with available weapons.
   * @param {Array<Object>} weapons - An array of weapon objects.
   */
  fillShop(weapons) {
    // clear the shop
    this.scrollItemsContainer.innerHTML = "";

    // prefill with first item
    this.currentItemName.innerHTML = weapons[0].name;
    this.currentItemPrice.innerHTML = weapons[0].cost;
    this.currentItemImg.src = weapons[0].img;
    this.currentItemDesc.innerHTML = weapons[0].desc;
    this.currentItemDmg.innerHTML = weapons[0].damage;
    this.currentItemRng.innerHTML = weapons[0].range;
    this.currentItemSpd.innerHTML = weapons[0].speed;
    this.currentItemMagSize.innerHTML = weapons[0].magSize;
    this.currentItemReloadTime.innerHTML = weapons[0].reloadTime;
    this.priceButton.innerHTML = "Buy - " + weapons[0].cost;

    if (this.coins < weapons[0].cost) {
      this.priceButton.innerHTML = "Not enough";
    }
    // fill the shop with items

    for (let i of weapons) {
      let item = document.createElement("div");
      item.classList.add("itemContainer");
      item.innerHTML = i.name;
      item.addEventListener("click", () => {
        this.currentItemName.innerHTML = i.name;
        this.currentItemPrice.innerHTML = i.cost;
        this.currentItemImg.src = i.img;
        this.currentItemDesc.innerHTML = i.desc;
        this.currentItemDmg.innerHTML = i.damage;
        this.currentItemRng.innerHTML = i.range;
        this.currentItemSpd.innerHTML = i.speed;
        this.currentItemMagSize.innerHTML = i.magSize;
        this.currentItemReloadTime.innerHTML = i.reloadTime;
        this.priceButton.innerHTML = "Buy - " + i.cost;
        if (this.coins < i.cost) {
          this.priceButton.innerHTML = "Not enough";
        }
      });
      scrollItemsContainer.appendChild(item);
    }
  }

  /**
   * Updates the gun UI elements with the current weapon's information.
   */
  updateGunUi() {
    if (!this.currentWeapon) return;
    this.wpTitle.innerHTML = this.currentWeapon.name;
    this.ammoInd.innerHTML = this.currentWeapon.ammo;
    this.actInd.innerHTML = this.currentWeapon.currentAct;
    const rldPct =
      (Date.now() - this.currentWeapon.lastReloaded) /
      this.currentWeapon.reloadTime;
    if (rldPct < 1) {
      this.rldInd.style.width = rldPct * 100 + "%";
      this.actInd.innerHTML = "reloading";
    } else {
      this.rldInd.style.width = "100%";
    }
  }

  /**
   * Self explanatory.
   */
  updateHealthUi() {
    this.hpVal.innerHTML =
      this.hp * this.activePlayerModifiers.health +
      "/" +
      this.MAX_HP * this.activePlayerModifiers.health;
    const hpPct = (this.hp / this.MAX_HP) * 100;
    this.hpBar.style.width = hpPct + "%";
  }
  /**
   * Self explanatory.
   */
  updateEXPUi() {
    this.expVal.innerHTML =
      this.exp + "/" + this.expToNextLevel(this.level + 1);
    const expPct = (this.exp / this.expToNextLevel(this.level + 1)) * 100;
    this.expBar.style.width = expPct + "%";
    this.expTitle.innerHTML = "EXP " + "(LV. " + this.level + ")";
  }
  /**
   * Self explanatory.
   */
  updateHeaderUi() {
    this.waveHeader.innerHTML = "WAVE " + this.currentWave;
    try {
      this.enemiesLeft.innerHTML =
        this.enemies.length + "/" + this.currentGLOBALmodifiers.nEnemies;
    } catch (e) {
      this.winGame();
    }
  }
  // UI TRANSITIONS //
  //
  /**
   * Self explanatory.
   */
  syncMoney() {
    this.moneyInd.innerHTML = this.coins;
  }
  /**
   * Self explanatory.
   */
  moveUIUp() {
    this.mainShopContainer.classList.add("up");
    this.mainShopContainer.classList.remove("down");
  }

  /**
   * Self explanatory.
   */
  moveUIDown() {
    this.mainShopContainer.classList.add("down");
    this.mainShopContainer.classList.remove("up");
  }
  /**
   * Self explanatory.
   */
  moveMoneyUp() {
    this.moneyContainer.classList.add("up");
    this.moneyContainer.classList.remove("down");
  }
  /**
   * Self explanatory.
   */
  moveMoneyDown() {
    this.moneyContainer.classList.add("down");
    this.moneyContainer.classList.remove("up");
  }

  // DMG //
  /**
   * Self explanatory.
   * @param {number} dmg - The amount of damage to deal.
   */
  damagePlayer(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.hp = 0;
      this.gameOver();
    }
  }
  /**
   * Self explanatory.
   * @param {number} heal - The amount of health to heal.
   */
  healPlayer(heal) {
    this.hp += heal;
    if (this.hp > this.MAX_HP) {
      this.hp = this.MAX_HP;
    }
  }

  gameOver() {}
  // SCOPE CREEP //
  // HARVESTING //
  plantParse() {
    // scope creep
    // Plants locations defined in tilemap as the 0th growth stage,
    // with the lower tile as the actual plant position for gorwth stages 3, 4 which have a height of 2 tiles
    // Stage 4 is the last graphical stage, stage 5 is the inventory/icon
    const plantMap = {
      // POSSIBLE PLANTS :
      // "CARROT", "CAULI", "PUMPKIN", "SUNFLOWER", "RADISH",
      // "BEETROOT", "PARSNIP", "POTATO", "CABBAGE", "KALE", "WHEAT"
      91: "BEETROOT",
    };

    const plantLayer = this.tileMap.layers.find(
      (layer) => layer.name === "PLANTS",
    );
    if (!plantLayer) return;

    for (let tile of plantLayer.tiles) {
      const plantType = plantMap[tile.id];
      if (!plantType) continue;
      const plant = new PLANT.Plant(
        plantType,
        { x: tile.x, y: tile.y },
        this.plantTiles[plantType],
      );
      this.plants.push(plant);
    }
  }

  harvest(tile) {
    // scope creep
    // TODO: Verify for fully mature crops
    // Use the return from findClosestInteractible() to get the tile
    // check if the tile is a plant
    const plant = this.plants.find((p) => p.x === tile.x && p.y === tile.y);
    if (!plant) return;
    // check if the plant is fully grown
    if (plant.stage < 4) return; // TODO: warn player
    if (plant.harvest()) {
      // add the plant to the player's inventory
      this.inventory.push(plant); // TODO: replace with actual item
    }
  }

  drawAndUpdatePlants() {
    // scope creep
    for (let i of this.plants) {
      // get img from update
      const tileImg = i.update();
      // draw (the postion refers to the bottom tile of the plant, the plant is composed of 2 tiles as a single img)
      this.ctx.drawImage(
        tileImg,
        i.x * this.tileWidth * this.scale - this.offsetX,
        i.y * this.tileWidth * this.scale - this.offsetY,
        this.tileWidth * this.scale,
        this.tileWidth * this.scale * 2,
      );
    }
  }

  // 🦅🦅🦅🦅🦅🦅🦅🦅🦅//
  // GUNs //
  initGun() {
    if (this.weapons.length > 0 && !this.currentWeapon) {
      this.currentWeapon = this.weapons[0];
      this.currentWeapon.assignCanvas(this.canvas);
    }
    if (this.currentWeapon) {
      this.currentWeapon.assignCanvas(this.canvas);
    }
  }

  cheatyGetGun() {
    this.currentWeapon = WP.starterWeapons[0];
  }

  projectileCollisionDetection() {
    // REDO
    if (!this.currentWeapon) return;
    if (!this.enableGun) return;

    const projectiles = this.currentWeapon.projectiles;

    for (let i of projectiles) {
      for (let layer of this.tileMap.layers) {
        // TODO: reduce time complexity ... how? currently O(n^2) ish
        if (layer.collider) {
          for (let tile of layer.tiles) {
            const circle = {
              x: i.position.x,
              y: i.position.y,
              radius: 0.2, // TODO: make this a property of the projectile
            };
            // console.log(circle);
            const rect = {
              x: tile.x,
              y: tile.y,
              width: 1,
              height: 1,
            };
            // this.ctx.fillStyle = "rgba(0,0,255,0.1)";
            // this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

            const collision = this.circleRect(circle, rect);
            if (collision.collision) {
              i.alive = false;
              // console.log("HIT");
            }
          }
        }
      }
    }
    for (let e of this.enemies) {
      for (let p of e.projectiles) {
        for (let layer of this.tileMap.layers) {
          // TODO: reduce time complexity ... how? currently O(n^2) ish
          if (layer.collider) {
            for (let tile of layer.tiles) {
              const circle = {
                x: p.position.x,
                y: p.position.y,
                radius: 0.2, // TODO: make this a property of the projectile
              };
              // console.log(circle);
              const rect = {
                x: tile.x,
                y: tile.y,
                width: 1,
                height: 1,
              };
              // this.ctx.fillStyle = "rgba(0,0,255,0.1)";
              // this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

              const collision = this.circleRect(circle, rect);
              if (collision.collision) {
                p.alive = false;
                // console.log("HIT");
              }
            }
          }
        }
      }
    }
  }

  spawnEnemies() {
    const mapWidth = this.tileMap.mapWidth;
    const mapHeight = this.tileMap.mapHeight;
    const playerSafeZone = {
      x1: this.player.x - this.SAFE_ZONE / 2,
      x2: this.player.x + this.SAFE_ZONE / 2,
      y1: this.player.y - this.SAFE_ZONE / 2,
      y2: this.player.y + this.SAFE_ZONE / 2,
    };

    let validPositionFound = false;
    let spawnX, spawnY;

    while (!validPositionFound) {
      spawnX = Math.random() * mapWidth;
      spawnY = Math.random() * mapHeight;

      const isOutsideSafeZone =
        spawnX < playerSafeZone.x1 ||
        spawnX > playerSafeZone.x2 ||
        spawnY < playerSafeZone.y1 ||
        spawnY > playerSafeZone.y2;

      if (!isOutsideSafeZone) continue;

      let isInsideTile = false;
      for (let layer of this.tileMap.layers) {
        if (layer.collider) {
          for (let tile of layer.tiles) {
            const tileLeft = tile.x;
            const tileRight = tile.x + 1;
            const tileTop = tile.y;
            const tileBottom = tile.y + 1;

            if (
              spawnX >= tileLeft &&
              spawnX < tileRight &&
              spawnY >= tileTop &&
              spawnY < tileBottom
            ) {
              isInsideTile = true;
              break;
            }
          }
        }
        if (isInsideTile) break;
      }
      if (!isInsideTile) {
        validPositionFound = true;
      }
    }
    this.spawnEnemyAt(Math.floor(spawnX), Math.floor(spawnY));
  }
  /**
   * Spawns an enemy at the specified tile coordinates.
   * @param {number} x - The x-coordinate of the tile.
   * @param {number} y - The y-coordinate of the tile.
   * @param {number} [maxHealth=10] - The maximum health of the enemy.
   */
  spawnEnemyAt(x, y, maxHealth = 10) {
    const tileW = this.tileWidth * this.scale;
    const enemy = new ENEMY.Enemy(maxHealth, 5, 0.05, x, y, tileW, tileW);
    this.enemies.push(enemy);
    this.enemyPathfindUpdate();
  }

  drawAllEnemies() {
    for (let enemy of this.enemies) {
      enemy.update();
      for (let i of enemy.projectiles) {
        i.update(this.tileWidth, this.scale);
      }
      enemy.draw(
        this.ctx,
        enemy.x * this.tileWidth * this.scale - this.offsetX,
        enemy.y * this.tileWidth * this.scale - this.offsetY,
      );
    }
  }

  enemyPathfindUpdate() {
    if (!this.grid) {
      this.grid = this.buildAstarGrid();
    }

    const tilePos = this.getTilePosition(this.width / 2, this.height / 2);
    const end = { x: Math.floor(tilePos.x), y: Math.floor(tilePos.y) };

    for (let enemy of this.enemies) {
      const start = { x: Math.round(enemy.x), y: Math.round(enemy.y) };

      // by appoinment only
      if (enemy.path) {
        for (let step of enemy.path) {
          this.grid[step.y][step.x] = 0;
        }
      }

      // rm -rf player position from grid
      // this.grid[playerTilePos.y][playerTilePos.x] = 0;

      const newPath = PF.aStar(this.grid, start, end);
      const actualPathEnd = newPath.at(-1);
      if (actualPathEnd) {
        if (actualPathEnd.x === end.x && actualPathEnd.y === end.y) {
          newPath.pop();
        }
      }
      for (let step of newPath) {
        if (step.y === tilePos.y && step.x === tilePos.x) {
          console.log("Player position in path");
          continue; // skip player position
        }
        this.grid[step.y][step.x] = 1;
      }
      // newPath.pop(); // remove player position from path
      enemy.setPath(newPath);
    }
  }

  buildAstarGrid() {
    if (this.ogGrid) {
      let grid = this.ogGrid.map((row) => row.slice());

      for (let enemy of this.enemies) {
        if (enemy.path) {
          for (let step of enemy.path) {
            grid[step.y][step.x] = 0; // reserve the path
          }
        }
      }
      return grid;
    }
    let grid = [];
    for (let i = 0; i < this.tileMap.mapWidth; i++) {
      grid[i] = [];
      for (let j = 0; j < this.tileMap.mapHeight; j++) {
        grid[i][j] = 0;
      }
    }

    for (let layer of this.tileMap.layers) {
      if (layer.collider) {
        for (let tile of layer.tiles) {
          grid[tile.y][tile.x] = 1;
        }
      }
    }

    if (!this.ogGrid) {
      this.ogGrid = grid;
    }

    return grid;
  }

  drawEnemyPath() {
    //debug
    if (!this.grid) return;
    if (!this.enemies.length) return;

    for (let enemy of this.enemies) {
      if (!enemy.path) continue;
      for (let i of enemy.path) {
        this.drawSquareFromTileXYContrast(i.x, i.y);
      }

      if (enemy.path.length) {
        this.drawSquareFromTileXY(enemy.path[0].x, enemy.path[0].y); // start
        this.drawSquareFromTileXY(
          enemy.path[enemy.path.length - 1].x,
          enemy.path[enemy.path.length - 1].y,
        ); // end
      }
    }
  }
  drawSquareFromTileXY(x, y) {
    this.ctx.fillStyle = "rgba(255,0,255,0.5)";
    this.ctx.fillRect(
      x * this.tileWidth * this.scale - this.offsetX,
      y * this.tileWidth * this.scale - this.offsetY,
      this.tileWidth * this.scale,
      this.tileWidth * this.scale,
    );
  }
  drawSquareFromTileXYContrast(x, y) {
    this.ctx.fillStyle = "rgba(255,0,0,0.5)";
    this.ctx.fillRect(
      x * this.tileWidth * this.scale - this.offsetX,
      y * this.tileWidth * this.scale - this.offsetY,
      this.tileWidth * this.scale,
      this.tileWidth * this.scale,
    );
  }

  drawGrid() {
    if (this.grid) {
      for (let i = 0; i < this.grid.length; i++) {
        for (let j = 0; j < this.grid[i].length; j++) {
          if (this.grid[i][j] === 1) {
            this.drawSquareFromTileXY(j, i);
          }
        }
      }
    }
  }

  drawBullets() {
    if (this.currentWeapon) {
      for (let bullet of this.currentWeapon.projectiles) {
        const pos = bullet.position;

        this.ctx.fillStyle = bullet.color;
        this.ctx.fillRect(
          pos.x * this.tileWidth * this.scale - this.offsetX,
          pos.y * this.tileWidth * this.scale - this.offsetY,
          20,
          20,
        );
      }
    }

    if (this.enemies.length >= 1) {
      for (let enemy of this.enemies) {
        for (let b of enemy.projectiles) {
          if (!b.alive) continue;
          this.ctx.fillStyle = b.color;
          this.ctx.fillRect(
            b.position.x * this.tileWidth * this.scale - this.offsetX,
            b.position.y * this.tileWidth * this.scale - this.offsetY,
            20,
            20,
          );
        }
      }
    }
  }

  // IMAGE MANIP //
  /**
   * Asynchronously slices a spritesheet image into individual tiles and assigns each tile a unique ID.
   *
   * @param {HTMLImageElement} image - The spritesheet image to be sliced.
   * @param {number} [tileSize=16] - The width and height (in pixels) of each tile. Defaults to 16x16.
   * @returns {Promise<Object<number, HTMLImageElement>>} A promise that resolves to an object where each key is a unique tile ID, nd the value is the corresponding tile as an HTMLImageElement
   */
  async sliceSpritesheetWithIDs(image, tileSize = 16) {
    const tiles = {};
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    const rows = Math.floor(image.height / tileSize);
    const cols = Math.floor(image.width / tileSize);

    canvas.width = tileSize;
    canvas.height = tileSize;

    let id = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        context.clearRect(0, 0, tileSize, tileSize);
        context.drawImage(
          image,
          col * tileSize,
          row * tileSize,
          tileSize,
          tileSize,
          0,
          0,
          tileSize,
          tileSize,
        );

        const dataURL = canvas.toDataURL();

        const tileImage = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = dataURL;
        });

        tiles[id] = tileImage;
        id++;
      }
    }

    return tiles;
  }

  async sliceSpritesheetWithIDsV2(image, tileWidth = 16, tileHeight = 16) {
    const tiles = {};
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    const rows = Math.floor(image.height / tileHeight);
    const cols = Math.floor(image.width / tileWidth);

    canvas.width = tileWidth;
    canvas.height = tileHeight;

    let id = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        context.clearRect(0, 0, tileWidth, tileHeight);
        context.drawImage(
          image,
          col * tileWidth,
          row * tileHeight,
          tileWidth,
          tileHeight,
          0,
          0,
          tileWidth,
          tileHeight,
        );

        const imageData = context.getImageData(0, 0, tileWidth, tileHeight);
        const pixels = imageData.data;
        let isTransparent = true;
        // TODO: accelerate perf
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] !== 0) {
            isTransparent = false;
            break;
          }
        }

        if (!isTransparent) {
          const dataURL = canvas.toDataURL();

          const tileImage = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = dataURL;
          });

          tiles[id] = tileImage;
          id++;
        }
      }
    }

    return tiles;
  }

  /**
   * Creates a horizontally mirrored version of the input image on a new canvas.
   *
   * @param {HTMLImageElement} image - The input image to be mirrored.
   * @returns {HTMLCanvasElement} - A canvas containing the mirrored image.
   */
  mirrorImage(image) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(image, 0, 0);
    return canvas;
  }

  /**
   * Flips an image horizontally and returns a new image object with the flipped content.
   * Throws an error if the image is not fully loaded.
   *
   * @param {HTMLImageElement} image - The input image to be flipped.
   * @throws {Error} - If the image is not fully loaded.
   * @returns {HTMLImageElement} - A new image object containing the flipped image.
   */
  flipImageHorizontallyBlocking(image) {
    if (!image.complete) {
      throw new Error("img is not fully loaded");
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.save();
    ctx.scale(-1, 1); // flip
    ctx.drawImage(image, -image.width, 0);
    ctx.restore();

    const flippedImage = new Image();
    flippedImage.src = canvas.toDataURL();
    return flippedImage;
  }

  /**
   * Adds 16 pixels of transparent padding to the top of the input image
   * and returns a new image object with the padded content.
   *
   * @param {HTMLImageElement} img - The input image to be padded.
   * @returns {HTMLImageElement} - A new image object containing the padded image.
   */
  addPaddingOnTop(img) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height + 16;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 16);
    const paddedImage = new Image();
    paddedImage.src = canvas.toDataURL();
    return paddedImage;
  }

  consoleImg(base64) {
    console.log(
      "%c Image",
      "background-image: url('data:image/png;base64," +
        base64 +
        "'); background-size: 32px 32px; line-height: 32px; font-size: 1px; padding: 32px;",
    );
  }

  // HOOKS //
  addHooks() {
    addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
    });
    addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
      if (e.key === "Escape") {
        if (this.isUIOpen && this.currentInteractible !== "BED") {
          this.moveUIDown();
          this.moveMoneyDown();
          this.isMovementLocked = false;
          this.isUIOpen = false;
        }
      }
    });

    addEventListener("keypress", (e) => {
      if (e.key === "e" || e.key === "E") {
        this.handleActualInteraction();
      }
      if (e.key === "r" || e.key === "R") {
        if (this.currentWeapon && this.enableGun) {
          this.currentWeapon.reload();
        }
      }
    });

    addEventListener("visibilitychange", () => {
      if (document.hidden) {
        console.log("PAUSED");
        this.keys = {};
      }
    });
    this.singleSHot = false;
    this.canvas.addEventListener("click", (e) => {
      // if (this.enemies.length < 2) this.spawnEnemies();
      // let target = new UTILS.Vec2(e.clientX, e.clientY);
      // let origin = new UTILS.Vec2(this.width / 2, this.height / 2);
      if (!this.singleSHot) {
        this.bgMusic.play();
        this.singleSHot = true;
      }

      const tilePos = this.getTilePosition(e.clientX, e.clientY);
      const target = new UTILS.Vec2(tilePos.x, tilePos.y);

      const playerPos = this.getTilePosition(this.width / 2, this.height / 2);
      const origin = new UTILS.Vec2(playerPos.x, playerPos.y);

      if (this.isUIOpen) return;
      if (this.enableGun && this.currentWeapon) {
        if (this.currentWeapon.ammo > 0) {
          this.gunSound.currentTime = 0;
          this.gunSound.play();
        }
        this.currentWeapon.shoot(origin, target);
      }
    });

    this.buyButton.addEventListener("click", () => {
      let currentSelectedItem = document.getElementById("name").innerHTML;
      this.buyItem(currentSelectedItem);
    });
  }

  enemyAttack() {
    // check if player inside enemy range
    const enemyRng = 10;
    for (let enemy of this.enemies) {
      if (enemy.isDead) continue;
      const playerTilePos = this.getTilePosition(
        this.width / 2,
        this.height / 2,
      );

      const vecPlayerTilePos = new UTILS.Vec2(playerTilePos.x, playerTilePos.y);

      const enemyTilePos = new UTILS.Vec2(enemy.x, enemy.y);
      const distance = vecPlayerTilePos.distance(enemyTilePos);
      if (distance < enemyRng) {
        if (Date.now() - enemy.lastAtk >= enemy.atkCD) {
          const origin = new UTILS.Vec2(enemy.x + 0.5, enemy.y + 0.5);
          const target = new UTILS.Vec2(playerTilePos.x, playerTilePos.y);
          const dir = target.sub(origin).normalize();

          // shoot bullet
          const proj = new WP.Projectile(
            origin,
            dir,
            this.baseStats.speed * 2, // TODO: WAVE MUL
            500,
            this.baseStats.damage,
            "red",
            this.canvas,
          );

          enemy.lastAtk = Date.now();
          enemy.projectiles.push(proj);
        }
      }
    }
  }

  dropBuffsEnemy(ax, ay) {
    // 50% chance to drop a buff
    if (Math.random() < 1) {
      const x = Math.floor(ax);
      const y = Math.floor(ay);
      const randomBuff =
        this.buffs[Math.floor(Math.random() * this.buffs.length)];
      const buff = {
        x: x,
        y: y,
        buff: randomBuff,
        color: this.buffColors[randomBuff],
        time: 0,
        duration: 10000,
      };
      this.actualBuffs.push(buff);
    }
  }
  cleanEnemiesArray() {
    this.enemies = this.enemies.filter((e) => !e.isDead);
  }
  waveHandler() {
    if (this.enemies.length < 1) {
      if (!this.startGame) {
        this.startGame = true;
        this.currentGLOBALmodifiers = this.waves[this.currentWave];
        this.spawnWaveEnemies();
        return;
      }
      console.log("WAVE COMPLETED");
      if (this.currentWave === this.waves.length) {
        this.winGame();
        return;
      }
      try {
        this.currentGLOBALmodifiers = this.waves[this.currentWave];
        this.currentWave++;
        this.spawnWaveEnemies();
      } catch (e) {
        this.winGame();
      }
    }
  }

  spawnWaveEnemies() {
    for (let i = 0; i < this.currentGLOBALmodifiers.nEnemies; i++) {
      this.spawnEnemies();
    }
  }

  checkWINLOSE() {
    if (this.currentWave > this.waves.length) {
      this.winGame();
    }
    if (this.hp <= 0) {
      this.loseGame();
    }
  }

  winGame() {
    this.winSound.play();
    this.success.style.visibility = "visible";
    this.success.innerHTML = "YOU WIN";
    this.success.style.zIndex = 700;
    this.canvas.style.visibility = "hidden";
    this.GAMEBEGIN = false;
  }
  loseGame() {
    this.loseSound.play();
    this.success.style.visibility = "visible";
    this.success.innerHTML = "YOU LOSE";
    this.success.style.zIndex = 700;
    this.canvas.style.visibility = "hidden";
    this.GAMEBEGIN = false;
  }
}
