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
 * A class representing a tilemap
 * @class TileMap
 */

class TileMap {
  /**
   * the constructor for a tilemap
   * @param {Object} options
   * @param {number} options.tileSize the width/height of each tile
   * @param {number} options.mapWidth the width of the map in tiles
   * @param {number} options.mapHeight the height of the map
   * @param {Image} options.tileset image with all the tiles
   * @param {string} options.map JSON data representing the map
   * @param {HTMLCanvasElement} options.canvas the canvas element to render the map to
   */
  constructor({ tileSize, mapWidth, mapHeight, tileset, map, canvas } = {}) {
    this.tileSize = tileSize;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.tileset = tileset;
    this.map = map;
    this.canvas = canvas;
  }

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

  /**
   * Slices a spritesheet image into smaller tiles and returns an object
   * where each tile is associated with a unique ID.
   *
   * @param {HTMLImageElement} image The source image to slice.
   * @param {number} [tileSize=16] The size of each tile (default is 16x16).
   * @returns {Promise<{ [id: number]: HTMLImageElement }>} An object where the key is a tile ID (number)
   *          and the value is an HTMLImageElement representing the tile image.
   */
  async sliceSpritesheetWithIDs(image, tileSize = 16) {
    // MUST AWAIT OR USE .THEN!!!!!!!!!!!
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
