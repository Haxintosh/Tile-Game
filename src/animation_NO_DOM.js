// NOT WORKING AS OF 2025-01-02
// DOES NOT RENDER CORRECTLY ON THE WORKER THREAD
// OFFSCREEN CANVAS IS NOT WORKING ONUPDATE
// THE IMAGE DATA RETURNED IS ALL 0
// SEEMS TO BE SOMETHING WRONG WITH THIS FILE

export class Animation {
  constructor(
    spriteSheet,
    frameWidth,
    frameHeight,
    frameDuration,
    isLoop,
    isReverse,
    onUpdate, // on frame inc/dec
    onEnd, // on animation end
  ) {
    // constructor properties
    this.spriteSheet = spriteSheet;
    this.frames = null;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameDuration = frameDuration;
    this.isLoop = isLoop;

    this.isReverse = isReverse;
    this.onUpdate = onUpdate; // execute onend
    this.onEnd = onEnd; // execute onend

    // update properties
    this.lastT = Date.now();
    this.deltaT = 0;
    this.currentFrame = 0;
    this.isDone = false;
    this.isPaused = true;
  }

  async init() {
    this.frames = await sliceSpritesheetWithIDs(
      this.spriteSheet,
      this.frameWidth,
      this.frameHeight,
    );
  }

  update() {
    if (this.isPaused || this.isDone) return;
    const now = Date.now();
    this.deltaT += now - this.lastT;
    this.lastT = now;
    if (this.deltaT >= this.frameDuration) {
      this.deltaT = 0;
      this.currentFrame++;
      if (this.currentFrame >= Object.keys(this.frames).length) {
        if (this.isLoop) {
          this.currentFrame = 0;
        } else {
          this.isDone = true;
          this.currentFrame = Object.keys(this.frames).length - 1;
          this.onEnd();
        }
      }
      this.onUpdate();
    }
  }

  pause() {
    this.isPaused = true;
  }

  play() {
    this.isPaused = false;
  }
  reset() {
    this.isDone = false;
    this.currentFrame = 0;
  }

  draw(targetCtx) {
    const frame = this.frames[this.currentFrame];
    console.log(frame);
    console.log(this);
    targetCtx.drawImage(frame, 0, 0);
  }
}

// [{
// animation: Animation, layer:Int
// }]

export class Sequencer {
  /*
  @constructor
  @params animations: [{
    animation: Animation,
    layer: Int,
    order: Int // order of animation to play in sequence
  }]
  */
  constructor(animations = [], canvas, onUpdate, onEnd) {
    this.animations = animations;
    this.currentAnimation = null;
    this.canvas = canvas;
    this.onUpdate = onUpdate;
    this.onEnd = onEnd;

    // update properties
    this.lastT = Date.now();
    this.deltaT = 0;
    this.isPaused = true;
    this.isInitialized = false;
    this.init();
  }
  init() {
    this.isInitialized = true;
    this.sortAnimations();
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = this.animations[0][0].animation.frameWidth;
    this.canvas.height = this.animations[0][0].animation.frameHeight;
  }

  update() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.isPaused) return;
    if (this.currentAnimation === null) {
      this.currentAnimation = 0;
    }

    const currentAnimArr = this.animations[this.currentAnimation];
    console.log(currentAnimArr);
    if (this.currentAnimation === null) {
      this.currentAnimation = 0;
    }
    // this assumes the highest layer animation is the longest, which is not always the case
    let isAllDone = true;
    for (const anim of currentAnimArr) {
      if (!anim.animation.isDone) {
        isAllDone = false;
        break;
      }
    }
    if (isAllDone) {
      this.currentAnimation++;
      if (this.currentAnimation >= this.animations.length) {
        this.currentAnimation = 0;
      }
    }

    currentAnimArr.forEach((anim) => {
      if (anim.animation.isPaused) {
        anim.animation.play();
      }
      anim.animation.update();
    });
    this.deltaT = Date.now() - this.lastT;
    this.lastT = Date.now();

    if (this.isPaused) {
      this.lastT = Date.now();
    }

    if (this.currentAnimation === this.animations.length - 1 && isAllDone) {
      this.onEnd();
    }

    this.draw();
    return this.canvas;
  }

  draw() {
    if (!this.isInitialized) {
      this.init();
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const currentAnimArr = this.animations[this.currentAnimation];
    for (const anim of currentAnimArr) {
      anim.animation.draw(this.ctx);
    }
    // also draw older animations
    //
  }

  pause() {
    this.isPaused = true;
  }

  play() {
    if (!this.isInitialized) {
      this.init();
    }

    if (this.isPaused) {
      this.lastT = Date.now();
    }
    this.isPaused = false;
  }

  reset() {
    this.currentAnimation = 0;
    this.animations.forEach((anim) => {
      anim.animation.reset();
    });
  }

  addAnimation(animation, layer) {
    this.animations.push({ animation, layer });
    this.sortAnimations();
  }

  // if same order, sort by layer, where lower layer is drawn first
  // if same layer, sort by order
  sortAnimations() {
    this.animations.sort((a, b) => {
      if (a.order === b.order) {
        return a.layer - b.layer;
      }
      return a.order - b.order;
    });

    // Initialize an array to hold the grouped animations
    const groupedAnimations = [];

    // Iterate through the sorted animations and group them by order
    let currentGroup = [];
    let currentOrder = null;

    for (const animation of this.animations) {
      if (animation.order !== currentOrder) {
        if (currentGroup.length > 0) {
          groupedAnimations.push(currentGroup);
        }
        currentGroup = [animation];
        currentOrder = animation.order;
      } else {
        currentGroup.push(animation);
      }
    }

    // Add the last group if it exists
    if (currentGroup.length > 0) {
      groupedAnimations.push(currentGroup);
    }

    //[
    //  [
    //    { animation: 'animation1', order: 2, layer: 2 },
    //    { animation: 'animation2', order: 2, layer: 3 }
    //  ],
    //  [
    //    { animation: 'animation3', order: 3, layer: 5 }
    //  ]
    //]
    this.animations = groupedAnimations;
    return groupedAnimations;
  }
}

async function sliceSpritesheetWithIDs(
  imageBitmap,
  tileWidth = 16,
  tileHeight = 16,
) {
  console.log(imageBitmap);
  const tiles = {};
  const canvas = new OffscreenCanvas(tileWidth, tileHeight);
  const context = canvas.getContext("2d");

  const rows = Math.floor(imageBitmap.height / tileHeight);
  const cols = Math.floor(imageBitmap.width / tileWidth);

  let id = 0;
  console.log("bitmap", imageBitmap);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      context.clearRect(0, 0, tileWidth, tileHeight);
      context.drawImage(
        imageBitmap,
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

      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] !== 0) {
          isTransparent = false;
          break;
        }
      }

      if (!isTransparent) {
        const tileBitmap = await createImageBitmap(canvas);
        tiles[id] = tileBitmap;
        id++;
      }
    }
  }
  console.log("tiles", tiles);
  return tiles;
}
