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
  mapSpritesheet: "TEST-COLL/spritesheet.png",
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

async function init() {
  let json;
  await fetch("TEST-COLL/map.json")
    .then((response) => response.json())
    .then((data) => {
      json = data;
      console.log("JSON data loaded:", json);
    });
  tilemap = new TILEMAP.TileMapRenderer(
    json,
    images.mapSpritesheet,
    1,
    canvas,
    images.playerIdle,
    images.playerWalk,
    images.playerRun,
    uiCanvas,
  );
  await tilemap.init();
  isLoaded = true;
}

// addHooks();

// let json;
// let player = new Player({ spritesheet: images.mapSpritesheet });
// let tileMap;
// let canvas = document.getElementById("game");
// canvas.width = window.innerWidth;
// canvas.height = window.innerHeight;
// let ctx = canvas.getContext("2d");

// async function init() {
//   await fetch("TEST-COLL/map.json")
//     .then((response) => response.json())
//     .then((data) => {
//       json = data;
//       console.log("JSON data loaded:", json);
//     });

//   tileMap = new TILEMAP.TileMap({
//     tileSize: 16,
//     mapWidth: json.mapWidth,
//     mapHeight: json.mapHeight,
//     tileset: images.mapSpritesheet,
//     map: json,
//     canvas: canvas,
//     player: player,
//   });
//   await tileMap.init();
//   isLoaded = true;
//   animate();
// }

// function animate() {
//   if (keys["w"]) {
//     // tileMap.camera.y -= 4;
//     player.position.y -= 4;
//   }
//   if (keys["s"]) {
//     // tileMap.camera.y += 4;
//     player.position.y += 4;
//   }
//   if (keys["a"]) {
//     // tileMap.camera.x -= 4;
//     player.position.x -= 4;
//   }
//   if (keys["d"]) {
//     // tileMap.camera.x += 4;
//     player.position.x += 4;
//   }

//   tileMap.draw();
//   requestAnimationFrame(animate);
// }

// function addHooks() {
//   window.addEventListener("resize", () => {
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight;
//   });

//   window.addEventListener("keydown", (e) => {
//     keys[e.key] = true;
//   });

//   window.addEventListener("keyup", (e) => {
//     keys[e.key] = false;
//   });
// }

// import { Tween, Group, Easing } from "../dist/tween.esm.js";
// import { drawRabbit, drawFox } from "./js/drawings.js";

// startScene("scene1", false);
// startScene("scene2", true);

// function startScene(id, dynamic) {
//   const group = new Group();

//   const width = 480;
//   const height = 320;

//   const scene = document.getElementById(id);

//   const canvas = document.createElement("canvas");
//   canvas.width = width;
//   canvas.height = height;
//   scene.appendChild(canvas);

//   const context = canvas.getContext("2d");

//   const rabbit = { x: width - 50, y: 50 };

//   new Tween(rabbit, group)
//     .to({ x: width - 50, y: height - 50 }, 3000)
//     .easing(Easing.Exponential.InOut)
//     .start();

//   const fox = { x: 50, y: 50 };

//   new Tween(fox, group)
//     .to(rabbit, 3000)
//     .dynamic(dynamic)
//     .duration(3000)
//     .easing(Easing.Exponential.InOut)
//     .start();

//   animate();

//   function animate(time) {
//     group.update(time);

//     // draw background
//     context.fillStyle = "rgb(240,250,240)";
//     context.fillRect(0, 0, width, height);

//     drawRabbit(context, rabbit.x, rabbit.y, "rgb(150,150,150)");
//     drawFox(context, fox.x, fox.y, "rgb(200,80,80)");

//     requestAnimationFrame(animate);
//   }
// }
