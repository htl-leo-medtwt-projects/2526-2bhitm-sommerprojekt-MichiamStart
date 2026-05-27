const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  parent: 'game',
  physics: { default: "arcade" },
  scene: { preload, create, update },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

document.addEventListener("click", () => {
  document.getElementById("backgroundMusic").play()
});

const game = new Phaser.Game(config);

let lastDir = "S";
let lastDiagDir = null;
let diagReleasedAt = null;
const DIAGONAL_RELEASE_DELAY = 120;

let lastHorizontal = null;
let lastVertical = null;

let walkVolume = 0;

function preload() {
  this.load.spritesheet("idle-S", "assets/sprites/player/Enemy-Melee-Idle-S.png", { frameWidth: 256, frameHeight: 256 });
  this.load.spritesheet("idle-N", "assets/sprites/player/Enemy-Melee-Idle-N.png", { frameWidth: 256, frameHeight: 256 });
  this.load.spritesheet("idle-E", "assets/sprites/player/Enemy-Melee-Idle-E.png", { frameWidth: 256, frameHeight: 256 });
  this.load.spritesheet("idle-W", "assets/sprites/player/Enemy-Melee-Idle-W.png", { frameWidth: 256, frameHeight: 256 });
  this.load.spritesheet("idle-NE", "assets/sprites/player/Enemy-Melee-Idle-NE.png", { frameWidth: 256, frameHeight: 256 });
  this.load.spritesheet("idle-NW", "assets/sprites/player/Enemy-Melee-Idle-NW.png", { frameWidth: 256, frameHeight: 256 });
  this.load.spritesheet("idle-SE", "assets/sprites/player/Enemy-Melee-Idle-SE.png", { frameWidth: 256, frameHeight: 256 });
  this.load.spritesheet("idle-SW", "assets/sprites/player/Enemy-Melee-Idle-SW.png", { frameWidth: 256, frameHeight: 256 });
  this.load.spritesheet("idle-SW", "assets/sprites/player/Enemy-Melee-Death.png", { frameWidth: 256, frameHeight: 256 });
  this.load.spritesheet("idle-SW", "assets/sprites/player/Enemy-Melee-Idle-SW.png", { frameWidth: 256, frameHeight: 256 });

  this.load.image("DungeonTiles", "assets/worldData/dungeon/Dungeon_Tiles.png");
  this.load.image("DungeonTile", "assets/worldData/dungeon/Dungeon_Tile.png");
  this.load.tilemapTiledJSON("map", "assets/worldData/dungeon/dungeon.tmj");

  this.load.audio("walk", "assets/sounds/effects/walkingWind.mp3");
  this.load.json("quests", "assets/worldData/quests.json");
}

function create() {
  this.anims.create({ key: "idle-S", frames: this.anims.generateFrameNumbers("idle-S", { start: 0, end: 12 }), frameRate: 6, repeat: -1 });
  this.anims.create({ key: "idle-N", frames: this.anims.generateFrameNumbers("idle-N", { start: 0, end: 12 }), frameRate: 6, repeat: -1 });
  this.anims.create({ key: "idle-E", frames: this.anims.generateFrameNumbers("idle-E", { start: 0, end: 12 }), frameRate: 6, repeat: -1 });
  this.anims.create({ key: "idle-W", frames: this.anims.generateFrameNumbers("idle-W", { start: 0, end: 12 }), frameRate: 6, repeat: -1 });
  this.anims.create({ key: "idle-NE", frames: this.anims.generateFrameNumbers("idle-NE", { start: 0, end: 12 }), frameRate: 6, repeat: -1 });
  this.anims.create({ key: "idle-NW", frames: this.anims.generateFrameNumbers("idle-NW", { start: 0, end: 12 }), frameRate: 6, repeat: -1 });
  this.anims.create({ key: "idle-SE", frames: this.anims.generateFrameNumbers("idle-SE", { start: 0, end: 12 }), frameRate: 6, repeat: -1 });
  this.anims.create({ key: "idle-SW", frames: this.anims.generateFrameNumbers("idle-SW", { start: 0, end: 12 }), frameRate: 6, repeat: -1 });

  const map = this.make.tilemap({ key: "map" });
  console.log(map.tilesets);
  const tilesets = [
    map.addTilesetImage("Dungeon_Tiles", "DungeonTiles"),
    map.addTilesetImage("Dungeon_Tile", "DungeonTile")
  ];

  const floor = map.createLayer("Boden", tilesets, 0, 0);
  const floorTop = map.createLayer("BodenTop", tilesets, 0, 0);
  const walls = map.createLayer("Wände", tilesets, 0, 0);

  walls.setCollisionByExclusion([-1]);

  this.player = this.physics.add.sprite(640, 1100, "idle-S");
  this.player.setScale(0.22);
  this.player.body.setSize(this.player.width * 0.3, this.player.height * 0.05);
  this.player.body.setOffset(this.player.width * 0.32, this.player.height * 0.7);
  this.player.play("idle-S");

  this.physics.add.collider(this.player, walls);
  this.player.setDrag(1000);

  floor.setDepth(0);
  walls.setDepth(1);
  this.player.setDepth(2);
  floorTop.setDepth(4);
  
  this.cameras.main.startFollow(this.player);
  this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  this.cameras.main.setZoom(2);

  this.cursors = this.input.keyboard.createCursorKeys();

  this.cursors.left.on("down", () => { lastHorizontal = "left"; });
  this.cursors.right.on("down", () => { lastHorizontal = "right"; });
  this.cursors.up.on("down", () => { lastVertical = "up"; });
  this.cursors.down.on("down", () => { lastVertical = "down"; });

  this.cursors.left.on("up", () => { if (lastHorizontal === "left") lastHorizontal = this.cursors.right.isDown ? "right" : null; });
  this.cursors.right.on("up", () => { if (lastHorizontal === "right") lastHorizontal = this.cursors.left.isDown ? "left" : null; });
  this.cursors.up.on("up", () => { if (lastVertical === "up") lastVertical = this.cursors.down.isDown ? "down" : null; });
  this.cursors.down.on("up", () => { if (lastVertical === "down") lastVertical = this.cursors.up.isDown ? "up" : null; });

  this.walkSound = this.sound.add("walk", { loop: true, volume: 0 });

  this.input.once("pointerdown", () => {
    this.walkSound.play();
  });

  this.quests = this.cache.json.get("quests");
  this.questMarkers = this.add.group();
  this.activeQuest = null;

  this.quests.forEach(quest => {
    if (!quest.completed) {
      const marker = this.add.circle(quest.x, quest.y, 15, 0xffff00);
      marker.setStrokeStyle(2, 0xff0000);
      marker.questId = quest.id;
      marker.questName = quest.name;
      this.questMarkers.add(marker);
    }
  });

  this.input.keyboard.on("keydown-SPACE", () => {
    if (this.activeQuest) {
      const questIndex = this.quests.findIndex(q => q.id === this.activeQuest);
      if (questIndex !== -1) {
        this.quests[questIndex].completed = true;
        updateQuestsFile(this.quests);
        const marker = this.questMarkers.getChildren().find(m => m.questId === this.activeQuest);
        if (marker) {
          marker.destroy();
        }
        this.activeQuest = null;
      }
    }
  });

  this.questArrow = this.add.triangle(window.innerWidth / 2, 30, 0, 0, -12, 25, 12, 25, 0xff00ff);
  this.questArrow.setDepth(1000);
  this.questArrow.setScrollFactor(0);
  this.questArrow.setVisible(false);

  //DEBUG
  this.coordText = this.add.text(20, 20, "", {
  fontSize: "16px",
  fill: "#ffffff",
  backgroundColor: "#000000"
});

this.coordText.setScrollFactor(0);
this.coordText.setDepth(1001);
}

function update() {
  const speed = 80;
  const now = this.time.now;

  let vx = 0;
  let vy = 0;

  if (lastHorizontal === "left") vx = -speed;
  else if (lastHorizontal === "right") vx = speed;

  if (lastVertical === "up") vy = -speed;
  else if (lastVertical === "down") vy = speed;

  this.player.setVelocity(vx, vy);

  const moving = vx !== 0 || vy !== 0;
  const isDiagonalInput = vx !== 0 && vy !== 0;

  if (isDiagonalInput) {
    if (vx > 0 && vy < 0) lastDir = "NW";
    else if (vx < 0 && vy < 0) lastDir = "NE";
    else if (vx > 0 && vy > 0) lastDir = "SE";
    else if (vx < 0 && vy > 0) lastDir = "SW";
    lastDiagDir = lastDir;
    diagReleasedAt = null;
  } else if (moving) {
    if (lastDiagDir !== null && diagReleasedAt === null) {
      diagReleasedAt = now;
    }
    if (diagReleasedAt === null || (now - diagReleasedAt) > DIAGONAL_RELEASE_DELAY) {
      if (vx > 0) lastDir = "E";
      else if (vx < 0) lastDir = "W";
      else if (vy > 0) lastDir = "S";
      else if (vy < 0) lastDir = "N";
      lastDiagDir = null;
      diagReleasedAt = null;
    } else {
      lastDir = lastDiagDir;
    }
  } else {
    if (lastDiagDir !== null && diagReleasedAt === null) {
      diagReleasedAt = now;
    }
    if (diagReleasedAt !== null && (now - diagReleasedAt) > DIAGONAL_RELEASE_DELAY) {
      lastDiagDir = null;
      diagReleasedAt = null;
    } else if (lastDiagDir !== null) {
      lastDir = lastDiagDir;
    }
  }

  this.player.play("idle-" + lastDir, true);

  let targetVolume;

  if (moving) {
    targetVolume = 0.4;
  } else {
    targetVolume = 0.1;
  }

  if (walkVolume < targetVolume) {
    walkVolume += 0.02;
    if (walkVolume > targetVolume) {
      walkVolume = targetVolume;
    }
  } else if (walkVolume > targetVolume) {
    walkVolume -= 0.02;
    if (walkVolume < targetVolume) {
      walkVolume = targetVolume;
    }
  }

  this.walkSound.setVolume(walkVolume);

  const proximityRange = 50;
  let nearestMarker = null;
  let nearestDistance = proximityRange;

  //DEBUG
  this.questMarkers.getChildren().forEach(marker => {
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, marker.x, marker.y);
    if (distance < proximityRange) {
      marker.setStrokeStyle(3, 0x00ff00);
      marker.setFillStyle(0xffff00);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestMarker = marker;
      }
    } else {
      marker.setStrokeStyle(2, 0xff0000);
      marker.setFillStyle(0xffff00);
    }
  });

  this.activeQuest = nearestMarker ? nearestMarker.questId : null;
}

async function updateQuestsFile(quests) {
  try {
    const response = await fetch("assets/worldData/quests.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(quests)
    });
  } catch (error) {
    console.log("Could not save quests:", error);
  }
  

}
