import * as ANIM from "./animation.js";

let offscreenCanvas, ctx, sequencer;

self.onmessage = async (e) => {
  if (e.data.type === "init") {
    offscreenCanvas = e.data.canvas;
    ctx = offscreenCanvas.getContext("2d");

    // Initialize animations
    const uiBaseAnimation = {
      animation: new ANIM.Animation("UI/BASE.png", 608, 512, 75, false, false),
      layer: 2,
      order: 1,
    };

    const uiIconAAnimation = {
      animation: new ANIM.Animation(
        "UI/ICON_A.png",
        608,
        512,
        75,
        false,
        false,
      ),
      layer: 1,
      order: 2,
    };

    await uiBaseAnimation.animation.init();
    await uiIconAAnimation.animation.init();

    sequencer = new ANIM.Sequencer(
      [uiBaseAnimation, uiIconAAnimation],
      offscreenCanvas,
    );

    sequencer.play();
    requestAnimationFrame(renderFrame);
  }
};

function renderFrame() {
  if (sequencer) {
    sequencer.update();

    // Send the rendered frame back to the main thread
    const frame = offscreenCanvas.transferToImageBitmap();
    self.postMessage({ type: "frame", frame }, [frame]);
  }
  requestAnimationFrame(renderFrame);
}
