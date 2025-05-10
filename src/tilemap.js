// OPTIMIZATION: render on a separate canvas at native spritesheet resolution, then scale it up to the display canvas
// this will reduce img processing time per render cycle
// or scale img to display size onload

import * as TWEEN from "@tweenjs/tween.js";
import * as UTILS from "./utils.js";
import * as ENEMY from "./enemy.js";
import * as PF from "./pathfinder.js";
export class TileMapRenderer {
  constructor(
    tileMap,
    spritesheet,
    scale,
    canvas,
    playerSpritesheet,
    walkSpritesheet,
    runSpritesheet,
    uiCanvas,
  ) {
    // SPRITESHEETS
    this.tileMap = tileMap;
    this.spritesheet = spritesheet;
    this.playerSpritesheet = playerSpritesheet;
    this.walkSpritesheet = walkSpritesheet;
    this.runSpritesheet = runSpritesheet;

    this.ANIM_SPEED_IDLE = 200; // ms per frame
    this.ANIM_SPEED_WALK = 100;
    this.ANIM_SPEED_RUN = 75;

    this.lastIDLEFrame = 0;
    this.lastWALKFrame = 0;
    this.lastRUNFrame = 0;

    this.animDeltaT = 0;
    this.animLastT = 0;

    // CANVAS AND POSITIONING
    this.scale = scale;
    this.zoom = 1; // currently doesn't work
    this.canvas = canvas;
    this.uiCanvas = uiCanvas;

    this.offsetX = 0;
    this.offsetY = 0;

    this.playerOffsetX = 0;
    this.playerOffsetY = 0;

    // KEYBOARD
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
    };

    // TIMING
    this.deltaT = 0;
    this.lastT = 0;
    this.gameTime = 0; // cycle of 0 - 1200000 in ms
    this.msPerHour = 50000; // 50s, total 24h = 1200000ms

    // CAMERA (broken)
    this.cameraSync = true;
    this.centerPlayer = true;
    this.lockCamera = false;

    this.camera = {
      x: 0,
      y: 0,
    };

    // PLAYER
    this.maxInventorySize = 10;
    this.inventory = [];
    this.weapons = [];
    this.currentWeapon = null;
    this.prevX = 0;
    this.prevY = 0;
    this.lastDirection = "UP";
    this.lastAction = Date.now();
    this.currentAction = "IDLE";
    this.speed = 4;
    this.speedMultiplier = 1;
    this.currentCollisionBlock = null;
    this.isMovementLocked = false;
    this.currentInteractible = null;

    // UI
    this.isUIOpen = false;
    this.tweenGroup = new TWEEN.Group(); // womp global depr
    this.interactUI = document.getElementById("interactableUI");

    // guns guns guns
    this.enableGun = true;

    // PVE
    this.enemies = [];
    this.SAFE_ZONE = 400; // currently doesn't work, no spawn zone around player
    this.UPDATE_PATH_CYCLE = 20; // update path every 240 render cycles
    this.nRenderCycles = 0;

    // PATHFINDER
    this.grid = null;
    this.ogGrid = null;
  }

  async init() {
    this.tileSet = await this.sliceSpritesheetWithIDs(this.spritesheet);
    this.ctx = this.canvas.getContext("2d");
    this.uiCtx = this.uiCanvas.getContext("2d");

    this.ctx.imageSmoothingEnabled = false;

    this.width = this.canvas.width;
    this.height = this.canvas.height;

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

    this.addHooks();
    this.debug();

    this.tileWidth = (this.canvas.width * 2) / this.tileMap.mapWidth;

    this.drawAllLayers();

    this.player = {
      x: this.width / 2,
      y: this.height / 2 - 200,
    };

    this.minInteractionDistance = this.tileWidth * this.scale * 1.5;

    this.animate();

    this.teleportPlayer(7, 7);
  }

  // ANIMATE //
  animate() {
    this.nRenderCycles++;
    this.deltaT = Date.now() - this.lastT;
    this.lastT = Date.now();

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawAllLayers();
    this.drawPlayer();
    this.drawAllEnemies();
    this.drawDayNightCycle(); // TODO

    this.debugPlayerDot(); // player hitbox

    if (this.nRenderCycles >= this.UPDATE_PATH_CYCLE) {
      this.nRenderCycles = 0;
      if (this.enemies.length > 0) {
        this.enemyPathfindUpdate();
      }
    }
    let interactible = this.findClosestInteractible();
    if (interactible) {
      console.log(interactible);
      this.handleInteraction(interactible);
      this.ctx.fillStyle = "rgba(255,0,255,0.5)";
      this.ctx.fillRect(
        interactible.x * this.tileWidth * this.scale - this.offsetX,
        interactible.y * this.tileWidth * this.scale - this.offsetY,
        16 * this.scale,
        16 * this.scale,
      );
    } else {
      this.hideInteractableUI();
    }

    if (this.tweenGroup) {
      this.tweenGroup.update();
    }
    this.update();
    requestAnimationFrame(() => this.animate());
  }

  update() {
    // beautiful beautiful beautiful
    // const tile = this.getTilePosition(this.width / 2, this.height / 2);
    // console.log("tile", tile);
    // console.log("tileoffset", this.getTileOffset(tile.x, tile.y));
    // console.log("offset", this.offsetX, this.offsetY);
    let oldX = this.player.x;
    let oldY = this.player.y;
    let oldLastDirection = this.lastDirection;

    let newX = this.player.x;
    let newY = this.player.y;

    if (this.keys.Shift) {
      this.speedMultiplier = 2;
    } else {
      this.speedMultiplier = 1;
    }
    if (this.keys.ArrowUp) {
      newY -= this.speed * this.speedMultiplier;
      this.lastDirection = "UP";
    }
    if (this.keys.ArrowDown) {
      newY += this.speed * this.speedMultiplier;
      this.lastDirection = "DOWN";
    }
    if (this.keys.ArrowLeft) {
      newX -= this.speed * this.speedMultiplier;
      this.lastDirection = "LEFT";
    }
    if (this.keys.ArrowRight) {
      newX += this.speed * this.speedMultiplier;
      this.lastDirection = "RIGHT";
    }

    if (
      !this.checkCollision(newX + this.playerOffsetX, newY + this.playerOffsetY)
    ) {
      this.player.x = newX;
      this.player.y = newY;
    } else {
      if (this.currentCollisionBlock != "x") {
        this.player.x = newX;
        console.log("Y");
      }
      if (this.currentCollisionBlock != "y") {
        this.player.y = newY;
        console.log("X");
      }
    }
    if (
      this.keys.ArrowUp ||
      this.keys.ArrowDown ||
      this.keys.ArrowLeft ||
      this.keys.ArrowRight
    ) {
      if (this.keys.Shift) {
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
    this.gameTime += this.deltaT;
  }

  // DRAWS //
  drawAllLayers() {
    for (let i = this.tileMap.layers.length - 1; i >= 0; i--) {
      this.drawLayer(this.tileMap.layers[i]);
    }
  }

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
          (19 / 32) * this.scale * this.tileWidth * 2,
        this.scale * this.tileWidth * 1.7,
        this.scale * this.tileWidth * 1.7,
      );
    }
  }

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
          (19 / 32) * this.scale * this.tileWidth * 2,
        this.scale * this.tileWidth * 1.7,
        this.scale * this.tileWidth * 1.7,
      );
    }
  }

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
          (19 / 32) * this.scale * this.tileWidth * 2,
        this.scale * this.tileWidth * 1.7,
        this.scale * this.tileWidth * 1.7,
      );
    }
  }

  drawDayNightCycle() {
    const currentTime = this.gameTime % 1200000; // 24-hour cycle in ms
    const hour = (currentTime / this.msPerHour) % 24;
    let color;
    if (hour >= 6 && hour < 12) {
      // Morning (6 AM to 12 PM)
      color = this.interpolateColor(
        "rgba(255, 255, 255, 0)",
        "rgba(255, 255, 255, 0)",
        (hour - 6) / 6,
      );
    } else if (hour >= 12 && hour < 18) {
      // Afternoon (12 PM to 6 PM)
      color = this.interpolateColor(
        "rgba(255, 255, 255, 0)",
        "rgba(255, 255, 255, 0)",
        (hour - 12) / 6,
      );
    } else if (hour >= 18 && hour < 24) {
      // Evening (6 PM to 12 AM)
      color = this.interpolateColor(
        "rgba(255, 255, 255, 0)",
        "rgba(0, 0, 128, 0.5)",
        (hour - 18) / 6,
      );
    } else {
      // Night (12 AM to 6 AM)
      color = this.interpolateColor(
        "rgba(0, 0, 42, 0.5)",
        "rgba(255, 255, 255, 0)",
        (hour + 6) / 6,
      );
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

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
        console.log("DONE");
      });
    this.tweenGroup.add(this.testTween);
    this.tweenGroup.add(this.testTweenStep2);
    this.tweenGroup.add(this.testTweenStep3);
    // this.testTween.chain(this.testTweenStep2);
    this.testTween.start();
  }

  getTilePosition(screenX, screenY) {
    const tileX =
      (screenX + this.offsetX) / (this.tileWidth * this.scale * this.zoom);
    const tileY =
      (screenY + this.offsetY) / (this.tileWidth * this.scale * this.zoom);
    return { x: tileX, y: tileY };
  }

  getTileOffset(tileX, tileY) {
    const offsetX =
      tileX * this.tileWidth * this.scale * this.zoom - this.width / 2;
    const offsetY =
      tileY * this.tileWidth * this.scale * this.zoom - this.height / 2;
    return { offsetX, offsetY };
  }

  // TELEPORT // (TILE COORDS)
  teleportPlayer(x, y) {
    let newOffset = this.getTileOffset(x, y);

    this.player.x = newOffset.offsetX;
    this.player.y = newOffset.offsetY;
  }

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

  centerMap() {
    this.offsetX =
      (this.width - this.tileMap.mapWidth * this.tileWidth * this.scale) / 2;
    this.offsetY =
      (this.height - this.tileMap.mapHeight * this.tileWidth * this.scale) / 2;
  }

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

  rgbaToRgb(rgba) {
    const parts = rgba.match(/rgba?\((\d+), (\d+), (\d+),? ?(\d?.?\d+)?\)/);
    return {
      r: parseInt(parts[1], 10),
      g: parseInt(parts[2], 10),
      b: parseInt(parts[3], 10),
      a: parts[4] ? parseFloat(parts[4]) : 1,
    };
  }

  // COLLISION DETECTION //
  checkCollision(x, y) {
    const newX = x;
    const newY = y;
    const playerWidth = 10; // Player width
    const playerHeight = 10; // Player height
    const tileWidth = this.tileWidth * this.scale;
    const tileHeight = this.tileWidth * this.scale;

    // Store the player's previous position
    const prevX = this.prevX;
    const prevY = this.prevY;

    let collisionX = false;
    let collisionY = false;

    for (let layer of this.tileMap.layers) {
      if (layer.collider) {
        for (let tile of layer.tiles) {
          const tileX = tile.x * tileWidth - this.offsetX;
          const tileY = tile.y * tileHeight - this.offsetY;

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

      // debug
      this.ctx.fillStyle = "rgba(0,0,255,0.5)";
      this.ctx.fillRect(
        tileX,
        tileY,
        (this.tileWidth * this.scale) / 2,
        (this.tileWidth * this.scale) / 2,
      );
      this.ctx.fillStyle = "rgba(0,255,0,0.5)";
      this.ctx.fillRect(
        playerX,
        playerY,
        (this.tileWidth * this.scale) / 2,
        (this.tileWidth * this.scale) / 2,
      );

      const distance = Math.hypot(playerX - tileX, playerY - tileY);
      if (distance < minDistance) {
        minDistance = distance;
        closestTile = tile; // closest tile
      }
    }
    return closestTile;
  }

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
      92: "WEAPON_BUCKET",
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
    console.log(tile);
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
        this.showInteractableUI("Press E to get a weapon");
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

  showInteractableUI(message) {
    if (this.isUIOpen) return;
    this.interactUI.innerText = message;
    this.interactUI.style.top = "90%";
    this.interactUI.style.opacity = 1;
  }

  hideInteractableUI() {
    this.interactUI.style.top = "120%";
    this.interactUI.style.opacity = 0;
  }

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

  projectileCollisionDetection() {
    // REDO
    if (!this.currentWeapon) return;
    if (!this.enableGun) return;

    const projectiles = this.currentWeapon.projectiles;

    for (let i of projectiles) {
      for (let layer of this.tileMap.layers) {
        // TODO: reduce time complexity ... how? currently O(n^2)
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

  spawnEnemyAt(x, y, maxHealth = 100) {
    const enemy = new ENEMY.Enemy(maxHealth, 5, 0.05, x, y);
    this.enemies.push(enemy);
    this.enemyPathfindUpdate();
  }

  drawAllEnemies() {
    for (let enemy of this.enemies) {
      enemy.update();
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
      // console.log(newPath, tilePos);
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
          10,
          10,
        );
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
      throw new Error("Image is not fully loaded");
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

  // HOOKS //
  addHooks() {
    addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
    });
    addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
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
    });

    addEventListener("visibilitychange", () => {
      if (document.hidden) {
        console.log("PAUSED");
        this.keys = {};
      }
    });

    this.canvas.addEventListener("click", (e) => {
      this.spawnEnemies();
      // let target = new UTILS.Vec2(e.clientX, e.clientY);
      // let origin = new UTILS.Vec2(this.width / 2, this.height / 2);

      const tilePos = this.getTilePosition(e.clientX, e.clientY);
      const target = new UTILS.Vec2(tilePos.x, tilePos.y);

      const playerPos = this.getTilePosition(this.width / 2, this.height / 2);
      const origin = new UTILS.Vec2(playerPos.x, playerPos.y);

      if (this.isUIOpen) return;
      if (this.enableGun && this.currentWeapon) {
        this.currentWeapon.shoot(origin, target);
      }
    });
  }
}
