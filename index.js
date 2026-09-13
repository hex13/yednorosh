"use strict";

const TILE_SIZE = 80;
const FULL_FIRE = 2;
const MAP_WIDTH = 12;
const MAP_HEIGHT = 12;

if (!navigator.maxTouchPoints) {
	document.querySelector('.joysticks').style.display = 'none';
} else {
	document.querySelector('#keyboard-legend').style.display = 'none';
}

const { cos, sin, random, abs, PI} = Math;

const images = {};

const keymap = {
	'ArrowLeft': {x: -1, y: 0},
	'ArrowRight': {x: +1, y: 0},
	'ArrowDown': {x: 0, y: 1},
	'ArrowUp': {x: 0, y: -1},
	'Space': 'fire',
};

for (const name of [
	'player',
	'unicorn',
	'crate',
	'wall',
	'floor',
	'poo',
	'fire',
	'fire_small',
	'mine',
	'button',
	'blockade',
	'barrel',
]) {
	const img = new Image();
	img.src = name + '.png';
	images[name] = img;
}

const directMovables = ['crate', 'barrel'];
const indirectMovables = ['mine', 'poo'];
const movables = directMovables.concat(indirectMovables);

const itemKinds = ['poo', 'mine', 'button', 'blockade', 'barrel'];

const energyBar = document.querySelector('.energy');

const mix = (a, b, t) => a * (1 - t) + b * t;

let levelCounter = 0;
class Entity {
	constructor(group = '', x = 0, y = 0) {
		this.group = group;
		this.x = x;
		this.y = y;
		this.energy = 100;
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
	update(map, burn) {
		if (this.transition < 1.0 || this.dead) return;
		switch (this.group) {
			case 'unicorn': {
				const nx = this.x + this.dir.x;
				const ny = this.y + this.dir.y;
				const nextTile = map.tile(nx, ny);
				if (!map.inBounds(nx, ny) || nextTile.wall || nextTile.blockade || nextTile.crate || nextTile.barrel) {
					this.dir.x *= -1;
					this.dir.y *= -1;
				} else {
					this.move(nx, ny);
					if (nextTile.mine) {
						burn(nextTile);
					}
				}
				break;
			}
		}
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
					if (!this.inBounds(x + dx, y + dy)) continue;
					yield {x: x + dx, y: y + dy};
				}
			}
		},
		tile: (x, y) => tiles[getKey(x, y)] || (tiles[getKey(x, y)] = create(x, y)),
	};
	return map;
}

function updateEnergyBar() {
	energyBar.style.width = (player.energy * 2) + 'px';
}


const canvas = document.querySelector("canvas");
canvas.width = TILE_SIZE * MAP_WIDTH;
canvas.height = TILE_SIZE * MAP_HEIGHT;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let animLoopCounter = 0;
setInterval(() => {
	animLoopCounter += 1;
}, 200);

function renderEntity(entity) {
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
	if (entity.immuneCounter > 0 && animLoopCounter % 2 == 0) return;
	renderSprite(images[entity.group], x, y, frame);
}

function renderSprite(img, x, y, frame = 0) {
	ctx.drawImage(img, (frame % 2) * 32, ~~(frame / 2 ) * 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
}


function renderTile(x, y, tile) {
	let frame = 0;
	const img = tile.wall? images.wall : images.floor;

	renderSprite(img, x, y, frame);

	if (tile.button) {
		frame = map.tile(tile.button.target.x, tile.button.target.y).blockade? 0 : 1;
	}

	itemKinds.forEach(kind => {
		if (directMovables.includes(kind) || indirectMovables.includes(kind)) return;
		if (tile[kind])	renderSprite(images[kind], x, y, frame);
	});
}

let map;
let entities;
let player;
let lastTime;
let burn;
const particles = [];

function render(time) {
	const delta = lastTime? time - lastTime : 16;
	lastTime = time;

	for (const {x, y} of map) {
		renderTile(x, y, map.tile(x, y));
	}
	entities.forEach(entity => {
		renderEntity(entity);
		entity.transition += delta * entity.speed;
		if (entity.transition >= 1.0) {
			entity.transition = 1.0;
		}
		if (entity.transition == 1.0) {
			entity.update(map, burn);
		}
	});

	for (const {x, y} of map) {
		const tile = map.tile(x, y);
		if (tile.fire > 0) {
			const frame = animLoopCounter % 3;
			renderSprite(tile.fire == FULL_FIRE? images.fire : images.fire_small, x, y, frame);
		}
	}

	for (let i = particles.length - 1; i >= 0; i--) {
		const particle = particles[i];
		ctx.fillStyle = particle.color;
		ctx.fillRect(particle.x * TILE_SIZE - particle.size / 2, particle.y * TILE_SIZE - particle.size / 2, particle.size, particle.size);
		particle.x += particle.vx * delta;
		particle.y += particle.vy * delta;
		particle.vy += 0.00004;
		particle.ttl -= delta;
		if (particle.ttl <= 0) {
			particles.splice(i, 1);
		}
	};

	if (player.immuneCounter == 0) {
		const playerTile = map.tile(player.x, player.y);
		if (playerTile.mine) {
			burn(playerTile);
		}
		if  (entities.find(e => e.x == player.x && e.y == player.y && e.group == 'unicorn') || playerTile.fire || playerTile.poo) {
			player.energy -= 60;
			if (player.energy <= 0) {
				player.energy = 0;
				levelCounter++;
				initLevel(levelCounter);
			}
			updateEnergyBar();
			player.immuneCounter = 1500;
		}
	}
	player.immuneCounter = Math.max(0, player.immuneCounter - delta);

	requestAnimationFrame(render);
}

requestAnimationFrame(render);


//-------------------------------------------------
function initLevel(level) {
	lastTime = null;

	player = new Entity('player');
	player.immuneCounter = 0;

	entities = [player];



	map = Map((x, y) => ({
		x, y,
		fire: 0,
		wall: null,
		updates: {
			fire: 0,
		},
	}));




	function explodeAnimation(x, y) {
		const count = 6;
		for (let i = 0; i < count; i++) {
			const angle = PI * 2 * i / count;
			particles.push({
				x: x + 0.5, y: y + 0.3,
				vx: cos(angle) * 0.0006, vy: sin(angle) * 0.0005 - 0.00010,
				ttl: 600,
				color: '#fff',
				size: i % 2 == 0? 4 : 2,
			});
		}
	}

	burn = (tile) => {
		tile.fire = 1;
		if (tile.poo || tile.crate || tile.mine || tile.barrel) {
			explodeAnimation(tile.x, tile.y);
			setTimeout(() => {
				movables.forEach(kind => {
					if (tile[kind] instanceof Entity) {
						removeEntity(tile[kind]);
						tile[kind] = null;
					}
				});
			}, 1000);
			tile.fire = FULL_FIRE;
		}
		if (tile.barrel) {
			for (const npos of map.neighbors8(tile.x, tile.y)) {
				const neighbor = map.tile(npos.x, npos.y);
				burn(neighbor);
				neighbor.fire = FULL_FIRE;
			}
		}

		const entity = findEntity(tile);
		if (entity && entity.group == 'unicorn') {
			entity.dead = true;
			setTimeout(() => {
				explodeAnimation(entity.x, entity.y);
				removeEntity(entity);
			}, 1000);
			tile.fire = FULL_FIRE;
		}
	}
	const findEntity = (tile) => entities.find(e => e.x == tile.x && e.y == tile.y);

	function removeEntity(entity) {
		const idx = entities.indexOf(entity);
		if (idx != -1) {
			entities.splice(idx, 1);
		}
	}




	function putItem(x, y, kind) {
		const entity = new Entity(kind, x, y);
		map.tile(x, y)[kind] = entity;
		entities.push(entity);
	}

	function level1() {
		putItem(6, 2, 'mine');
		for (let x = 0; x < 4; x++) {
			putItem(x, 4, x % 2? 'mine' : 'crate');
		}
		putItem(3, 2, 'crate');
		putItem(4, 3, 'crate');
		putItem(4, 6, 'crate');
		for (let x = 0; x <= 2; x++) {
			map.tile(x, 2).wall = true;
		}
		map.tile(5, 4).wall = true;
		map.tile(6, 0).wall = true;
		map.tile(6, 1).wall = true;
		map.tile(6, 3).wall = true;
		map.tile(6, 4).wall = true;

		map.tile(7, 3).button = {target: {x: 5, y: 10}};
		map.tile(5, 10).blockade = true;

		for (let x = 0; x < 12; x++) {
			if (x == 5) continue;
			map.tile(x, 10).wall = true;
		}

		putItem(7, 5, 'poo');
		putItem(7, 6, 'poo');
		putItem(7, 7, 'poo');
		putItem(7, 8, 'poo');
		putItem(9, 9, 'poo');

		for (let a = 0; a < 2; a++) {
			for (let i = 0; i < 4; i++) {
				const npc = new Entity('unicorn')
				npc.x = a * 4 +  i;
				npc.y = 5 + i;
				entities.push(npc);
			}
		}

	}
	function level2() {
		let x = 0;
		let y = 7;
		player.x = 1;
		for (x = 2; x < 10; x++) {
			map.tile(x, 10).wall = true;
			// putItem(x, 10, 'crate');
		}
		for (x = 0; x < 6; x++) {
			map.tile(x, 4).wall = true;
			// putItem(x, 10, 'crate');
		}

		putItem(1, 9, 'barrel');
		for (y = 5; y < 10; y++) {
			map.tile(9, y).wall = true;
		}


		putItem(0, 10, 'mine');
		putItem(8, 11, 'crate');
		putItem(7, 11, 'crate');

		map.tile(2, 11).blockade = true;
		map.tile(9, 11).blockade = true;
		map.tile(0, 9).button = {target: {x: 9, y: 11}};
		map.tile(11, 0).button = {target: {x: 2, y: 11}};
		putItem(2, 9, 'mine');
		putItem(2, 3, 'barrel');
		putItem(5, 0, 'mine');
		putItem(3, 1, 'mine');
		putItem(6, 1, 'crate');
		putItem(7, 6, 'barrel');
		{
			entities.push(new Entity('unicorn', 1, 8));
			entities.push(new Entity('unicorn', 3, 11));
			entities.push(new Entity('unicorn', 8, 1));
			entities.push(new Entity('unicorn', 3, 3));
			entities.push(new Entity('unicorn', 2, 6));
			entities.push(new Entity('unicorn', 6, 3));
			entities.push(new Entity('unicorn', 1, 2));
		}

	}

	function level3() {
		for (let y = 3; y < 9; y++) {
			map.tile(0, y).wall = true;
			map.tile(y, 2).wall = true;
		}
		putItem(1, 4, 'crate');
		putItem(2, 4, 'crate');
		putItem(3, 3, 'crate');
		putItem(3, 4, 'crate');
		putItem(3, 5, 'crate');
		putItem(4, 5, 'crate');
		putItem(1, 7, 'crate');
		putItem(2, 7, 'crate');
		putItem(3, 7, 'crate');
		putItem(3, 6, 'crate');
		putItem(1, 8, 'crate');
		putItem(3, 8, 'crate');
		putItem(2, 9, 'crate');
		putItem(1, 10, 'crate');
		putItem(2, 10, 'crate');
		putItem(6, 7, 'crate');
		putItem(4, 9, 'crate');
		putItem(4, 10, 'crate');
		putItem(7, 5, 'crate');
		putItem(6, 5, 'crate');
		putItem(8, 8, 'crate');
		putItem(5, 8, 'crate');
		putItem(5, 10, 'crate');
		putItem(5, 11, 'crate');
		putItem(3, 10, 'mine');
		putItem(5, 0, 'poo');
		putItem(7, 1, 'poo');
		putItem(8, 4, 'poo');
		entities.push(new Entity('unicorn', 4, 7));
		entities.push(new Entity('unicorn', 2, 2));
		entities.push(new Entity('unicorn', 1, 1));
		entities.push(new Entity('unicorn', 4, 0));
		entities.push(new Entity('unicorn', 10, 2));
		entities.push(new Entity('unicorn', 10, 5));
	}
	level3();


	setInterval(() => {
		for (const {x, y} of map) {
			const tile = map.tile(x, y);
			for (const npos of map.neighbors8(x, y)) {
				const neighbor = map.tile(npos.x, npos.y);
				if (neighbor.fire > 1 && neighbor.fire > tile.fire) tile.updates.fire = 1;
			}
			if (tile.fire > 0) tile.updates.fire -= 1;

		}
		for (const {x, y} of map) {
			const tile = map.tile(x, y);
			tile.fire += Math.sign(tile.updates.fire);
			if (tile.updates.fire > 0) {
				if (findEntity(tile)) {
					burn(tile);
				}
			}
			tile.updates = {fire: 0};
		}
	}, 1000);

	const keyboardState = {}

	function handleKeyDown(e) {
		if (Object.hasOwn(keymap, e.code)) {
			keyboardState[e.code] = true;

			const cmd = keymap[e.code];
			switch (cmd) {
				default:
					if (keyboardState.Space) {
						burn(map.tile(player.x + cmd.x, player.y + cmd.y));
						burn(map.tile(player.x + cmd.x * 2, player.y + cmd.y * 2));
						const speed = 0.006 + random() * 0.004 - 0.002;
						const startX = player.x + 0.75;
						const startY = player.y + 0.75;
						const shootAngle = (Math.atan2(cmd.y, cmd.x) + PI * 2);
						for (let i = 0; i < 10; i++) {
							const angle = shootAngle - 0.2 + i * 0.04;
							const size = abs(4.5 - i) * 2 + 2;
							particles.push({
								x: startX, y: startY,
								vx: cos(angle) * speed * (random() * 0.3 + 0.85),
								vy: sin(angle) * speed * (random() * 0.3 + 0.85) - 0.0005,
								size,
								ttl: 450,
								color: size < 7 ? '#f4a741' : size < 10? '#d6824b' : '#d64b4b',
							});
						}
					} else if (player.transition == 1.0) {
						const nextTile = map.tile(player.x + cmd.x, player.y + cmd.y);
						let canEnter = !nextTile.wall && !nextTile.blockade && map.inBounds(nextTile.x, nextTile.y);
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
								} else if (movableNextTile.wall || !map.inBounds(movableNextTile.x, movableNextTile.y) || findEntity(movableNextTile)?.group == 'unicorn') {
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
				if (abs(deltaX) >= abs(deltaY)) {
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

}

initLevel(levelCounter);