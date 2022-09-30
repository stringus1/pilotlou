const enemyData = [{}];

type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

interface Vec2 {
  x: number;
  y: number;
}

class Rect {
  position: Vec2;
  dimensions: Vec2;
  color: string;

  get top() {
    return this.position.y - this.dimensions.y / 2;
  }

  get right() {
    return this.position.x + this.dimensions.x / 2;
  }

  get bottom() {
    return this.position.y + this.dimensions.y / 2;
  }

  get left() {
    return this.position.x - this.dimensions.x / 2;
  }

  constructor(position: Vec2, dimensions: Vec2, color: string) {
    this.position = position;
    this.dimensions = dimensions;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.position.x - this.dimensions.x / 2,
      this.position.y - this.dimensions.y / 2,
      this.dimensions.x,
      this.dimensions.y
    );
  }

  collidesWith(other: Rect) {
    return (
      this.left < other.right &&
      this.right > other.left &&
      this.top < other.bottom &&
      this.bottom > other.top
    );
  }

  containsPoint(point: Vec2) {
    return (
      this.left < point.x &&
      this.right > point.x &&
      this.top < point.y &&
      this.bottom > point.y
    );
  }
}

class Enemy extends Rect {
  direction: Vec2;
  constructor(position: Vec2, dimensions: Vec2, direction: Vec2) {
    super(position, dimensions, "darkblue");
    this.direction = direction;
  }
}

class Player extends Rect {
  constructor(position: Vec2, dimensions: Vec2) {
    super(position, dimensions, "darkred");
  }
}

class Game {
  player: Player;
  enemies: Enemy[];
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  renderFrameId: number;
  gameInterval: number;
  speed: number;
  startTime: number;
  lastTick: number;
  pauseTime: number;
  bestTime: number;
  lastElapsedTime: number;
  state: "playing" | "gameover" | "waiting" | "paused";

  get elapsedTime() {
    return (
      (this.state === "playing" ? new Date().getTime() : this.pauseTime) -
      this.startTime
    );
  }

  get dimensions(): Vec2 {
    return { x: this.canvas.width, y: this.canvas.height };
  }

  set dimensions(d: Vec2) {
    [this.canvas.width, this.canvas.height] = [d.x, d.y];
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.newGameState();

    this.speed = 80;
    this.bestTime = 0;
  }

  newGameState() {
    this.player = new Player(
      { x: this.dimensions.x / 2, y: this.dimensions.y / 2 },
      { x: 40, y: 40 }
    );

    this.enemies = [
      new Enemy({ x: 300, y: 85 }, { x: 60, y: 50 }, { x: -10, y: 12 }),
      new Enemy({ x: 350, y: 340 }, { x: 100, y: 20 }, { x: -12, y: -20 }),
      new Enemy({ x: 85, y: 350 }, { x: 30, y: 60 }, { x: 15, y: -13 }),
      new Enemy({ x: 100, y: 100 }, { x: 60, y: 60 }, { x: 17, y: 11 }),
    ];

    this.state = "waiting";
  }

  updateSpeed() {
    let gametime = 80 * 100;
    if (this.elapsedTime < gametime) {
      this.speed = 80;
    } else if (this.elapsedTime < (gametime += 60 * 100)) {
      this.speed = 60;
    } else if (this.elapsedTime < (gametime += 40 * 100)) {
      this.speed = 40;
    } else if (this.elapsedTime < (gametime += 30 * 100)) {
      this.speed = 30;
    } else if (this.elapsedTime < (gametime += 20 * 100)) {
      this.speed = 20;
    }
  }

  renderTick() {
    const { ctx, player, enemies } = this;
    const elapsedTime = this.elapsedTime;
    if (this.state === "playing") {
      this.lastElapsedTime = elapsedTime;
      this.bestTime = Math.max(this.bestTime, elapsedTime || 0);
    }
    ctx.clearRect(0, 0, this.dimensions.x, this.dimensions.y);
    ctx.fillStyle = "white";
    ctx.fillRect(50, 50, this.dimensions.x - 100, this.dimensions.y - 100);
    for (const rect of [...enemies, player]) {
      rect.draw(ctx);
    }
    ctx.font = "30px Monospace";
    ctx.fillStyle = "green";
    const seconds = (this.lastElapsedTime / 1000 || 0).toFixed(3);
    ctx.fillText(`Time ${seconds}`, 25, 35);
    ctx.fillStyle = "red";
    const best = (this.bestTime / 1000 || 0).toFixed(3);
    ctx.fillText(`Best ${best}`, 260, 35);
    if (this.state === "gameover") {
      ctx.font = "50px Monospace";
      ctx.fillStyle = "red";
      ctx.fillText("Ded", 100, 200);
      ctx.font = "30px Monospace";
      ctx.fillStyle = "red";
      ctx.fillText("Click to start over.", 63, 435);
    } else if (this.state === "waiting") {
      ctx.font = "30px Monospace";
      ctx.fillStyle = "green";
      ctx.fillText("Click red guy to start!", 40, 435);
    } else if (this.state === "paused") {
      ctx.font = "30px Monospace";
      ctx.fillStyle = "red";
      ctx.fillText("Click red guy to resume!", 40, 435);
    } else if (this.state === "playing") {
      ctx.font = "30px Monospace";
      ctx.fillStyle = "gray";
      ctx.fillText("Click to pause!", 110, 435);
    }
  }

  renderLoop() {
    if (this.state === "playing") {
      this.gameTick();
      this.renderTick();
      this.renderFrameId = requestAnimationFrame(() => this.renderLoop());
    }
  }

  gameTick() {
    const now = new Date().getTime();
    const delta = now - this.lastTick;
    const { player, enemies } = this;
    for (const enemy of enemies) {
      enemy.position.x += (enemy.direction.x * delta) / this.speed;
      enemy.position.y += (enemy.direction.y * delta) / this.speed;
      if (enemy.left < 0 && enemy.direction.x < 0) {
        enemy.direction.x *= -1;
      } else if (enemy.right > this.dimensions.x && enemy.direction.x > 0) {
        enemy.direction.x *= -1;
      }
      if (enemy.top < 0 && enemy.direction.y < 0) {
        enemy.direction.y *= -1;
      } else if (enemy.bottom > this.dimensions.y && enemy.direction.y > 0) {
        enemy.direction.y *= -1;
      }
    }
    if (this.checkCollisions()) {
      this.state = "gameover";
      this.stop();
    }
    this.lastTick = now;
    this.updateSpeed();
  }

  checkCollisions() {
    const { player, enemies } = this;
    if (
      player.left < 50 ||
      player.right > this.dimensions.x - 50 ||
      player.top < 50 ||
      player.bottom > this.dimensions.y - 50
    ) {
      return true;
    }
    return enemies.some((enemy) => player.collidesWith(enemy));
  }

  start() {
    this.lastTick = new Date().getTime();
    this.renderLoop();
    // this.gameInterval = setInterval(() => this.gameTick(), 1000 / 120);

    this.canvas.onmousemove = (e) => {
      if (this.state === "playing") {
        this.player.position.x = e.offsetX;
        this.player.position.y = e.offsetY;
      }
    };
  }

  stop() {
    // clearInterval(this.gameInterval);
    cancelAnimationFrame(this.renderFrameId);
  }
}

function setup() {
  const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
  if (canvas === null) {
    throw new Error("No canvas element found");
  }

  let game = (window["game"] = new Game(canvas));
  game.renderTick();

  window.onclick = (e) => {
    const now = new Date().getTime();
    if (game.state === "waiting") {
      if (game.player.containsPoint({ x: e.offsetX, y: e.offsetY })) {
        game.state = "playing";
        game.startTime = now;
        game.pauseTime = null;
        game.start();
      }
    } else if (game.state === "playing") {
      game.state = "paused";

      game.pauseTime = now;
      game.stop();
      game.renderTick();
    } else if (game.state === "paused") {
      if (game.player.containsPoint({ x: e.offsetX, y: e.offsetY })) {
        game.state = "playing";
        game.startTime += now - game.pauseTime;
        game.lastTick = now;
        game.start();
      }
    } else if (game.state === "gameover") {
      game.state = "waiting";
      game.startTime = now;
      game.newGameState();
      game.renderTick();
    }
  };
}

window.onload = setup;
