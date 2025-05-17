canvas = document.getElementById("canvas");
ctx = canvas.getContext("2d");

// 0->empty, 1->battle_room, 2->start, 3->end, 4.x->special room
grid = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

function generateLevel() {
  // reset grid
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      grid[y][x] = 0;
    }
  }

  const startRandomness = Math.floor(Math.random() * 4);
  let start = { x: null, y: null };
  let end = { x: null, y: null };

  if (startRandomness === 0) {
    start.x = 1;
    start.y = 1;
    end.x = 3;
    end.y = 3;
  } else if (startRandomness === 1) {
    start.x = 3;
    start.y = 1;
    end.x = 1;
    end.y = 3;
  } else if (startRandomness === 2) {
    start.x = 1;
    start.y = 3;
    end.x = 3;
    end.y = 1;
  } else {
    start.x = 3;
    start.y = 3;
    end.x = 1;
    end.y = 1;
  }

  grid[start.y][start.x] = 2;
  grid[end.y][end.x] = 3;

  let x = start.x;
  let y = start.y;

  const direction = Math.random();

  // start with horizontal
  if (direction < 0.5) {
    while (x !== end.x) {
      x += x < end.x ? 1 : -1;
      if (grid[y][x] === 0) grid[y][x] = 1;
    }

    while (y !== end.y) {
      y += y < end.y ? 1 : -1;
      if (grid[y][x] === 0) grid[y][x] = 1;
    }
  } else {
    // start vertical
    while (y !== end.y) {
      y += y < end.y ? 1 : -1;
      if (grid[y][x] === 0) grid[y][x] = 1;
    }

    while (x !== end.x) {
      x += x < end.x ? 1 : -1;
      if (grid[y][x] === 0) grid[y][x] = 1;
    }
  }

  const maxBranchOff = 3;
  let branchOffs = 0;

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      if (grid[y][x] === 1 && branchOffs < maxBranchOff && Math.random() < 1) {
        const side = Math.floor(Math.random() * 4);
        let type = Math.ceil(Math.random() * 4) / 10;
        if (type === 0) type = 0.1;

        if (side === 0 && grid[y - 1][x] === 0) {
          // top
          grid[y - 1][x] = 4 + type;
          branchOffs += 1;
        }
        if (side === 1 && grid[y + 1][x] === 0) {
          // down
          grid[y + 1][x] = 4 + type;
          branchOffs += 1;
        }
        if (side === 2 && grid[y][x - 1] === 0) {
          // left
          grid[y][x - 1] = 4 + type;
          branchOffs += 1;
        }
        if (side === 3 && grid[y][x + 1] === 0) {
          // right
          grid[y][x + 1] = 4 + type;
          branchOffs += 1;
        }
      }
    }
  }
}

// maps are 20x20 tiles, with hallways being 20 tiles long and 16x16 pixels tiles. each room needs to be offset by 40*16 ((20+20)*16)

let renderedMap = [];

async function drawRoom(type, subtype, x, y) {
  if (type === 1) {
    const map = new Map(
      "./map-assets/room_battle_1/spritesheet.png",
      x * 40 * 16,
      y * 40 * 16,
    );
    await map.loadMapFromFile("./map-assets/room_battle_1/map.json");
    renderedMap.push(map);
  }
  if (type === 2) {
    const map = new Map(
      "./map-assets/room_start/spritesheet.png",
      x * 40 * 16,
      y * 40 * 16,
    );
    await map.loadMapFromFile("./map-assets/room_start/map.json");
    renderedMap.push(map);
  }
  if (type === 3) {
    const map = new Map(
      "./map-assets/room_end/spritesheet.png",
      x * 40 * 16,
      y * 40 * 16,
    );
    await map.loadMapFromFile("./map-assets/room_end/map.json");
    renderedMap.push(map);
  }
  if (type === 4) {
    const map = new Map(
      `./map-assets/room_special_${subtype}/spritesheet.png`,
      x * 40 * 16,
      y * 40 * 16,
    );
    await map.loadMapFromFile(`./map-assets/room_special_${subtype}/map.json`);
    renderedMap.push(map);
  }

  renderedMap.forEach((map) => {
    map.render();
  });
}

let renderedHalls = [];

async function drawHall(type, x, y) {
  if (type === "h") {
    const map = new Map(
      `./map-assets/hall_h/spritesheet.png`,
      x * 40 * 16 + 20 * 16,
      y * 40 * 16 + 6 * 16,
    );
    await map.loadMapFromFile(`./map-assets/hall_h/map.json`);
    renderedHalls.push(map);
  }
  if (type === "v") {
    const map = new Map(
      `./map-assets/hall_v/spritesheet.png`,
      x * 40 * 16 + 7 * 16,
      y * 40 * 16 + 20 * 16,
    );
    await map.loadMapFromFile(`./map-assets/hall_v/map.json`);
    renderedHalls.push(map);
  }

  renderedHalls.forEach((map) => {
    map.render();
  });
}

let renderedBlocks = [];

async function drawBlock(type, x, y, lockdownBlock) {
  if (type === "hl") {
    const map = new Map(
      `./map-assets/room_block_h/spritesheet.png`,
      x * 40 * 16,
      y * 40 * 16 + 7 * 16,
      [x, y],
      lockdownBlock,
    );
    await map.loadMapFromFile(`./map-assets/room_block_h/map.json`);
    renderedBlocks.push(map);
  }
  if (type === "hr") {
    const map = new Map(
      `./map-assets/room_block_h/spritesheet.png`,
      x * 40 * 16 + 19 * 16,
      y * 40 * 16 + 7 * 16,
      [x, y],
      lockdownBlock,
    );
    await map.loadMapFromFile(`./map-assets/room_block_h/map.json`);
    renderedBlocks.push(map);
  }
  if (type === "vt") {
    const map = new Map(
      `./map-assets/room_block_v/spritesheet.png`,
      x * 40 * 16 + 8 * 16,
      y * 40 * 16,
      [x, y],
      lockdownBlock,
    );
    await map.loadMapFromFile(`./map-assets/room_block_v/map.json`);
    renderedBlocks.push(map);
  }
  if (type === "vb") {
    const map = new Map(
      `./map-assets/room_block_v/spritesheet.png`,
      x * 40 * 16 + 8 * 16,
      y * 40 * 16 + 19 * 16,
      [x, y],
      lockdownBlock,
    );
    await map.loadMapFromFile(`./map-assets/room_block_v/map.json`);
    renderedBlocks.push(map);
  }

  renderedBlocks.forEach((map) => {
    map.render();
  });
}

function drawLevel() {
  // draw rooms
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      drawRoom(
        Math.floor(grid[y][x]),
        (grid[y][x] % 1).toFixed(1).substring(2),
        x,
        y,
      ).catch(console.error);

      if (grid[y][x] !== 0) {
        // horizontal hallways
        if (grid[y] && grid[y][x + 1] !== undefined) {
          if (grid[y][x + 1] !== 0) drawHall("h", x, y).catch(console.error);
          // generate blockade
          else {
            drawBlock("hr", x, y).catch(console.error);
          }
        }
        // vertical hallways
        if (grid[y + 1] && grid[y + 1][x] !== undefined) {
          if (grid[y + 1][x] !== 0) drawHall("v", x, y).catch(console.error);
        }

        // blockades
        if ((grid[y] && grid[y][x - 1] === undefined) || grid[y][x - 1] === 0) {
          // left
          drawBlock("hl", x, y).catch(console.error);
        }
        if ((grid[y] && grid[y][x + 1] === undefined) || grid[y][x + 1] === 0) {
          // right
          drawBlock("hr", x, y).catch(console.error);
        }
        if (
          grid[y - 1] === undefined ||
          grid[y - 1][x] === undefined ||
          grid[y - 1][x] === 0
        ) {
          drawBlock("vt", x, y).catch(console.error);
        }
        if (
          grid[y + 1] === undefined ||
          grid[y + 1][x] === undefined ||
          grid[y + 1][x] === 0
        ) {
          drawBlock("vb", x, y).catch(console.error);
        }
      }
    }
  }
  console.log(grid);
}

function lockdownRoom(x, y) {
  drawBlock("hl", x, y, true).catch(console.error);
  drawBlock("hr", x, y, true).catch(console.error);
  drawBlock("vt", x, y, true).catch(console.error);
  drawBlock("vb", x, y, true).catch(console.error);
}

function unlockRooms() {
  renderedBlocks.forEach((block) => {
    if (block.lockdownBlock) {
      renderedBlocks.splice(block, 1); // only works if the map is being redrawn every frame
    }
  });
}

// finding which room to consider collisions (untested)
playerX = 0; // temp, replace later. ideally, take the player's center.
playerY = 0;

let previousCurrentRoom = null;
let currentRoom = null;
let currentBlocks = [];

function findCurrentRoom() {
  renderedMap.forEach((map) => {
    if (
      playerX >= map.x &&
      playerX <= map.x + map.width * 16 &&
      playerY >= map.y &&
      playerY <= map.y + map.height * 16
    ) {
      currentRoom = map;

      // reset array
      if (previousCurrentRoom !== currentRoom) {
        currentBlocks = [];
        previousCurrentRoom = currentRoom;
      }

      // associated blocks
      renderedBlocks.forEach((block) => {
        if (
          Array.isArray(block.room) &&
          block.room[0] === currentRoom.x / (40 * 16) &&
          block.room[1] === currentRoom.y / (40 * 16)
        ) {
          currentBlocks.push(block);
        }
      });
    }
  });
  renderedHalls.forEach((map) => {
    if (
      playerX >= map.x &&
      playerX <= map.x + map.width * 16 &&
      playerY >= map.y &&
      playerY <= map.y + map.height * 16
    ) {
      currentRoom = map;
    }
  });
}

generateLevel();
drawLevel();
