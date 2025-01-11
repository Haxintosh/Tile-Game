import "./style.css";
import * as UTILS from "./utils.js";
import { Player } from "./player.js";
import * as TILEMAP from "./tilemap.js";

// const originalWarn = console.warn;
// console.warn = (...args) => {
//   if (args[0].includes('downloadable font')) {
//     return; // ignore
//   }
//   originalWarn(...args);
// };

// LOAD
const images = {
  mapSpritesheet: "TEST-GUN/spritesheet.png",
  playerIdle: "CHARACTER/IDLE.png",
  playerWalk: "CHARACTER/WALK.png",
  playerRun: "CHARACTER/RUN.png",
  vegStage5012: "HARVEST/VEG/VEG_STAGE_5_0_1_2.png",
  vegStage34: "HARVEST/VEG/VEG_STAGE_3_4.png",
};

let nLoaded = 0;
let isLoaded = false;

let keys = {};

Promise.all(
  Object.entries(images).map(([key, value]) =>
    loadImage(value).then((image) => {
      images[key] = image;
      nLoaded++;
    }),
  ),
)
  .then(onAllImagesLoaded)
  .catch((error) => {
    console.error("Error loading images:", error);
  });

function onAllImagesLoaded() {
  console.log("All images are loaded!", images);
  init();
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

let tilemap;
let canvas = document.getElementById("game");
let uiCanvas = document.getElementById("ui");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
uiCanvas.width = window.innerWidth;
uiCanvas.height = window.innerHeight;
uiCanvas.style.pointerEvents = "none";
async function init() {
  let json;
  await fetch("TEST-GUN/map.json")
    .then((response) => response.json())
    .then((data) => {
      json = data;
      console.log("JSON data loaded:", json);
    });
  tilemap = new TILEMAP.TileMapRenderer(
    json,
    images.mapSpritesheet,
    0.5,
    canvas,
    images.playerIdle,
    images.playerWalk,
    images.playerRun,
    uiCanvas,
    images.vegStage5012,
    images.vegStage34,
  );
  await tilemap.init();
  isLoaded = true;
}
