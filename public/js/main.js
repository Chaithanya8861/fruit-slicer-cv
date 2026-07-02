// main.js
// Wires together: webcam + hand tracking (CV) -> Game -> UI/HUD.

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const videoEl = document.getElementById("webcam");
  const previewCanvas = document.getElementById("previewCanvas");

  const startScreen = document.getElementById("startScreen");
  const endScreen = document.getElementById("endScreen");
  const loadingScreen = document.getElementById("loadingScreen");
  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const cameraError = document.getElementById("cameraError");
  const endTitle = document.getElementById("endTitle");
  const endMessage = document.getElementById("endMessage");

  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const comboEl = document.getElementById("combo");
  const targetHintEl = document.getElementById("targetScoreHint");

  previewCanvas.width = 200;
  previewCanvas.height = 150;

  const game = new Game(canvas);
  targetHintEl.textContent = `${game.targetScore}`;

  game.onScoreChange = (score) => {
    scoreEl.textContent = `Score: ${score}`;
    if (game.combo > 1) {
      comboEl.textContent = `🔥 Combo x${game.combo}`;
    } else {
      comboEl.textContent = "";
    }
  };

  game.onLivesChange = (lives, max) => {
    livesEl.textContent = "❤️".repeat(Math.max(lives, 0)) + "🖤".repeat(Math.max(max - lives, 0));
  };

  game.onGameOver = (reason, finalScore) => {
    endTitle.textContent = "💥 Game Over";
    endMessage.textContent = `${reason} Final score: ${finalScore}`;
    endScreen.classList.remove("hidden");
  };

  game.onWin = (finalScore) => {
    endTitle.textContent = "🏆 You Win!";
    endMessage.textContent = `You sliced your way to ${finalScore} points!`;
    endScreen.classList.remove("hidden");
  };

  let handTracker = null;
  let trackerStarted = false;

  function convertToCanvasPoint(normPoint) {
    if (!normPoint) return null;
    return {
      x: normPoint.xNorm * canvas.width,
      y: normPoint.yNorm * canvas.height,
    };
  }

  async function ensureTrackerStarted() {
    if (trackerStarted) return;
    trackerStarted = true;

    loadingScreen.classList.remove("hidden");

    handTracker = new HandTracker({
      videoEl,
      previewCanvasEl: previewCanvas,
      onFingerTip: (point) => {
        game.updateFingerPosition(convertToCanvasPoint(point));
      },
      onReady: () => {
        loadingScreen.classList.add("hidden");
      },
      onError: (err) => {
        loadingScreen.classList.add("hidden");
        cameraError.textContent =
          "Could not access webcam or load the hand-tracking model: " + err.message;
        startScreen.classList.remove("hidden");
        trackerStarted = false;
      },
    });

    await handTracker.start();
  }

  startBtn.addEventListener("click", async () => {
    cameraError.textContent = "";
    await ensureTrackerStarted();
    if (trackerStarted) {
      startScreen.classList.add("hidden");
      game.start();
    }
  });

  restartBtn.addEventListener("click", () => {
    endScreen.classList.add("hidden");
    game.start();
  });

  function loop() {
    game.update();
    game.draw();
    requestAnimationFrame(loop);
  }
  loop();
});
