// NOT WORKING AS OF 2025-01-02
// DOES NOT RENDER CORRECTLY ON THE WORKET THREAD
// OFFSCREEN CANVAS IS NOT WORKING ONUPDATE
// THE IMAGE DATA RETURNED IS ALL 0
// SEEMS TO BE SOMETHING WRONG WUTH ANIMATE.JS

import * as ANIM from "./animation.js";

let sequencer;
let offscreenCanvas;
let offscreenCtx;

onmessage = async function (e) {
  if (e.data.type === "init") {
    const { uiBaseImageData, uiIconAImageData } = e.data;

    let uiBaseAnimation = {
      animation: new ANIM.Animation(
        uiBaseImageData,
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
        uiIconAImageData,
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

    // console.log(uiBaseAnimation, uiIconAAnimation);

    // console.log(uiBaseAnimation.animation.frames);

    // for (let [k, v] of Object.entries(uiBaseAnimation.animation.frames)) {
    //   console.log(getImageData(v));
    // }

    offscreenCanvas = new OffscreenCanvas(608, 512);
    offscreenCtx = offscreenCanvas.getContext("2d");

    sequencer = new ANIM.Sequencer(
      [uiBaseAnimation, uiIconAAnimation],
      offscreenCanvas,
      onUpdate,
      onEnd,
    );

    sequencer.play();
  } else if (e.data.type === "update" && sequencer) {
    sequencer.update();
    const imageData = offscreenCtx.getImageData(
      0,
      0,
      offscreenCanvas.width,
      offscreenCanvas.height,
    );
    console.log("res", imageData);
    postMessage({ type: "render", imageData: imageData });
  }
};

function onEnd() {
  console.log("e");
}

function onUpdate() {
  console.log("u");
}
function getImageData(imageBitmap) {
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0);
  return ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
}
