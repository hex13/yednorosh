"use strict";
console.log("yednorosh");


class Tile {}

const images = Object.fromEntries(Object.entries({
	player: 'player.png',
	unicorn: 'unicorn.png',
	crate: 'crate.png',
	wall: 'wall.png',
	floor: 'floor.png',
	poo: 'poo.png',
	fire: 'fire.png',
	fireSmall: 'fire-small.png',
	mine: 'mine.png',
	button: 'button.png',
}).map(([name, src]) => {
	const img = new Image();
	img.src = src;
	return [name, img];
}));


function mix(a, b, t) {
	return a * (1 - t) + b * t;
}

class Entity {
	constructor(group = '') {
		this.group = group;
		this.x = 0;
		this.y = 0;
		this.prevX = this.x;
		this.prevY = this.y;
		this.dir = {x: 1, y: 0};
		this.transition = 1;
		this.speed = 0.003;
		this.dead = false;
	}
	move(nx, ny) {
		this.prevX = this.x;
		this.prevY = this.y;
		this.x = nx;
		this.y = ny;
		this.transition = 0.0;
		// let interval = setInterval(() => {
		// 	this.transition += 0.1;
		// 	if (this.transition >= 1) {
		// 		this.transition = 1;
		// 		clearInterval(interval);
		// 	}
		// });
	}
	screenX() {
		return mix(this.prevX, this.x, this.transition);
	}
	screenY() {
		return mix(this.prevY, this.y, this.transition);
	}
	update(map) {
		if (this.transition < 1.0 || this.dead) {
			return;
		}
		// map.tile(this.x, this.y)
		switch (this.group) {
			case 'unicorn': {
				const nx = this.x + this.dir.x;
				const ny = this.y + this.dir.y;
				const nextTile = map.tile(nx, ny);
				if (!map.inBounds(nx, ny) || nextTile.wall || nextTile.crate) {
					this.dir.x *= -1;
					this.dir.y *= -1;
				} else {
					this.move(nx, ny);
				}

				break;
			}
			default:
				break;
		}
	}
}

const player = new Entity('player');
player.x = 0;
player.y = 0;
player.speed = 0.02;
const entities = [player];
const bullets = [];


const npc = new Entity()
npc.x = 10;
entities.push(npc);

for (let i = 0; i < 3; i++) {
	const npc = new Entity('unicorn')
	npc.x = 3 + i;
	npc.y = 5 + i;
	entities.push(npc);
}

class Weapon {}
const TILE_SIZE = 80;
const HALF_TILE_SIZE = TILE_SIZE / 2;
const FULL_FIRE = 2;

const canvas = document.querySelector("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let animLoopCounter = 0;
function renderTile(x, y, tile) {
	let color = '#432';
	let rendered = false;
	if (tile.crate || tile.wall) {
		const frame = 0;
		const img = tile.crate? images.crate : tile.wall? images.wall : null;
		ctx.drawImage(img, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
		rendered = true;
	} else if (tile.fire == 1) {
		color = '#632';
	} else if (tile.fire == 2) {
		color = '#843';
	} else if (tile.fire == 3) {
		color = '#d86';
	} else if (tile.fire == 4) {
		color = '#fa7';
	}

	if (0 && tile.fire) {
		ctx.fillStyle = '#2b2b2b';
		ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
		ctx.fillStyle = color;
		ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
	} else if (!rendered) {
		let frame = 0;
		ctx.drawImage(images.floor, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
		if (tile.poo) {
			ctx.drawImage(images.poo, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
		}
		if (tile.mine) {
			ctx.drawImage(images.mine, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
		}
		if (tile.button) {
			frame = animLoopCounter % 6;
			ctx.drawImage(images.button, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
		}

	}
	if (tile.fire == FULL_FIRE) {
		const frame = animLoopCounter % 3;
		ctx.drawImage(images.fire, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
	} else if (tile.fire) {
		const frame = animLoopCounter % 3;
		ctx.drawImage(images.fireSmall, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
	}

}

function Map(create) {
	const tiles = Object.create(null);
	const getKey = (x, y) => x + ',' + y;
	const map = {
		width: 20,
		height: 15,
		inBounds(x, y) {
			return x >= 0 && y >= 0 && x < this.width && y < this.height;
		},
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
		tile: (x, y) => tiles[getKey(x, y)] || (tiles[getKey(x, y)] = create(x, y)),
	};
	return map;
}
const map = Map((x, y) => ({
	x, y,
	fire: 0,
	wall: null,
	_flammable: false,
	get flammable() {
		if (this.poo) return true;
		const entitiesOnTile = findEntity(this);
		if (entitiesOnTile) return true;
		return this._flammable;
	},
	set flammable(v) {
		this._flammable = v;
	},
	updates: {
		fire: 0,
	},
}));

// map.tile(2, 3).fire = 1;
// map.tile(3, 3).fire = FULL_FIRE;
// map.tile(4, 3).fire = FULL_FIRE;
// map.tile(5, 3).fire = FULL_FIRE;
// map.tile(5, 5).fire = FULL_FIRE;

function burn(tile) {
	tile.fire = 1;
	if (tile.poo || tile.crate) {
		setTimeout(() => {
			tile.poo = false;
			tile.crate = false;
		}, 1000);
		tile.fire = FULL_FIRE;
	}

	const entity = findEntity(tile);
	if (entity && entity.group == 'unicorn') {
		entity.dead = true;
		setTimeout(() => {
			removeEntity(entity);
		}, 1000);
		tile.fire = FULL_FIRE;
	}
}
function findEntity(tile) {
 	return entities.find(e => e.x == tile.x && e.y == tile.y);
}

function removeEntity(entity) {
	const idx = entities.indexOf(entity);
	if (idx != -1) {
		entities.splice(idx, 1);
	}
}

for (let x = 3; x < 10; x++) {
	map.tile(x, 10).wall = true;
}
for (let y = 3; y <= 10; y++) {
	map.tile(10, y).wall = true;
}

map.tile(13, 13).crate = true;
map.tile(15, 13).crate = true;
map.tile(1, 2).crate = true;

map.tile(5, 2).mine = true;

map.tile(7, 3).button = true;

map.tile(2, 2).poo = true;
console.log("tiles", map);

// map.tile(2, 2).fire = 3;
// map.tile(3, 2).fire = 1;
// // map.tile(3, 3).fire = 1;
// map.tile(7, 1).fire = 3;
// map.tile(6, 2).flammable = true;


function renderEntity(entity) {
	const color = entity.group == 'player'? 'black' : entity.group == 'unicorn'? 'pink': 'grey';
	ctx.fillStyle = color;
	const size = 16;
	const x = entity.screenX();
	const y = entity.screenY();

	if (entity.group == 'player') {
		const frame = animLoopCounter % 3;
		ctx.drawImage(images.player, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
	} else if (entity.group == 'unicorn') {
		let frame = entity.dead? 2 : animLoopCounter % 2;
		if (entity.dir.x < 0) {
			frame += 3;
		}
		ctx.drawImage(images.unicorn, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)

	} else {
		ctx.fillRect(x * TILE_SIZE + HALF_TILE_SIZE - size / 2, y * TILE_SIZE + HALF_TILE_SIZE - size / 2, size, size);
	}
}

function renderBullet(obj) {
	const color = 'yellow';
	ctx.fillStyle = color;
	const size = 4;
	const {x, y} = obj;
	ctx.fillRect(~~(x * TILE_SIZE + HALF_TILE_SIZE - size / 2), ~~(y * TILE_SIZE + HALF_TILE_SIZE - size / 2), size, size);

}

let lastTime;
function render(time) {
	const delta = lastTime? time - lastTime : 16;
	lastTime = time;

	for (let y = 0; y < map.height; y++) {
		for (let x = 0; x < map.width; x++) {
			renderTile(x, y, map.tile(x, y));
		}
	}
	entities.forEach(entity => {
		renderEntity(entity);
		entity.transition += delta * entity.speed;
		if (entity.transition >= 1.0) {
			entity.transition = 1.0;
		}
	});
	bullets.forEach(bullet => {
		console.log(bullet);
		bullet.x += bullet.vx * 0.1;
		bullet.y += bullet.vy * 0.1;
		renderBullet(bullet);
	});
	requestAnimationFrame(render);
	// animLoopCounter += 1;
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
			if (tile.flammable) {
				burn(tile);
			}
		}


		tile.updates = {fire: 0};
	}

}, 1200);

const keymap = {
	'ArrowLeft': {x: -1, y: 0},
	'ArrowRight': {x: +1, y: 0},
	'ArrowDown': {x: 0, y: 1},
	'ArrowUp': {x: 0, y: -1},
	'Space': 'fire',
	'ControlLeft': 'shoot',
}

const keyboardState = {}

function handleKeyDown(e) {
	if (Object.hasOwn(keymap, e.code)) {
		keyboardState[e.code] = true;
		console.log("EE")
		const cmd = keymap[e.code];
		switch (cmd) {
			case 'shoot':
				// map.tile(player.x + 1, player.y).fire = FULL_FIRE;
				const bullet = {x: player.x, y: player.y, vx: 1, vy: 0};
				bullets.push(bullet);
				break;
			case 'fire':
				break;
			default:
				if (keyboardState.Space) {
					burn(map.tile(player.x + cmd.x, player.y + cmd.y));
					burn(map.tile(player.x + cmd.x * 2, player.y + cmd.y * 2));
				} else {
					const nextTile = map.tile(player.x + cmd.x, player.y + cmd.y);
					let canEnter = !nextTile.wall;
					if (nextTile.crate) {
						const crateNextX = player.x + cmd.x * 2;
						const crateNextY = player.y + cmd.y * 2;
						const crateNextTile = map.tile(crateNextX, crateNextY);
						if (crateNextTile.wall || crateNextTile.crate || findEntity(crateNextTile)) {
							canEnter = false;
						} else {
							nextTile.crate = false;
							crateNextTile.crate = true;
							if (crateNextTile.poo) {
								crateNextTile.poo = false;
								map.tile(crateNextTile.x + cmd.x, crateNextTile.y + cmd.y).poo = true;
							}
						}
					}
					if (nextTile.fire == 0 && canEnter) {
						player.move(player.x + cmd.x, player.y + cmd.y);
					}

				}
		}
		e.preventDefault && e.preventDefault();
	}
};

function handleKeyUp(e) {
	if (Object.hasOwn(keymap, e.code)) {
		keyboardState[e.code] = false;
	}

}
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

// const input = ['ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Space', 'ArrowDown', 'ArrowDown'];
const input = ['ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Space'];
setInterval(() => {
	// handleKeyDown({code: input.shift()});
	entities.forEach(entity => {
		entity.update(map);
	})
}, 700);

setInterval(() => {
	animLoopCounter += 1;
}, 200);