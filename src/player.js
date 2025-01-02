import * as UTILS from "./utils.js";

class Player {
  constructor({ spritesheet, position = null, inv = [] } = {}) {
    this.spritesheet = spritesheet;
    this.position = position || new UTILS.Vec2(0, 0);
    this.inventory = inv;
  }
  cb;
}
