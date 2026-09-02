console.log("yednorosh");

class Tile {}

class Entity {
	constructor(group = '') {
		this.group = group;
		this.x = 0;
		this.y = 0;
	}
	update(map) {
		// map.tile(this.x, this.y)
	}
}

const player = new Entity('player');
const entities = [player];
const bullets = [];


const npc = new Entity()
npc.x = 10;
entities.push(npc);

for (let i = 0; i < 3; i++) {
	const npc = new Entity('unicorn')
	npc.x = 3 + i * 2;
	entities.push(npc);
}

class Weapon {}
const TILE_SIZE = 50;
const HALF_TILE_SIZE = TILE_SIZE / 2;
const FULL_FIRE = 4;

const canvas = document.querySelector("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

function renderTile(x, y, tile) {
	let color = '#333';
	if (tile.fire == 1) {
		color = '#632';
	} else if (tile.fire == 2) {
		color = '#843';
	} else if (tile.fire == 3) {
		color = '#d86';
	} else if (tile.fire == 4) {
		color = '#fa7';
	}
	if (tile.wall) {
		color = '#aaa';
	}

	ctx.fillStyle = 'black';
	ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
		const entitiesOnTile = entities.find(e => e.x == this.x && e.y == this.y);
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

map.tile(2, 3).fire = 1;
map.tile(3, 3).fire = FULL_FIRE;
map.tile(4, 3).fire = FULL_FIRE;
map.tile(5, 3).fire = FULL_FIRE;
map.tile(5, 5).fire = FULL_FIRE;


for (let x = 3; x < 10; x++) {
	map.tile(x, 10).wall = true;
}
for (let y = 3; y <= 10; y++) {
	map.tile(10, y).wall = true;
}


map.tile(2, 2).fire = 3;
map.tile(3, 2).fire = 1;
// map.tile(3, 3).fire = 1;
map.tile(7, 1).fire = 3;
map.tile(6, 2).flammable = true;


function renderEntity(entity) {
	const color = entity.group == 'player'? 'black' : entity.group == 'unicorn'? 'pink': 'grey';
	ctx.fillStyle = color;
	const size = 16;
	const {x, y} = entity;
	ctx.fillRect(x * TILE_SIZE + HALF_TILE_SIZE - size / 2, y * TILE_SIZE + HALF_TILE_SIZE - size / 2, size, size);
}

function renderBullet(obj) {
	const color = 'yellow';
	ctx.fillStyle = color;
	const size = 4;
	const {x, y} = obj;
	ctx.fillRect(~~(x * TILE_SIZE + HALF_TILE_SIZE - size / 2), ~~(y * TILE_SIZE + HALF_TILE_SIZE - size / 2), size, size);

}

function render(delta) {
	for (let y = 0; y < map.height; y++) {
		for (let x = 0; x < map.width; x++) {
			renderTile(x, y, map.tile(x, y));
		}
	}
	entities.forEach(entity => {
		renderEntity(entity);
	});
	bullets.forEach(bullet => {
		console.log(bullet);
		bullet.x += bullet.vx * 0.1;
		bullet.y += bullet.vy * 0.1;
		renderBullet(bullet);
	});
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

	// for (let i = 0; i < 3; i++) {
	// 	const x = ~~(Math.random() * map.width);
	// 	const y = ~~(Math.random() * map.height);
	// 	map.tile(x, y).fire = FULL_FIRE;
	// }

}, 500);

const keymap = {
	'ArrowLeft': {x: -1, y: 0},
	'ArrowRight': {x: +1, y: 0},
	'ArrowDown': {x: 0, y: 1},
	'ArrowUp': {x: 0, y: -1},
	'Space': 'fire',
	'ControlLeft': 'shoot',
}
document.addEventListener('keydown', e => {
	console.log(e.code);
	if (Object.hasOwn(keymap, e.code)) {
		console.log("EE")
		const cmd = keymap[e.code];
		switch (cmd) {
			case 'shoot':
				// map.tile(player.x + 1, player.y).fire = FULL_FIRE;
				const bullet = {x: player.x, y: player.y, vx: 1, vy: 0};
				bullets.push(bullet);
				break;
			case 'fire':
				map.tile(player.x + 1, player.y).fire = FULL_FIRE;
				break;
			default:
				const nextTile = map.tile(player.x + cmd.x, player.y + cmd.y);
				if (nextTile.fire == 0 && !nextTile.wall) {
					player.x += cmd.x;
					player.y += cmd.y;
				}
		}
		e.preventDefault();
	}
});