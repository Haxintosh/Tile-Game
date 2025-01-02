/**
 * A class representing a 2D vector
 * @class Vec2
 */
export class Vec2 {
  /**
   * the constructor for a 2D vector
   * @constructor Vec2
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * adds two vectors
   * @param {Vec2} v
   * @returns {Vec2}
   */
  add(v) {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  /**
   * subtracts two vectors
   * @param {Vec2} v
   * @returns {Vec2}
   */
  sub(v) {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  /**
   * multiplies two vectors
   * @param {Vec2} v
   * @returns {number}
   */
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * cross product of two vectors
   * @param {Vec2} v
   * @returns {number}
   */
  cross(v) {
    return this.x * v.y - this.y * v.x;
  }

  /**
   * scales a vector by a scalar
   * @param {number} s
   * @returns {Vec2}
   */
  scale(s) {
    return new Vec2(this.x * s, this.y * s);
  }

  /**
   * returns the length of the vector
   * @returns {number}
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * returns a copy of the vector
   * @returns {Vec2}
   */
  copy() {
    return new Vec2(this.x, this.y);
  }

  /**
   * returns the normalized vector
   * @returns {Vec2}
   */
  normalize() {
    let length = this.length();
    return new Vec2(this.x / length, this.y / length);
  }

  /**
   * calculates the distance between two vectors
   * @param {Vec2} v
   * @returns {number}
   */
  distance(v) {
    return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2);
  }
}
