import * as UTILS from "./utils.js";

/**
 * A class representing a player
 * @class Player
 */
export class Player {
  /**
   * the constructor for the Player class
   * @param {Object} options object containing the player options
   * @param {Image} options.spritesheet image with all the player sprites
   * @param {Vec2} options.position the player position (opt.)
   * @param {Array} options.inv the player inventory (opt.)
   */
  constructor({ spritesheet, position = null, inv = [] } = {}) {
    this.spritesheet = spritesheet;
    this.position = position || new UTILS.Vec2(0, 0);
    this.inventory = inv;
  }
}
