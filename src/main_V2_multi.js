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

let mainCanvas, ctx;

async function init() {
  mainCanvas = document.getElementById("game");
  mainCanvas.width = 608;
  mainCanvas.height = 512;
  ctx = mainCanvas.getContext("2d");

  // Create an OffscreenCanvas
  const offscreenCanvas = new OffscreenCanvas(608, 512);

  // Initialize the worker
  worker = new Worker(new URL("./main_V2_worker.js", import.meta.url), {
    type: "module",
  });
  console.log("Worker initialized");
  // Transfer the offscreen canvas to the worker
  worker.postMessage({ type: "init", canvas: offscreenCanvas }, [
    offscreenCanvas,
  ]);

  // Listen for rendering results from the worker
  worker.onmessage = (e) => {
    if (e.data.type === "frame") {
      const frame = e.data.frame;
      ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      ctx.drawImage(frame, 0, 0);
    }
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

function onEnd() {
  console.log("Animation ended");
}

function onUpdate() {
  console.log("Animation updated");
}
