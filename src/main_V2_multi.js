// NOT WORKING AS OF 2025-01-02
// DOES NOT RENDER CORRECTLY ON THE WORKET THREAD
// OFFSCREEN CANVAS IS NOT WORKING ONUPDATE
// THE IMAGE DATA RETURNED IS ALL 0
// SEEMS TO BE SOMETHING WRONG WUTH ANIMATE.JS

import "./style.css";
import * as ANIM from "./animation.js";

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
let worker;

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

let mainCanvas;
let ctx;

async function init() {
  mainCanvas = document.getElementById("game");
  mainCanvas.width = 608;
  mainCanvas.height = 512;
  ctx = mainCanvas.getContext("2d");

  const uiBaseImageBitmap = await createImageBitmap(images.uiBase);
  const uiIconAImageBitmap = await createImageBitmap(images.uiIconA);

  worker = new Worker(new URL("./main_V2_worker.js", import.meta.url), {
    type: "module",
  });
  worker.postMessage({
    type: "init",
    uiBaseImageData: uiBaseImageBitmap,
    uiIconAImageData: uiIconAImageBitmap,
  });

  animate();
}

function animate() {
  if (isLoaded) {
    worker.postMessage({ type: "update" });
  }
  requestAnimationFrame(animate);
}

if (worker) {
  worker.onmessage = function (e) {
    if (e.data.type === "render") {
      ctx.putImageData(e.data.imageData, 0, 0);
    }
    console.log(e);
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function getImageData(imageBitmap) {
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0);
  return ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
}

function onEnd() {
  console.log("Animation ended");
}

function onUpdate() {
  console.log("Animation updated");
}
