"use strict";
console.log("yednorosh");

const TILE_SIZE = 80;
const HALF_TILE_SIZE = TILE_SIZE / 2;
const FULL_FIRE = 2;

const MAP_WIDTH = 12;
const MAP_HEIGHT = 12;

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
	blockade: 'blockade.png',
	barrel: 'barrel.png',
}).map(([name, src]) => {
	const img = new Image();
	img.src = src;
	return [name, img];
}));

const directMovables = ['crate', 'barrel'];
const indirectMovables = ['mine', 'poo'];
const itemKinds = ['poo', 'mine', 'button', 'blockade', 'barrel'];

const particles = [];

function mix(a, b, t) {
	return a * (1 - t) + b * t;
}

class Entity {
	constructor(group = '', x = 0, y = 0) {
		this.group = group;
		this.x = x;
		this.y = y;
		this.prevX = this.x;
		this.prevY = this.y;
		this.dir = {x: 1, y: 0};
		this.transition = 1;
		this.speed = 0.003;
		this.dead = false;
		if (group == 'player' || group == 'crate' || itemKinds.includes(group)) {
			this.speed = 0.006;
		}
	}
	move(nx, ny) {
		this.prevX = this.x;
		this.prevY = this.y;
		this.x = nx;
		this.y = ny;
		this.transition = 0.0;
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
		switch (this.group) {
			case 'unicorn': {
				const nx = this.x + this.dir.x;
				const ny = this.y + this.dir.y;
				const nextTile = map.tile(nx, ny);
				if (!map.inBounds(nx, ny) || nextTile.wall || nextTile.blockade || nextTile.crate) {
					this.dir.x *= -1;
					this.dir.y *= -1;
				} else {
					this.move(nx, ny);
					if (nextTile.mine) {
						burn(nextTile);
						nextTile.mine = null;
					}
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
const entities = [player];
const bullets = [];


for (let i = 0; i < 3; i++) {
	const npc = new Entity('unicorn')
	npc.x = 3 + i;
	npc.y = 5 + i;
	entities.push(npc);
}

class Weapon {}

const canvas = document.querySelector("canvas");
canvas.width = TILE_SIZE * MAP_WIDTH;
canvas.height = TILE_SIZE * MAP_HEIGHT;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let animLoopCounter = 0;
function renderTile(x, y, tile) {
	let color = '#432';
	let rendered = false;
	if (tile.wall) {
		let frame = 0;
		const img = tile.crate? images.crate : tile.wall? images.wall : null;
		if (tile.wall && tile.graffiti) {
			frame = tile.graffiti;
		}
		renderSprite(img, x, y, frame);
		rendered = true;
	}

	if (!rendered) {
		let frame = 0;

		renderSprite(images.floor, x, y, frame);

		if (tile.button) {
			frame = map.tile(tile.button.target.x, tile.button.target.y).blockade? animLoopCounter % 6 : 6;
		}

		itemKinds.forEach(kind => {
			if (directMovables.includes(kind) || indirectMovables.includes(kind)) return;
			if (tile[kind])	renderSprite(images[kind], x, y, frame);
		});
	}
	if (tile.fire > 0) {
		const frame = animLoopCounter % 3;
		renderSprite(tile.fire == FULL_FIRE? images.fire : images.fireSmall, x, y, frame);
	}

}

function Map(create) {
	const tiles = Object.create(null);
	const getKey = (x, y) => x + ',' + y;
	const map = {
		width: MAP_WIDTH,
		height: MAP_HEIGHT,
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

putItem(15, 3, 'barrel');

function burn(tile) {
	tile.fire = 1;
	if (tile.poo || tile.crate) {
		setTimeout(() => {
			// tile.poo = false;
			// tile.crate = false;
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

for (let y = 10; y < 15; y++) {
	for (let x = 3; x < 10; x++) {
		map.tile(x, y).wall = true;
	}
}
map.tile(10, 5).graffiti = 1;
map.tile(10, 8).graffiti = 2;
map.tile(5, 14).graffiti = 3;
map.tile(7, 14).graffiti = 4;
for (let y = 3; y <= 10; y++) {
	map.tile(10, y).wall = true;
}


function putItem(x, y, kind) {
	const entity = new Entity(kind, x, y);
	map.tile(x, y)[kind] = entity;
	entities.push(entity);
}

putItem(1, 2, 'crate');
putItem(6, 2, 'crate');
putItem(5, 2, 'mine');

map.tile(7, 3).button = {target: {x: 2, y: 7}};

map.tile(2, 7).blockade = true;

putItem(2, 2, 'poo');

function renderEntity(entity) {
	const color = entity.group == 'player'? 'black' : entity.group == 'unicorn'? 'pink': 'grey';
	ctx.fillStyle = color;
	const size = 16;
	const x = entity.screenX();
	const y = entity.screenY();
	let frame = 0;
	if (entity.group == 'player') {
		frame = animLoopCounter % 3;
	} else if (entity.group == 'unicorn') {
		frame = entity.dead? 2 : animLoopCounter % 2;
		if (entity.dir.x < 0) {
			frame += 3;
		}
	}
	renderSprite(images[entity.group], x, y, frame);
}

function renderSprite(img, x, y, frame = 0) {
	ctx.drawImage(img, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
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
		if (entity.transition == 1.0) {
			entity.update(map);
		}

	});
	bullets.forEach(bullet => {
		console.log(bullet);
		bullet.x += bullet.vx * 0.1;
		bullet.y += bullet.vy * 0.1;
		renderBullet(bullet);
	});

	for (let i = particles.length - 1; i >= 0; i--) {
		const particle = particles[i];
		ctx.fillStyle = particle.color;
		ctx.fillRect(particle.x * TILE_SIZE - particle.size / 2, particle.y * TILE_SIZE - particle.size / 2, particle.size, particle.size);
		particle.x += particle.vx * delta;
		particle.y += particle.vy * delta;
		particle.ttl -= delta;
		if (particle.ttl <= 0) {
			particles.splice(i, 1);
		}
	};
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
	'KeyM': 'mine',
}

const keyboardState = {}

function handleKeyDown(e) {
	if (Object.hasOwn(keymap, e.code)) {
		keyboardState[e.code] = true;

		const cmd = keymap[e.code];
		switch (cmd) {
			case 'shoot':
				// map.tile(player.x + 1, player.y).fire = FULL_FIRE;
				const bullet = {x: player.x, y: player.y, vx: 1, vy: 0};
				bullets.push(bullet);
				break;
			case 'fire':
				break;
			case 'mine':
				map.tile(player.x, player.y).mine = true;
				break;
			default:
				if (keyboardState.Space) {
					burn(map.tile(player.x + cmd.x, player.y + cmd.y));
					burn(map.tile(player.x + cmd.x * 2, player.y + cmd.y * 2));
					const speed = 0.006 + Math.random() * 0.004 - 0.002;
					const startX = player.x + 0.75;
					const startY = player.y + 0.75;
					const shootAngle = (Math.atan2(cmd.y, cmd.x) + Math.PI * 2);//% (Math.PI * 2);
					for (let i = 0; i < 10; i++) {
						const angle = shootAngle - 0.2 + i * 0.04;
						const size = Math.abs(4.5 - i) * 2 + 2;
						particles.push({
							x: startX, y: startY,
							vx: Math.cos(angle) * speed * (Math.random() * 0.3 + 0.85),
							vy: Math.sin(angle) * speed * (Math.random() * 0.3 + 0.85),
							size,
							ttl: 450,
							color: size < 7 ? '#f4a741' : size < 10? '##d6824b' : '#d64b4b',
						});
					}
				} else if (player.transition == 1.0) {
					const nextTile = map.tile(player.x + cmd.x, player.y + cmd.y);
					let canEnter = !nextTile.wall && !nextTile.blockade;
					if (nextTile.button) {
						const targetTile = map.tile(nextTile.button.target.x, nextTile.button.target.y);
						targetTile.blockade = !targetTile.blockade;
					}
					directMovables.forEach(movableType => {
						const movable = nextTile[movableType];
						if (movable) {
							const movableNextTile = map.tile(player.x + cmd.x * 2, player.y + cmd.y * 2);
							if (directMovables.find(kind => movableNextTile[kind])) {
								canEnter = false;
							} else if (movableNextTile.wall || findEntity(movableNextTile)?.group == 'unicorn') {
								canEnter = false;
							}
							if (canEnter) {
								nextTile[movableType] = null;
								movableNextTile[movableType] = movable;
								movable.move(movableNextTile.x, movableNextTile.y);

								indirectMovables.forEach(kind => {
									if (movableNextTile[kind]) {
										const movable = movableNextTile[kind];
										movableNextTile[kind] = null;
										const movableNextX = movableNextTile.x + cmd.x;
										const movableNextY = movableNextTile.y + cmd.y;
										map.tile(movableNextX, movableNextY)[kind] = movable;
										if (movable instanceof Entity) {
											movable.move(movableNextX, movableNextY);
										}
									}
								})
							}
						}

					});
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
}, 700);

setInterval(() => {
	animLoopCounter += 1;
}, 200);


function initJoystick(el, action) {
	const joystick = el;
	let joystickStart = null;
	joystick.addEventListener('pointerdown', (e) => {
		joystickStart = {x: e.clientX, y: e.clientY};

	});
	joystick.addEventListener('pointermove', (e) => {
		e.preventDefault();
		if (joystickStart) {
			const deltaX = e.clientX - joystickStart.x;
			const deltaY = e.clientY - joystickStart.y;
			let code = '';
			if (Math.abs(deltaX) >= Math.abs(deltaY)) {
				if (deltaX < 0) {
					code = 'ArrowLeft';
				} else if (deltaX > 0) {
					code = 'ArrowRight';
				}
			} else {
				if (deltaY < 0) {
					code = 'ArrowUp';
				} else if (deltaY > 0) {
					code = 'ArrowDown';
				}
			}

			if (action == 'fire') {
				keyboardState.Space = true;
			}

			handleKeyDown({code})

			if (action == 'fire') {
				keyboardState.Space = false;
				joystickStart = false;
			}


		}
	});
	joystick.addEventListener('pointerup', (e) => {
		joystickStart = null;
	});
}

initJoystick(document.getElementById('joystick-movement'), 'movement');
initJoystick(document.getElementById('joystick-fire'), 'fire');

