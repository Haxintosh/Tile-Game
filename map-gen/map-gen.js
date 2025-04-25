canvas = document.getElementById('canvas')
ctx = canvas.getContext('2d')

// 0->empty, 1->battle_room, 2->start, 3->end, 4.x->special room
grid = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
]

function generateLevel() {
    // reset grid
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            grid[y][x] = 0
        }
    }

    const startRandomness = Math.floor(Math.random() * 4)
    let start = {x: null, y: null}
    let end = {x: null, y: null}

    if (startRandomness === 0) {
        start.x = 1; start.y = 1
        end.x = 3; end.y = 3
    } else if (startRandomness === 1) {
        start.x = 3; start.y= 1
        end.x = 1; end.y = 3
    } else if (startRandomness === 2) {
        start.x = 1; start.y = 3
        end.x = 3; end.y = 1
    } else {
        start.x = 3; start.y = 3
        end.x = 1; end.y = 1
    }

    grid[start.y][start.x] = 2
    grid[end.y][end.x] = 3

    let x = start.x
    let y = start.y

    const direction = Math.random()

    // start with horizontal
    if (direction < 0.5) {
        while (x !== end.x) {
            x += x < end.x ? 1 : -1
            if (grid[y][x] === 0) grid[y][x] = 1
        }

        while (y !== end.y) {
            y += y < end.y ? 1 : -1
            if (grid[y][x] === 0) grid[y][x] = 1
        }
    }
    else { // start vertical
        while (y !== end.y) {
            y += y < end.y ? 1 : -1
            if (grid[y][x] === 0) grid[y][x] = 1
        }

        while (x !== end.x) {
            x += x < end.x ? 1 : -1
            if (grid[y][x] === 0) grid[y][x] = 1
        }
    }

    const maxBranchOff = 3
    let branchOffs = 0

    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            if (grid[y][x] === 1 && branchOffs < maxBranchOff && Math.random() < 1) {
                const side = Math.floor(Math.random()*4)
                let type = Math.ceil(Math.random()*4)/10
                if (type === 0) type = 0.1

                if (side === 0 && grid[y-1][x] === 0) { // top
                    grid[y-1][x] = 4 + type
                    branchOffs += 1
                }
                if (side === 1 && grid[y+1][x] === 0) { // down
                    grid[y+1][x] = 4 + type
                    branchOffs += 1
                }
                if (side === 2 && grid[y][x-1] === 0) { // left
                    grid[y][x-1] = 4 + type
                    branchOffs += 1
                }
                if (side === 3 && grid[y][x+1] === 0) { // right
                    grid[y][x+1] = 4 + type
                    branchOffs += 1
                }
            }
        }
    }
}

function drawLevel() {
    console.log(grid)
}

generateLevel()
drawLevel()