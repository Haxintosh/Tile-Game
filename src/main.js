import "./style.css";
import * as TILE from "./tilemap.js";
import * as TWEEN from "@tweenjs/tween.js";
let tileMap = await blockingFetch("TEST-COLL/map.json");

async function blockingFetch(url) {
  const response = await fetch(url);
  return await response.json();
}

let canvas = document.getElementById("game");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let tileSetImg = null;
let playerSpritesheet = null;
let walkSpritesheet = null;
let runSpritesheet = null;
let uiBase = null;
let iconAppear = null;
let iconDisappear = null;
let nextPage = null;
let prevPage = null;
let bottomBar = null;
Promise.all([
  loadImage("TEST-COLL/spritesheet.png"),
  loadImage("IDLE.png"),
  loadImage("WALK.png"),
  loadImage("RUN.png"),
  loadImage("UI/BASE.png"),
  loadImage("UI/ICON_A.png"),
  loadImage("UI/ICON_D.png"),
  loadImage("UI/NEXT.png"),
  loadImage("UI/PREV.png"),
  loadImage("UI/BOTTOM_BAR.png"),
])
  .then(
    ([
      tileSetImgLoaded,
      playerSpritesheetLoaded,
      walkSpritesheetLoaded,
      runSpritesheetLoaded,
      uiBaseLoaded,
      iconAppearLoaded,
      iconDisappearLoaded,
      nextPageLoaded,
      prevPageLoaded,
      bottomBarLoaded,
    ]) => {
      tileSetImg = tileSetImgLoaded;
      playerSpritesheet = playerSpritesheetLoaded;
      walkSpritesheet = walkSpritesheetLoaded;
      runSpritesheet = runSpritesheetLoaded;
      uiBase = uiBaseLoaded;
      iconAppear = iconAppearLoaded;
      iconDisappear = iconDisappearLoaded;
      nextPage = nextPageLoaded;
      prevPage = prevPageLoaded;
      bottomBar = bottomBarLoaded;
      init();
    },
  )
  .catch((error) => {
    console.error(error);
  });
let uiOffscreenCanvas = null;
let uiCtx = null;

let mainCanvas = null;
let mainCtx = null;

let uiFRAMES = null;
let iconAppearFRAMES = null;
let iconDisappearFRAMES = null;
let nextPageFRAMES = null;
let prevPageFRAMES = null;

let deltaT = null;
let lastT = null;

let uiBaseCurrentFrame = null;
let uiBaseFrameCount = null;
let uiBaseMSPerFrame = null;
let uiBaseLastFrameChange = null;

let uiButtonAppearCurrentFrame = null;
let uiButtonAppearFrameCount = null;
let uiButtonAppearMSPerFrame = null;
let uiButtonAppearLastFrameChange = null;
const optimalScalingFactor = getOptimalScalingFactor();
const optimalCanvasPosition = getOptimalCanvasPosition();

let isAnimBegin = false;
async function init() {
  // let tileMapRenderer = new TILE.TileMapRenderer(
  //   tileMap,
  //   tileSetImg,
  //   1,
  //   canvas,
  //   playerSpritesheet,
  //   walkSpritesheet,
  //   runSpritesheet,
  // );
  // await tileMapRenderer.init();
  uiOffscreenCanvas = new OffscreenCanvas(608, 512);
  uiCtx = uiOffscreenCanvas.getContext("2d");

  mainCanvas = document.getElementById("game");
  mainCtx = mainCanvas.getContext("2d");
  mainCtx.imageSmoothingEnabled = false;
  uiCtx.imageSmoothingEnabled = false;

  mainCanvas.width = window.innerWidth;
  mainCanvas.height = window.innerHeight;
  mainCanvas.style.position = "absolute";
  mainCanvas.style.top = window.innerHeight + "px";

  uiFRAMES = await sliceSpritesheetWithIDs(uiBase, 608, 512);
  iconAppearFRAMES = await sliceSpritesheetWithIDs(iconAppear, 608, 512);
  iconDisappearFRAMES = await sliceSpritesheetWithIDs(iconDisappear, 608, 512);
  nextPageFRAMES = await sliceSpritesheetWithIDs(nextPage, 608, 512);
  prevPageFRAMES = await sliceSpritesheetWithIDs(prevPage, 608, 512);

  deltaT = 0;
  lastT = Date.now();

  uiBaseCurrentFrame = 0;
  uiBaseFrameCount = Object.keys(uiFRAMES).length;
  uiBaseMSPerFrame = 75; // ms
  uiBaseLastFrameChange = Date.now();

  uiButtonAppearCurrentFrame = 0;
  uiButtonAppearFrameCount = Object.keys(iconAppearFRAMES).length;
  uiButtonAppearMSPerFrame = 70;
  uiButtonAppearLastFrameChange = Date.now();

  bottomBar = await resizeImage(bottomBar, optimalScalingFactor);
  document.body.appendChild(bottomBar);
  bottomBar.style.position = "absolute";
  bottomBar.style.bottom = 0 + "px";
  bottomBar.style.left =
    optimalCanvasPosition.x + 67 * optimalScalingFactor + "px";
  bottomBar.setAttribute("id", "bottomBar");
  bottomBar.addEventListener("click", () => {
    initAnim();
    bottomBar.removeEventListener("click", () => {
      initAnim();
    });
  });
  animate();
}

let bottomBarOut = null;
let mainUiIn = null;

function initAnim() {
  console.log(-bottomBar.height - 5);
  mainUiIn = new TWEEN.Tween({ y: window.innerHeight })
    .to({ y: 0 }, 750)
    .easing(TWEEN.Easing.Back.Out)
    .onUpdate((object) => {
      let pos = Math.floor(object.y);
      mainCanvas.style.top = pos + "px";
      mainCanvas.style.display = "block";
      mainCanvas.style.position = "absolute";
      mainCanvas.zIndex = 100;
    })
    .onComplete(() => {
      isAnimBegin = true;
    });
  bottomBarOut = new TWEEN.Tween({ y: 0 })
    .to({ y: -bottomBar.height - 5 }, 150)
    .easing(TWEEN.Easing.Back.In)
    .onUpdate((object) => {
      bottomBar.style.bottom = object.y + "px";
    })
    .onComplete(() => {
      bottomBar.style.display = "none";
      mainUiIn.start();
    });
  bottomBarOut.start();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image at ${src}`));
  });
}
let singleSHOT = false;
function animate() {
  console.log(mainCanvas.style.top);
  deltaT = Date.now() - lastT;
  lastT = Date.now();
  uiCtx.clearRect(0, 0, 608, 512);

  if (!singleSHOT) {
    singleSHOT = true;
    drawUI();
    renderToMainCanvas();
    uiBaseCurrentFrame = 1;
  }

  if (isAnimBegin) {
    // check for uiBase animation
    if (Date.now() - uiBaseLastFrameChange > uiBaseMSPerFrame) {
      uiBaseCurrentFrame++; // uiBaseCurrentFrame %= uiBaseFrameCount; // NO REPEAT, FREEZE AT LAST
      if (uiBaseCurrentFrame >= uiBaseFrameCount) {
        uiBaseCurrentFrame = uiBaseFrameCount - 1;
      }
      uiBaseLastFrameChange = Date.now();
    }
    // only after BASE is finished
    // check for uiButtonAppear animation
    if (
      Date.now() - uiButtonAppearLastFrameChange > uiButtonAppearMSPerFrame &&
      uiBaseCurrentFrame === uiBaseFrameCount - 1
    ) {
      uiButtonAppearCurrentFrame++;
      if (uiButtonAppearCurrentFrame >= uiButtonAppearFrameCount) {
        uiButtonAppearCurrentFrame = uiButtonAppearFrameCount - 1;
      }
      uiButtonAppearLastFrameChange = Date.now();
    }

    drawUI();

    renderToMainCanvas();
  }
  if (bottomBarOut) {
    bottomBarOut.update();
  }
  if (mainUiIn) {
    mainUiIn.update();
  }

  requestAnimationFrame(animate);
}

function renderToMainCanvas() {
  mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  mainCtx.imageSmoothingEnabled = false;
  mainCtx.fillStyle = "black";
  mainCtx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
  mainCtx.drawImage(
    uiOffscreenCanvas,
    optimalCanvasPosition.x,
    optimalCanvasPosition.y,
    608 * optimalScalingFactor,
    512 * optimalScalingFactor,
  );
}

function drawUI() {
  if (uiBaseCurrentFrame === uiBaseFrameCount - 1) {
    uiCtx.drawImage(iconAppearFRAMES[uiButtonAppearCurrentFrame], 0, 0);
  }
  uiCtx.drawImage(uiFRAMES[uiBaseCurrentFrame], 0, 0);
}

function getOptimalCanvasPosition() {
  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight;
  const scalingFactor = getOptimalScalingFactor();
  const scaledWidth = 608 * scalingFactor;
  const scaledHeight = 512 * scalingFactor;
  return {
    x: (canvasWidth - scaledWidth) / 2,
    y: (canvasHeight - scaledHeight) / 2,
  };
}

function getOptimalScalingFactor() {
  // TODO: bypass integer scaling when image too small
  // Dimensions of the main canvas (100% of the page)
  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight;

  // Aspect ratios
  const canvasAspectRatio = canvasWidth / canvasHeight;
  const imageAspectRatio = 608 / 512;

  let scalingFactor;

  if (canvasAspectRatio > imageAspectRatio) {
    // Fit by height
    scalingFactor = Math.floor(canvasHeight / 512);
  } else {
    // Fit by width
    scalingFactor = Math.floor(canvasWidth / 608);
  }

  // Ensure scalingFactor is at least 1 to avoid downscaling below the source resolution
  return Math.max(scalingFactor, 1);
}

async function sliceSpritesheetWithIDs(image, tileWidth = 16, tileHeight = 16) {
  const tiles = {};
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  const rows = Math.floor(image.height / tileHeight);
  const cols = Math.floor(image.width / tileWidth);

  canvas.width = tileWidth;
  canvas.height = tileHeight;

  let id = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      context.clearRect(0, 0, tileWidth, tileHeight);
      context.drawImage(
        image,
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
      // TODO: accelerate perf
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] !== 0) {
          isTransparent = false;
          break;
        }
      }

      if (!isTransparent) {
        const dataURL = canvas.toDataURL();

        const tileImage = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = dataURL;
        });

        tiles[id] = tileImage;
        id++;
      }
    }
  }

  return tiles;
}

async function resizeImage(img, factor) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.width * factor;
  canvas.height = img.height * factor;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let dataURL = canvas.toDataURL();

  const resizedImage = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = dataURL;
  });
  return resizedImage;
}
