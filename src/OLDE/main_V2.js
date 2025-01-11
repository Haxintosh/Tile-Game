import "./style.css";
import * as ANIM from "./animation.js";
// LOADERS
const images = {
  mapSpritesheet: "TEST-COLL/spritesheet.png",
  characterWalk: "CHARACTER/WALK.png",
  characterIdle: "CHARACTER/IDLE.png",
  characterRun: "CHARACTER/RUN.png",
  uiBase: "UI/BASE.png",
  uiIconA: "UI/ICON_A.png",
  uiIconB: "UI/ICON_D.png",
  uiNext: "UI/NEXT.png",
  uiPrev: "UI/PREV.png",
  uiBottomBar: "UI/BOTTOM_BAR.png",
};

let numLoaded = 0;
let isLoaded = false;

function onAllImagesLoaded() {
  console.log("All images are loaded!", images);
  isLoaded = true;
  init();
}

Promise.all(
  Object.entries(images).map(([key, value]) =>
    loadImage(value).then((image) => {
      images[key] = image;
      numLoaded++;
    }),
  ),
)
  .then(onAllImagesLoaded)
  .catch((error) => {
    console.error("Error loading images:", error);
  });

let sequencer;
let mainCanvas;
let ctx;

async function init() {
  let uiBaseAnimation = {
    animation: new ANIM.Animation(
      images.uiBase,
      608,
      512,
      75,
      false,
      false,
      onUpdate,
      onEnd,
    ),
    layer: 2,
    order: 1,
  };

  let uiIconAAnimation = {
    animation: new ANIM.Animation(
      images.uiIconA,
      608,
      512,
      75,
      false,
      false,
      onUpdate,
      onEnd,
    ),
    layer: 1,
    order: 2,
  };

  await uiBaseAnimation.animation.init();
  await uiIconAAnimation.animation.init();

  let offscreenCanvas = new OffscreenCanvas(608, 512);
  let offscreenCtx = offscreenCanvas.getContext("2d");

  sequencer = new ANIM.Sequencer(
    [uiBaseAnimation, uiIconAAnimation],
    offscreenCanvas,
    onUpdate,
    onEnd,
  );

  sequencer.play();

  mainCanvas = document.getElementById("game");
  mainCanvas.width = 608;
  mainCanvas.height = 512;
  ctx = mainCanvas.getContext("2d");

  animate();
}

function animate() {
  if (isLoaded) {
    let canvasData = sequencer.update();
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    ctx.drawImage(canvasData, 0, 0);
  }
  requestAnimationFrame(animate);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function onEnd() {
  console.log("Animation ended");
}

function onUpdate() {
  console.log("Animation updated");
}
