// 💜JSDoc

/**
 * Represents a plant with a defined type, position, growth stages, and growth behavior.
 */
export class Plant {
  /**
   * Creates a new Plant instance.
   * @param {string} type - The type or species of the plant.
   * @param {Object} pos - The position of the plant, as {x, y}.
   * @param {Array<Image>} growthStageTiles - Array of tiles representing each growth stage.
   */
  constructor(type, pos, growthStageTiles) {
    this.type = type;
    this.pos = pos;
    this.growthStageTiles = growthStageTiles;
    this.growthStage = 0;

    this.lastGrowthTime = Date.now();
    this.growthTime = 1000; // Time (in ms) required for each growth stage.

    this.isGrowing = true;
    this.isHarvestable = false;
  }

  /**
   * Updates the growth stage of the plant based on elapsed time.
   * @returns {Image} - The current tile representing the plant's growth stage. (READY FOR DRAW)
   */
  update() {
    if (this.isGrowing) {
      let now = Date.now();
      if (now - this.lastGrowthTime > this.growthTime) {
        this.growthStage++;
        this.lastGrowthTime = now;
      }
      if (this.growthStage >= this.growthStageTiles.length) {
        this.isGrowing = false;
        this.isHarvestable = true;
      }
    }
    return this.growthStageTiles[this.growthStage];
  }

  /**
   * Harvests the plant if it is ready.
   * Resets the plant's growth and harvest state if successful.
   * @returns {boolean} - Returns true if the plant was successfully harvested, false otherwise.
   */
  harvest() {
    if (this.isHarvestable) {
      this.isHarvestable = false;
      this.growthStage = 0;
      this.isGrowing = true;
      return true;
    } else {
      return false;
    }
  }
}
