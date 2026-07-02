// server.js
// Simple static file server for the Fruit Slicer CV game.
// The actual game (rendering + computer vision hand tracking) runs
// entirely client-side in the browser using the webcam + MediaPipe Hands.

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`🍉 Fruit Slicer CV running at http://localhost:${PORT}`);
  console.log("Open that URL in a webcam-enabled browser (Chrome recommended).");
});
