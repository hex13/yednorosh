console.log("yednorosh");

class Tile {}

class Entity {
	constructor() {
		this.group = '';
	}
}
class Weapon {}
const TILE_SIZE = 50;
const FULL_FIRE = 4;

const canvas = document.querySelector("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

function renderTile(x, y, tile) {
	let color = '#333';
	if (tile.fire == 1) {
		color = '#544';
	} else if (tile.fire == 2) {
		color = '#866';
	} else if (tile.fire == 3) {
		color = '#d99';
	} else if (tile.fire == 4) {
		color = '#faa';
	}


	ctx.fillStyle = color;
	ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
}

function Map(create) {
	const tiles = Object.create(null);
	const getKey = (x, y) => x + ',' + y;
	const map = {
		width: 20,
		height: 15,
		[Symbol.iterator]: function* () {
			for (let y = 0; y < map.height; y++) {
				for (let x = 0; x < map.width; x++) {
					yield {x, y};
				}
			}
		},
		neighbors8: function* (x, y) {
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (dx == 0 && dy == 0) continue;
					yield {x: x + dx, y: y + dy};
				}
			}
		},
		tile: (x, y) => tiles[getKey(x, y)] || (tiles[getKey(x, y)] = create()),
	};
	return map;
}
const map = Map(() => ({
	fire: 0,
	flammable: false,
	updates: {
		fire: 0,
	},
}));

map.tile(2, 3).fire = 1;
map.tile(3, 3).fire = FULL_FIRE;
map.tile(4, 3).fire = FULL_FIRE;
map.tile(5, 3).fire = FULL_FIRE;
map.tile(5, 5).fire = FULL_FIRE;

// map.tile(8, 2).fire = 3;

map.tile(2, 2).fire = 3;
map.tile(3, 2).fire = 1;
// map.tile(3, 3).fire = 1;
map.tile(7, 1).fire = 3;
map.tile(6, 2).flammable = true;




function render() {
	for (let y = 0; y < map.height; y++) {
		for (let x = 0; x < map.width; x++) {
			renderTile(x, y, map.tile(x, y));
		}
	}
	requestAnimationFrame(render);
}

requestAnimationFrame(render);

setInterval(() => {
	for (const {x, y} of map) {
		const tile = map.tile(x, y);
		// if (map.tile(x - 1, y).fire > tile.fire || map.tile(x + 1, y).fire > tile.fire || map.tile(x, y - 1).fire > tile.fire || map.tile(x, y + 1).fire > tile.fire) {
		// 	tile.updates.fire = 1;
		// }
		for (const npos of map.neighbors8(x, y)) {
			const neighbor = map.tile(npos.x, npos.y);
			if (neighbor.fire > 1 && neighbor.fire > tile.fire) tile.updates.fire = 1;
		}
		// if (map.tile(x - 1, y).fire > 1) tile.updates.fire += 1;
		// if (map.tile(x + 1, y).fire > 1) tile.updates.fire += 1;
		// if (map.tile(x, y - 1).fire > 1) tile.updates.fire += 1;
		// if (map.tile(x, y + 1).fire > 1) tile.updates.fire += 1;
		if (tile.fire > 0) tile.updates.fire -= 1;

	}
	for (const {x, y} of map) {
		const tile = map.tile(x, y);
		tile.fire += Math.sign(tile.updates.fire);
		if (tile.updates.fire > 0) {
			if (tile.flammable) tile.fire = FULL_FIRE;
		}



		tile.updates = {fire: 0};
	}

	for (let i = 0; i < 3; i++) {
		const x = ~~(Math.random() * map.width);
		const y = ~~(Math.random() * map.height);
		map.tile(x, y).fire = FULL_FIRE;
	}

}, 100)