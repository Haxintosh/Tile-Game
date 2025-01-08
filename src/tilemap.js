// OPTIMIZATION: render on a separate canvas at native spritesheet resolution, then scale it up to the display canvas
// this will reduce img processing time per render cycle
// or scale img to display size onload
//

// DO NOT REUSE:  THIS IS CRAPPY CODE ALL THE WAY THROUGH
// NOT MODULARIZED

import * as TWEEN from "@tweenjs/tween.js";
import * as WP from "/src/UI-Features/weaponsmith/weapons.js";
import * as PLANT from "./plant.js";
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
    this.buyAbleWeapons = WP.starterWeapons;
    this.moveUIDown();
    this.moveMoneyDown();
    // inventory
    this.maxInventorySize = 10;
    this.inventory = [];
    this.weapons = [];

    // more ui shenanigans
    this.tweenGroup = new TWEEN.Group(); // womp global depr
  }

  async init() {
    this.tileSet = await this.sliceSpritesheetWithIDs(this.spritesheet);
    this.ctx = this.canvas.getContext("2d");
    this.uiCtx = this.uiCanvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.interactUI.style.top = this.height * 1.2 + "px";
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

    this.minInteractionDistance = this.tileWidth * this.scale * 2;

    this.animate();

    // PLAYER DATA
    this.coins = 500; // starter coins
    this.weapons = []; // TODO: Remove this array from avaliable weapons
    this.currentWeapon = null;

    this.fillShop(this.buyAbleWeapons);
    this.syncMoney();
  }

  // ANIMATE //
  animate() {
    // console.log("cam", this.camera);
    // console.log("player", this.player);
    // console.log("offset", this.offsetX, this.offsetY);
    // console.log("playerOffset", this.playerOffsetX, this.playerOffsetY);
    // console.log(
    //   "player and offset",
    //   this.player.x + this.offsetX,
    //   this.player.y + this.offsetY,
    // );
    // console.log(
    //   "tileXY",
    //   this.getTilePosition(this.width / 2, this.height / 2),
    // );
    this.deltaT = Date.now() - this.lastT;
    this.lastT = Date.now();
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawAllLayers();
    this.drawAndUpdatePlants(); // plant growth && draw
    this.drawPlayer();
    this.drawDayNightCycle();
    // this.debugPlayerDot();
    let interactible = this.findClosestInteractible();
    if (interactible) {
      // console.log(interactible);
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
    // Check if configured time passed
    this.animDeltaT = Date.now() - this.animLastT;

    // Action configuration: limits and speeds
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
      // Update frame based on elapsed time
      if (this.animDeltaT > currentAction.speed) {
        this[`last${this.currentAction}Frame`] =
          (this[`last${this.currentAction}Frame`] + 1) %
          currentAction.frameCount;
        this.animLastT = Date.now();
      }

      // Draw the current action
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

  redraw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawAllLayers();
    this.drawPlayer();
    this.drawDayNightCycle();
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

  organizePlantTileset() {
    const tilesets = this.veg5012; // First tileset
    const tileset34 = this.veg34; // Second tileset

    // Initialize the plantTileSet with vegetable keys
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

          // Check for collision along the X axis
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

          // Check for collision along the Y axis
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

          // If both collisions are detected, break out of the loop
          if (collisionX && collisionY) {
            break;
          }
        }
      }
    }

    // If no collision is detected, reset the currentCollisionBlock
    if (!collisionX && !collisionY) {
      this.currentCollisionBlock = null;
    }

    return collisionX || collisionY;
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

  // ECONOMY - SHOP //
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

  // UI TRANSITIONS //
  //
  syncMoney() {
    this.moneyInd.innerHTML = this.coins;
  }

  moveUIUp() {
    this.mainShopContainer.classList.add("up");
    this.mainShopContainer.classList.remove("down");
  }

  // Function to move the UI down
  moveUIDown() {
    this.mainShopContainer.classList.add("down");
    this.mainShopContainer.classList.remove("up");
  }

  moveMoneyUp() {
    this.moneyContainer.classList.add("up");
    this.moneyContainer.classList.remove("down");
  }

  moveMoneyDown() {
    this.moneyContainer.classList.add("down");
    this.moneyContainer.classList.remove("up");
  }

  // HARVESTING //
  plantParse() {
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

    this.buyButton.addEventListener("click", () => {
      let currentSelectedItem = document.getElementById("name").innerHTML;
      this.buyItem(currentSelectedItem);
    });
  }
}
