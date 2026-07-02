// handTracker.js
// Wraps MediaPipe Hands to give us a simple callback:
//   onFingerTip({ x, y, isFist })  -- coordinates already mirrored & scaled to canvas size
//
// Landmark 8 = tip of the index finger (this is what we use as the "knife").
// We also roughly detect a closed fist (all fingertips near the palm) so the
// game could later use it for pause/menu gestures if desired.

class HandTracker {
  constructor({ videoEl, previewCanvasEl, onFingerTip, onReady, onError }) {
    this.videoEl = videoEl;
    this.previewCanvas = previewCanvasEl;
    this.previewCtx = previewCanvasEl.getContext("2d");
    this.onFingerTip = onFingerTip || (() => {});
    this.onReady = onReady || (() => {});
    this.onError = onError || (() => {});
    this.camera = null;
    this.hands = null;
  }

  async start() {
    try {
      if (typeof Hands === "undefined" || typeof Camera === "undefined") {
        throw new Error("MediaPipe scripts failed to load (check your internet connection).");
      }

      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      this.hands.onResults((results) => this._handleResults(results));

      this.camera = new Camera(this.videoEl, {
        onFrame: async () => {
          await this.hands.send({ image: this.videoEl });
        },
        width: 640,
        height: 480,
      });

      await this.camera.start();
      this.onReady();
    } catch (err) {
      console.error("HandTracker start error:", err);
      this.onError(err);
    }
  }

  stop() {
    if (this.camera) this.camera.stop();
  }

  _handleResults(results) {
    // Draw mirrored preview
    const pCtx = this.previewCtx;
    const pW = this.previewCanvas.width;
    const pH = this.previewCanvas.height;
    pCtx.save();
    pCtx.clearRect(0, 0, pW, pH);
    pCtx.translate(pW, 0);
    pCtx.scale(-1, 1);
    pCtx.drawImage(results.image, 0, 0, pW, pH);
    pCtx.restore();

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.onFingerTip(null);
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const tip = landmarks[8]; // index fingertip, normalized [0,1] coords

    // Draw a marker on the preview too (mirrored space)
    pCtx.save();
    pCtx.translate(pW, 0);
    pCtx.scale(-1, 1);
    pCtx.beginPath();
    pCtx.arc(tip.x * pW, tip.y * pH, 6, 0, Math.PI * 2);
    pCtx.fillStyle = "#ffd93d";
    pCtx.fill();
    pCtx.restore();

    // Mirror the x-coordinate so movement feels natural (like a mirror),
    // matching how the preview is drawn.
    const mirroredX = 1 - tip.x;

    this.onFingerTip({
      xNorm: mirroredX,
      yNorm: tip.y,
      isFist: this._isFist(landmarks),
    });
  }

  // Rough heuristic: fist if all fingertips are close to the palm center.
  _isFist(lm) {
    const palm = lm[0];
    const tips = [4, 8, 12, 16, 20];
    const avgDist =
      tips.reduce((sum, i) => sum + Math.hypot(lm[i].x - palm.x, lm[i].y - palm.y), 0) /
      tips.length;
    return avgDist < 0.12;
  }
}
