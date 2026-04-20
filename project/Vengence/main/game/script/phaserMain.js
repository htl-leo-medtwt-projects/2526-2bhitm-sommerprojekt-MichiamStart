const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  physics: { default: "arcade" },
  scene: { preload, create, update },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.spritesheet("player", "assets/sprites/player/Enemy-Melee-Idle-S.png", {
    frameWidth: 256,
    frameHeight: 256
  });
  this.load.image("DungeonTiles", "assets/worldData/dungeon/Dungeon_Tiles.png");
  this.load.image("DungeonTile", "assets/worldData/dungeon/Dungeon_Tile.png");
  this.load.tilemapTiledJSON("map", "assets/worldData/dungeon/dungeon.tmj");
}

function create() {

  this.anims.create({
    key: "idle",
    frames: this.anims.generateFrameNumbers("player", {
      start: 0,
      end: 12
    }),
    frameRate: 6,
    repeat: -1
  });

  const map = this.make.tilemap({ key: "map" });

  const tilesets = [
    map.addTilesetImage("Dungeon_Tiles", "DungeonTiles"),
    map.addTilesetImage("Dungeon_Tile", "DungeonTile")
  ];

  const ground = map.createLayer("Boden", tilesets, 0, 0);
  const deco = map.createLayer("Deko", tilesets, 0, 0);
  const walls = map.createLayer("Wände", tilesets, 0, 0);

  walls.setCollisionByExclusion([-1]);

  this.player = this.physics.add.sprite(400, 300, "player");
  this.player.setScale(0.25);
  this.player.body.setSize(this.player.width * 0.4, this.player.height * 0.6);
  this.player.play("idle");
  this.physics.add.collider(this.player, walls);
  this.player.setDrag(1000);

  this.cameras.main.startFollow(this.player);
  this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  this.cameras.main.setZoom(2);

  this.cursors = this.input.keyboard.createCursorKeys();
}

let prePressed = "left";

function update() {
  const speed = 80;
  if (prePressed === "left") {
    if (this.cursors.right.isDown) { this.player.setVelocityX(speed); } else
      if (this.cursors.left.isDown) { this.player.setVelocityX(-speed); }
    if (this.cursors.up.isDown) { this.player.setVelocityY(-speed); }
    if (this.cursors.down.isDown) { this.player.setVelocityY(speed); }
  }
  if (prePressed === "right") {
    if (this.cursors.left.isDown) { this.player.setVelocityX(-speed); } else
      if (this.cursors.right.isDown) { this.player.setVelocityX(speed); }
    if (this.cursors.up.isDown) { this.player.setVelocityY(-speed); }
    if (this.cursors.down.isDown) { this.player.setVelocityY(speed); }
  }
  if (prePressed === "up") {
    if (this.cursors.down.isDown) { this.player.setVelocityY(speed); } else
      if (this.cursors.up.isDown) { this.player.setVelocityY(-speed); }
    if (this.cursors.left.isDown) { this.player.setVelocityX(-speed); }
    if (this.cursors.right.isDown) { this.player.setVelocityX(speed); }
  }
  if (prePressed === "down") {
    if (this.cursors.up.isDown) { this.player.setVelocityY(-speed); } else
      if (this.cursors.down.isDown) { this.player.setVelocityY(speed); }
    if (this.cursors.left.isDown) { this.player.setVelocityX(-speed); }
    if (this.cursors.right.isDown) { this.player.setVelocityX(speed); }
  }
  if (Phaser.Input.Keyboard.JustUp(this.cursors.left)) {
    prePressed = "left";
  }
  if (Phaser.Input.Keyboard.JustUp(this.cursors.right)) {
    prePressed = "right";
  }
  if (Phaser.Input.Keyboard.JustUp(this.cursors.up)) {
    prePressed = "up";
  }
  if (Phaser.Input.Keyboard.JustUp(this.cursors.down)) {
    prePressed = "down";
  }
}
