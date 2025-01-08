// this actually works

import * as AS from "/src/pathfinder.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = 700;
canvas.height = 700;

const MAP_SIZE = 75;

const map = genRandomMap(MAP_SIZE);

drawMap(map);

function drawMap(map) {
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[i].length; j++) {
      ctx.fillStyle = map[i][j] === 1 ? "black" : "white";
      ctx.fillRect(j * 10, i * 10, 10, 10);
    }
  }
}

function genRandomMap(size = 100) {
  var map = [];
  for (var i = 0; i < size; i++) {
    map.push([]);
    for (var j = 0; j < size; j++) {
      map[i].push(Math.random() > 0.8 ? 1 : 0); // .93 is optimal
    }
  }
  return map;
}

const start = { x: 0, y: 0 };

canvas.addEventListener("click", (e) => {
  const x = Math.floor(e.offsetX / 10);
  const y = Math.floor(e.offsetY / 10);
  const goal = { x, y };

  const path = AS.aStar(map, start, goal);
  console.log("path", path);
  console.log("to", goal);
  drawMap(map);
  drawPath(path);
});

function drawPath(path) {
  for (const node of path) {
    ctx.fillStyle = "red";
    ctx.fillRect(node.x * 10, node.y * 10, 10, 10);
  }
}
