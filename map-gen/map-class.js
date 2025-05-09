class Map {
    constructor(spritesheetImage, x, y, room = null, lockdownBlock = false, mapData = null) {
        this.spritesheet = new Image()
        this.spritesheet.src = spritesheetImage
        this.tileSize = 16
        this.mapWidth = 0
        this.mapHeight = 0
        this.layers = []
        this.collisionMap = [] // use this for collision
        this.debugMode = false
        this.x = x
        this.y = y

        // blockade logic
        this.room = room
        this.lockdownBlock = lockdownBlock

        // load map data
        if (mapData) {
            this.loadMap(mapData)
        }
    }

    async loadMap(mapData) {
        const data = typeof mapData === 'string' ? JSON.parse(mapData) : mapData

        // map properties
        this.tileSize = data.tileSize || this.tileSize
        this.mapWidth = data.mapWidth
        this.mapHeight = data.mapHeight

        // init collision map
        this.collisionMap = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(0))

        // layers
        this.layers = data.layers

        // console.log('map loaded with layers:', this.layers.map(l => l.name))

        // process collision data
        this.processCollisionLayer()

        // console.log('collision map:', this.collisionMap)

        // wait for spritesheet image to fully load
        return new Promise((resolve, reject) => {
            if (this.spritesheet.complete) {
                resolve()
            } else {
                this.spritesheet.onload = () => {
                    // console.log('spritesheet loaded:', this.spritesheet.width, 'x', this.spritesheet.height)
                    resolve()
                }
                this.spritesheet.onerror = () => {
                    console.error('failed to load spritesheet image')
                    reject(new Error('failed to load spritesheet image'))
                }
            }
        })
    }

    async loadMapFromFile(filePath) {
        try {
            const response = await fetch(filePath)
            const mapData = await response.json()
            await this.loadMap(mapData)
            return true
        } catch (error) {
            console.error('error loading map file:', error)
            return false
        }
    }

    processCollisionLayer() {
        // reset collision map
        this.collisionMap = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(0))

        // processing each layer that has collider=true in the .json file
        for (const layer of this.layers) {
            if (layer.collider === true) {
                // console.log(`collision for layer: ${layer.name}, ${layer.tiles.length} tiles`)

                for (const tile of layer.tiles) {
                    const x = parseInt(tile.x, 10)
                    const y = parseInt(tile.y, 10)

                    this.collisionMap[y][x] = 1
                }
            }
        }
    }

    render() {
        // order should be: floor, decoration, collision, interactive

        const floorLayer = this.layers.find(layer => layer.name === 'floor')
        const decorationLayer = this.layers.find(layer => layer.name === 'decoration')
        const collisionLayer = this.layers.find(layer => layer.name === 'collision')
        const interactLayer = this.layers.find(layer => layer.name === 'interactable')

        // array of layers in proper rendering order
        const orderedLayers = []
        if (floorLayer) orderedLayers.push(floorLayer)
        if (decorationLayer) orderedLayers.push(decorationLayer)
        if (collisionLayer) orderedLayers.push(collisionLayer)
        if (interactLayer) orderedLayers.push(interactLayer)

        // console.log(`rendering ${orderedLayers.length} layers in order:`, orderedLayers.map(l => l.name))

        // render each layer
        for (const layer of orderedLayers) {
            // console.log(`rendering layer ${layer.name} with ${layer.tiles.length} tiles`)

            // draw tile
            for (const tile of layer.tiles) {
                const tileId = parseInt(tile.id, 10)
                const x = parseInt(tile.x, 10) * this.tileSize
                const y = parseInt(tile.y, 10) * this.tileSize

                if (!this.spritesheet.complete || !this.spritesheet.width) {
                    console.warn('spritesheet not fully loaded yet')
                    continue
                }

                const tilesPerRow = Math.floor(this.spritesheet.width / this.tileSize)
                if (tilesPerRow <= 0) {
                    console.error('invalid spritesheet width/tile size')
                    continue
                }

                const spritesheetX = (tileId % tilesPerRow) * this.tileSize
                const spritesheetY = Math.floor(tileId / tilesPerRow) * this.tileSize

                ctx.drawImage(
                    this.spritesheet,
                    spritesheetX, spritesheetY, this.tileSize, this.tileSize,
                    this.x + x, this.y + y, this.tileSize, this.tileSize
                )
            }
        }

        // draw overlay
        if (this.debugMode) {
            this.renderCollisionDebug(ctx)
        }
    }

    renderCollisionDebug() {
        ctx.fillStyle = 'rgba(255,0,0,0.3)'

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.collisionMap[y] && this.collisionMap[y][x] === 1) {
                    ctx.fillRect(
                        x * this.tileSize,
                        y * this.tileSize,
                        this.tileSize,
                        this.tileSize
                    )
                }
            }
        }
    }

    getMapWidth() {
        return this.mapWidth * this.tileSize
    }

    getMapHeight() {
        return this.mapHeight * this.tileSize
    }

    /**
     * Get information about a tile at a specific position
     * @param {number} x - X coordinate in pixels
     * @param {number} y - Y coordinate in pixels
     * @returns {Object|null} - Tile information or null if out of bounds
     */
    getTileAt(x, y) {
        const tileX = Math.floor(x / this.tileSize)
        const tileY = Math.floor(y / this.tileSize)

        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return null
        }

        // return info
        return {
            x: tileX,
            y: tileY,
            collidable: this.collisionMap[tileY][tileX] === 1
        }
    }
}