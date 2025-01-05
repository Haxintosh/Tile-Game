/*
Critertia:
- Camera
  - 3 modes: follow, fixed, free
  - zoom in/out
- Interiactibles
  - Determine interaction type and closest interactible
- Animation Ready
  - Tile animations
  - Animate on Event (e.g. player collision, chest open)
  - Pathfinder for NPCs
  - Predefined paths for NPCs
  - Animation scheduler, ie NPC movement depending on time of day
- Tilemap
  - Tilemap loader
  - Tilemap renderer
  - Tilemap collision with player
  - Tilemap layering (e.g. player behind tree)
*/
/**
Deprecated: Use V3
*/

import * as UTILS from "./utils.js";
import { Player } from "./player.js";

/**
 * A class representing a tilemap
 * @class TileMap
 */
export class TileMap {
  /**
   * the constructor for the TileMap class
   * @param {Object} options object containing the tilemap options
   * @param {number} options.tileSize the width/height of each tile
   * @param {number} options.mapWidth the width of the map in tiles
   * @param {number} options.mapHeight the height of the map
   * @param {Image} options.tileset image with all the tiles
   * @param {Object} options.map JSON data representing the map
   * @param {HTMLCanvasElement} options.canvas the canvas element to render the map to
   * @param {Player} options.player the player object
   */
  constructor({
    tileSize,
    mapWidth,
    mapHeight,
    tileset,
    map,
    canvas,
    player,
  } = {}) {
    this.tileSize = tileSize;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.tileset = tileset;
    this.mapData = map;
    this.canvas = canvas;
    this.player = player;

    // init other properties
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.mapTiles = {};
    this.cameraMode = "follow";
    this.camera = new UTILS.Vec2(0, 0);

    // init sizing properties
    this.nTilesPerRow = 1; // default zoom
    this.zoom = 10;
  }

  /**
   * Initializes the tilemap
   * @returns Promise<TileMap> the initialized tilemap  (self)
   */
  async init() {
    // configure canvas
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.mapTiles = await this.sliceSpritesheetWithIDs(
      this.tileset,
      this.tileSize,
    );
  }

  draw() {
    switch (this.cameraMode) {
      case "follow":
        this.camera.x = this.player.position.x - this.width / 2;
        this.camera.y = this.player.position.y - this.height / 2;
        break;
      case "fixed":
        break;
      case "free":
        break;
    }

    this.ctx.clearRect(0, 0, this.width, this.height);

    const renderedTileSize = this.tileSize * this.zoom;

    const startCol = Math.floor(this.camera.x / renderedTileSize);
    const endCol = startCol + Math.ceil(this.width / renderedTileSize);
    const startRow = Math.floor(this.camera.y / renderedTileSize);
    const endRow = startRow + Math.ceil(this.height / renderedTileSize);

    const offsetX = -this.camera.x + startCol * renderedTileSize;
    const offsetY = -this.camera.y + startRow * renderedTileSize;

    for (const layer of this.mapData.layers) {
      this.drawLayer(
        layer,
        startCol,
        endCol,
        startRow,
        endRow,
        offsetX,
        offsetY,
        renderedTileSize,
      );
    }
  }

  /**
   * Draws a specific layer of the tilemap within the viewport
   * @param {Object} layer The layer to draw
   * @param {number} startCol The starting column index
   * @param {number} endCol The ending column index
   * @param {number} startRow The starting row index
   * @param {number} endRow The ending row index
   * @param {number} offsetX The x offset for drawing
   * @param {number} offsetY The y offset for drawing
   * @param {number} renderedTileSize The size of the tiles when rendered
   */
  drawLayer(
    layer,
    startCol,
    endCol,
    startRow,
    endRow,
    offsetX,
    offsetY,
    renderedTileSize,
  ) {
    const tiles = layer.tiles;

    for (const tile of tiles) {
      if (
        tile.x >= startCol &&
        tile.x <= endCol &&
        tile.y >= startRow &&
        tile.y <= endRow
      ) {
        const tileImage = this.mapTiles[tile.id];
        this.ctx.drawImage(
          tileImage,
          (tile.x - startCol) * renderedTileSize + offsetX,
          (tile.y - startRow) * renderedTileSize + offsetY,
          renderedTileSize,
          renderedTileSize,
        );
      }
    }
  }

  /**
   * Moves the camera to a new position
   * @param {number} x The new x position
   * @param {number} y The new y position
   */
  moveCamera(x, y) {
    this.camera.x = x;
    this.camera.y = y;
    // this.draw();
  }

  /**
   * Zooms the camera in or out
   * @param {number} zoomLevel The new zoom level
   */
  zoomCamera(zoomLevel) {
    this.zoom = zoomLevel;
    this.tileSize = this.tileSize * this.zoom;
    // this.draw();
  }

  /**
   * Slices a spritesheet image into smaller tiles and returns an object
   * where each tile is associated with a unique ID.
   *
   * @param {HTMLImageElement} image The source image to slice.
   * @param {number} [tileSize=16] The size of each tile (default is 16).
   * @returns {Promise<{ [id: number]: HTMLImageElement }>} An object where the key is a tile ID (number)
   *          and the value is an HTMLImageElement representing the tile image.
   */
  async sliceSpritesheetWithIDs(image, tileSize = 16) {
    // ah promises
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
}
