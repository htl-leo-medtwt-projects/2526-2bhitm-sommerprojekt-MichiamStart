const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: { default: "arcade" },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image("player", "../assets/sprites/placeholderPlayer.png");
}

function create() {
  this.player = this.physics.add.sprite(400, 300, "player");
}

function update() {
  const speed = 2;
  if (this.input.keyboard.isDown("LEFT")) this.player.x -= speed;
  if (this.input.keyboard.isDown("RIGHT")) this.player.x += speed;
  if (this.input.keyboard.isDown("UP")) this.player.y -= speed;
  if (this.input.keyboard.isDown("DOWN")) this.player.y += speed;
}