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
window.game = game;
window.restartGame = function() {
  if (typeof clearLocalSaveState === "function") {
    clearLocalSaveState();
  }

  if (!window.game || !window.game.scene) {
    return;
  }

  const activeScenes = window.game.scene.getScenes(true);
  const sceneToRestart = activeScenes.length ? activeScenes[0] : window.game.scene.getScenes(false)[0];
  if (sceneToRestart && sceneToRestart.scene && typeof sceneToRestart.scene.restart === "function") {
    sceneToRestart.scene.restart();
  }
};

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

  this.load.image("enemy-sprite", "assets/sprites/opponents/opponent.png");
  this.load.image("quest-sprite", "assets/sprites/opponents/quest.png");

  this.load.image("DungeonTiles", "assets/worldData/dungeon/Dungeon_Tiles.png");
  this.load.image("DungeonTile", "assets/worldData/dungeon/Dungeon_Tile.png");
  this.load.tilemapTiledJSON("map", "assets/worldData/dungeon/dungeon.tmj");

  this.load.audio("walk", "assets/sounds/effects/walkingWind.mp3");
  this.load.json("quests", "assets/worldData/quests.json");
  this.load.json("enemyData", "assets/worldData/dungeon/enemies.json");
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
  this.walls = walls;

  this.player = this.physics.add.sprite(640, 1100, "idle-S");
  this.player.setScale(0.22);
  this.player.body.setSize(this.player.width * 0.3, this.player.height * 0.05);
  this.player.body.setOffset(this.player.width * 0.32, this.player.height * 0.7);
  this.player.play("idle-S");

  this.physics.add.collider(this.player, walls);
  this.player.setDrag(1000);

  this.playerStart = { x: 640, y: 1100 };
  this.enemyData = JSON.parse(JSON.stringify(this.cache.json.get("enemyData")));
  this.enemies = [];
  this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  const walkableGrid = buildWalkableGrid(map, walls);
  this.map = map;
  this.walkableGrid = walkableGrid;

  const savedState = loadLocalSaveState();
  if (savedState) {
    if (savedState.removedEnemyIds && Array.isArray(savedState.removedEnemyIds) && this.enemyData?.enemies) {
      this.enemyData.enemies.forEach(enemy => {
        enemy.removed = savedState.removedEnemyIds.includes(enemy.id);
      });
    }
    if (savedState.playerPosition && Number.isFinite(Number(savedState.playerPosition.x)) && Number.isFinite(Number(savedState.playerPosition.y))) {
      this.playerStart = {
        x: Number(savedState.playerPosition.x),
        y: Number(savedState.playerPosition.y)
      };
      this.player.setPosition(this.playerStart.x, this.playerStart.y);
      if (this.player.body) {
        this.player.body.reset(this.playerStart.x, this.playerStart.y);
      }
    }
  }

  if (this.enemyData?.enemies) {
    loadEnemies(this);
  }

  floor.setDepth(0);
  walls.setDepth(1);
  this.player.setDepth(2);
  floorTop.setDepth(4);
  
  this.cameras.main.startFollow(this.player);
  this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  this.cameras.main.setZoom(2);

  this.cursors = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });

  this.cursors.left.on("down", () => { lastHorizontal = "left"; });
  this.cursors.right.on("down", () => { lastHorizontal = "right"; });
  this.cursors.up.on("down", () => { lastVertical = "up"; });
  this.cursors.down.on("down", () => { lastVertical = "down"; });

  this.cursors.left.on("up", () => { if (lastHorizontal === "left") lastHorizontal = this.cursors.right.isDown ? "right" : null; });
  this.cursors.right.on("up", () => { if (lastHorizontal === "right") lastHorizontal = this.cursors.left.isDown ? "left" : null; });
  this.cursors.up.on("up", () => { if (lastVertical === "up") lastVertical = this.cursors.down.isDown ? "down" : null; });
  this.cursors.down.on("up", () => { if (lastVertical === "down") lastVertical = this.cursors.up.isDown ? "up" : null; });

  if (typeof window.initializeDebugSpawner === "function") {
    window.initializeDebugSpawner(this);
  }

  this.walkSound = this.sound.add("walk", { loop: true, volume: 0 });

  this.input.once("pointerdown", () => {
    this.walkSound.play();
  });

  this.quests = JSON.parse(JSON.stringify(this.cache.json.get("quests")));
  this.questMarkers = this.add.group();
  this.activeQuest = null;

  if (savedState && Array.isArray(savedState.completedQuestIds)) {
    const completedQuestIds = new Set(savedState.completedQuestIds);
    this.quests.forEach(quest => {
      if (completedQuestIds.has(quest.id)) {
        quest.completed = true;
      }
    });
  }

  this.quests.forEach(quest => {
    if (!quest.completed) {
      const marker = this.add.image(quest.x, quest.y, "quest-sprite");
      marker.setScale(0.1);
      marker.setDepth(3);
      marker.questId = quest.id;
      marker.questName = quest.name;
      this.questMarkers.add(marker);
    }
  });

  // Track the game start time for finish timer
  this.gameStartTime = this.time.now;
  this.finishActive = false;

  this.saveStateEvent = this.time.addEvent({
    delay: 5000,
    loop: true,
    callback: saveLocalState,
    callbackScope: this
  });

  this.abilityCooldown = 7000;
  this.abilityCooldownEnd = 0;
  const abilityBoxWidth = 150;
  const abilityBoxHeight = 90;
  const abilityBoxX = this.scale.width - abilityBoxWidth - 20;
  const abilityBoxY = this.scale.height - abilityBoxHeight - 20;
  const abilityBackground = this.add.rectangle(abilityBoxX, abilityBoxY, abilityBoxWidth, abilityBoxHeight, 0x111111, 0.9).setOrigin(0);
  const abilityFill = this.add.rectangle(abilityBoxX + 4, abilityBoxY + abilityBoxHeight - 4, abilityBoxWidth - 8, abilityBoxHeight - 8, 0x00cc00, 0.8).setOrigin(0, 1);
  const abilityBorder = this.add.graphics();
  abilityBorder.lineStyle(2, 0xffffff, 1);
  abilityBorder.strokeRect(abilityBoxX, abilityBoxY, abilityBoxWidth, abilityBoxHeight);
  const abilityLabel = this.add.text(abilityBoxX + abilityBoxWidth / 2, abilityBoxY + abilityBoxHeight / 2, "Attack", {
    fontFamily: "Arial",
    fontSize: "18px",
    color: "#ffffff",
    fontStyle: "bold",
    align: "center"
  }).setOrigin(0.5);
  abilityBackground.setScrollFactor(0);
  abilityBorder.setScrollFactor(0);
  abilityFill.setScrollFactor(0);
  abilityLabel.setScrollFactor(0);
  abilityBackground.setDepth(9000);
  abilityBorder.setDepth(9001);
  abilityFill.setDepth(9002);
  abilityLabel.setDepth(9003);
  this.abilityUI = { fill: abilityFill, label: abilityLabel, boxX: abilityBoxX, boxY: abilityBoxY, boxWidth: abilityBoxWidth, boxHeight: abilityBoxHeight };

  this.input.keyboard.on("keydown-SPACE", () => {
    if (this.activeQuest) {
      const questIndex = this.quests.findIndex(q => q.id === this.activeQuest);
      if (questIndex !== -1) {
        this.quests[questIndex].completed = true;
        updateQuestsFile(this.quests);
        saveLocalState(this);
        const marker = this.questMarkers.getChildren().find(m => m.questId === this.activeQuest);
        if (marker) {
          marker.destroy();
        }
        this.activeQuest = null;
      }
    }
    const now = this.time.now;
    if (now >= this.abilityCooldownEnd) {
      let closestEnemy = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      let closestIndex = -1;
      this.enemies.forEach((enemy, index) => {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.circle.x, enemy.circle.y);
        if (distance <= enemy.attackRadiusPx && distance < closestDistance) {
          closestEnemy = enemy;
          closestDistance = distance;
          closestIndex = index;
        }
      });
      if (closestEnemy) {
        const targetX = closestEnemy.circle.x;
        const targetY = closestEnemy.circle.y;
        this.tweens.add({
          targets: this.player,
          x: targetX,
          y: targetY,
          duration: 50,
          ease: 'Linear',
          onComplete: () => {
            if (closestEnemy.debugDanger) closestEnemy.debugDanger.destroy();
            if (closestEnemy.debugChase) closestEnemy.debugChase.destroy();
            if (closestEnemy.debugAttack) closestEnemy.debugAttack.destroy();
            if (closestEnemy.circle) closestEnemy.circle.destroy();
            this.enemies.splice(closestIndex, 1);
            if (this.player.body) {
              this.player.body.reset(targetX, targetY);
              this.player.body.setVelocity(0, 0);
            }
            if (closestEnemy) {
              const attackSound = document.getElementById("attackSound");
              if (attackSound) {
                attackSound.currentTime = 0;
                attackSound.play().catch(() => {});
              }
            }
            if (this.enemyData && Array.isArray(this.enemyData.enemies)) {
              const eIndex = this.enemyData.enemies.findIndex(e => e.id === closestEnemy.id);
              if (eIndex !== -1) {
                this.enemyData.enemies[eIndex].removed = true;
                if (typeof updateEnemiesFile === 'function') {
                  updateEnemiesFile(this.enemyData.enemies);
                }
                saveLocalState(this);
              }
            }
          }
        });
        this.abilityCooldownEnd = now + this.abilityCooldown;
        return;
      }
    }
  });

  this.questArrow = this.add.triangle(window.innerWidth / 2, 30, 0, 0, -12, 25, 12, 25, 0xff00ff);
  this.questArrow.setDepth(1000);
  this.questArrow.setScrollFactor(0);
  this.questArrow.setVisible(false);

  const overlayWidth = this.scale.width;
  const overlayHeight = this.scale.height;
  const overlayBackground = this.add.rectangle(0, 0, overlayWidth, overlayHeight, 0x000000, 0.85).setOrigin(0);
  const overlayText = this.add.text(overlayWidth / 2, overlayHeight / 2, "GAME OVER. Restarting...", {
    fontFamily: "Arial",
    fontSize: "38px",
    color: "#ffffff",
    fontStyle: "bold",
    align: "center",
    stroke: "#000000",
    strokeThickness: 8
  }).setOrigin(0.5);

  this.gameOverOverlay = this.add.container(0, 0, [overlayBackground, overlayText]);
  this.gameOverOverlay.setScrollFactor(0);
  this.gameOverOverlay.setDepth(10000);
  this.gameOverOverlay.setAlpha(0);
  this.gameOverOverlay.setVisible(false);
  this.gameOverActive = false;

  const finishBg = this.add.rectangle(0, 0, overlayWidth, overlayHeight, 0x000000, 0.85).setOrigin(0);
  const finishTitle = this.add.text(overlayWidth / 2, overlayHeight / 2 - 60, "YOU FINISHED", {
    fontFamily: "Arial",
    fontSize: "48px",
    color: "#ffffff",
    fontStyle: "bold",
    align: "center",
    stroke: "#000000",
    strokeThickness: 8
  }).setOrigin(0.5);

  const finishTimeText = this.add.text(overlayWidth / 2, overlayHeight / 2, "Time: 00:00", {
    fontFamily: "Arial",
    fontSize: "32px",
    color: "#ffffff",
    align: "center",
    stroke: "#000000",
    strokeThickness: 6
  }).setOrigin(0.5);

  const btnW = 240;
  const btnH = 60;
  const btnX = overlayWidth / 2 - btnW / 2;
  const btnY = overlayHeight / 2 + 80;
  const resetRect = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0x00aa00, 1).setOrigin(0.5);
  const resetText = this.add.text(overlayWidth / 2, btnY + btnH / 2, "YOU MOVED ON!!!", { fontFamily: "Arial", fontSize: "24px", color: "#ffffff" }).setOrigin(0.5);
  resetRect.setInteractive({ useHandCursor: true });
  resetRect.on('pointerdown', () => {
    clearLocalSaveState();
    this.scene.restart();
  });

  this.finishOverlay = this.add.container(0, 0, [finishBg, finishTitle, finishTimeText, resetRect, resetText]);
  this.finishOverlay.setScrollFactor(0);
  this.finishOverlay.setDepth(10001);
  this.finishOverlay.setVisible(false);
  this.finishTimeText = finishTimeText;

  this.coordElement = document.getElementById("coordinateDisplay");
}

function update() {
  const speed = 80;
  const now = this.time.now;

  // Fallback: Start game music if any key is pressed and music hasn't started yet
  if (typeof window.gameMusicStarted === 'function' && !window.gameMusicStarted()) {
    if (typeof window.startGameMusic === 'function') {
      window.startGameMusic();
    }
  }

  let vx = 0;
  let vy = 0;

  if (this.gameOverActive || this.finishActive) {
    lastHorizontal = null;
    lastVertical = null;
    this.player.setVelocity(0, 0);
  }

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
  if (this.coordElement) {
    const playerCenter = this.player.body ? this.player.body.center : this.player;
    this.coordElement.textContent = `${Math.round(playerCenter.x)}, ${Math.round(playerCenter.y)}`;
  }
  // Update ability UI (DOM overlay)
  const domFill = document.getElementById('ability-fill');
  const domLabel = document.getElementById('ability-label');
  if (domFill && domLabel) {
    const ready = now >= this.abilityCooldownEnd;
    const percent = ready ? 1 : Phaser.Math.Clamp((now - (this.abilityCooldownEnd - this.abilityCooldown)) / this.abilityCooldown, 0, 1);
    // fill from bottom to top; 100% when ready, 0% just after use
    domFill.style.transform = `scaleY(${percent})`;
    // color: red when ready, grey when recharging
    domFill.style.background = ready ? '#ff0000' : '#888888';
    // label stays constant
    domLabel.textContent = 'Attack';
  }
  updateEnemies(this);

  const proximityRange = 50;
  let nearestMarker = null;
  let nearestDistance = proximityRange;

  this.questMarkers.getChildren().forEach(marker => {
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, marker.x, marker.y);
    if (distance < proximityRange) {
      marker.setTint(0x00ff88);
      marker.setScale(0.12);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestMarker = marker;
      }
    } else {
      marker.clearTint();
      marker.setScale(0.1);
    }
  });

  this.activeQuest = nearestMarker ? nearestMarker.questId : null;

  // Check finish condition: all quests completed
  if (!this.finishActive && this.quests && this.quests.length > 0) {
    const allDone = this.quests.every(q => q.completed === true);
    if (allDone) {
      this.finishActive = true;
      // compute elapsed time
      const elapsedMs = now - (this.gameStartTime || now);
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
      const secs = (totalSeconds % 60).toString().padStart(2, '0');
      if (this.finishTimeText) this.finishTimeText.setText(`Time: ${mins}:${secs}`);
      if (this.finishOverlay) this.finishOverlay.setVisible(true);
    }
  }
}

function createEnemyFromConfig(scene, enemyConfig, index) {
  if (!scene || !enemyConfig) {
    return null;
  }

  const worldX = Number(enemyConfig.x);
  const worldY = Number(enemyConfig.y);
  if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
    return null;
  }

  const spawnTile = worldToTile(worldX, worldY, scene.map.tileWidth, scene.map.tileHeight);
  const safeTile = getNearestWalkableTile(scene.walkableGrid, spawnTile.x, spawnTile.y);
  const safeWorld = tileToWorld(safeTile.x, safeTile.y, scene.map.tileWidth, scene.map.tileHeight);
  const spawnPosition = { x: safeWorld.x, y: safeWorld.y };

  const type = enemyConfig.type || "basic";
  const detectionRadiusTiles = Number(enemyConfig.detectionRadius) || (type === "strong" ? 4.5 : 3);
  const chaseRadiusTiles = Number(enemyConfig.chaseRadius) || (type === "strong" ? 10.5 : 7);
  const attackRadiusTiles = Number(enemyConfig.attackRadius) || (type === "strong" ? 3.5 : 2.5);
  const placeholderRadius = Number(enemyConfig.placeholderRadius) || (type === "strong" ? 16 : 12);

  const scale = type === "strong" ? 0.12 : 0.09;
  const enemyCircle = scene.physics.add.image(spawnPosition.x, spawnPosition.y, "enemy-sprite");
  enemyCircle.setScale(scale);
  enemyCircle.setTint(type === "strong" ? 0xaa0000 : 0xff6666);
  enemyCircle.body.setCircle(
    placeholderRadius / scale,
    enemyCircle.width / 2 - placeholderRadius / scale,
    enemyCircle.height / 2 - placeholderRadius / scale
  );
  enemyCircle.body.setBounce(0.2);
  enemyCircle.body.setDrag(1000);
  enemyCircle.body.setAllowGravity(false);
  enemyCircle.setDepth(1.5);

  const enemy = {
    id: enemyConfig.id || `enemy-${index + 1}`,
    type,
    circle: enemyCircle,
    speed: Number(enemyConfig.speed) || (type === "strong" ? 80 : 70),
    detectionRadiusTiles,
    chaseRadiusTiles,
    attackRadiusTiles,
    detectionRadiusPx: detectionRadiusTiles * scene.map.tileWidth,
    chaseRadiusPx: chaseRadiusTiles * scene.map.tileWidth,
    attackRadiusPx: attackRadiusTiles * scene.map.tileWidth,
    moveTilesMin: Number(enemyConfig.moveTilesMin) || 3,
    moveTilesMax: Number(enemyConfig.moveTilesMax) || 6,
    idleSecondsMin: Number(enemyConfig.idleSecondsMin) || 3,
    idleSecondsMax: Number(enemyConfig.idleSecondsMax) || 30,
    state: "idle",
    path: [],
    pathIndex: 0,
    nextStateAt: scene.time.now + Phaser.Math.Between(3000, 30000),
    attackStart: null,
    attackDeathTriggered: false,
    debugDanger: scene.add.circle(spawnPosition.x, spawnPosition.y, detectionRadiusTiles * scene.map.tileWidth, 0xff0000, 0.08).setVisible(false).setDepth(0.5),
    debugChase: scene.add.circle(spawnPosition.x, spawnPosition.y, chaseRadiusTiles * scene.map.tileWidth, 0x00ccff, 0.08).setVisible(true).setDepth(0.5),
    debugAttack: scene.add.circle(spawnPosition.x, spawnPosition.y, attackRadiusTiles * scene.map.tileWidth, 0xffd300, 0.08).setVisible(true).setDepth(0.5)
  };

  scene.physics.add.collider(enemyCircle, scene.walls);
  return enemy;
}

function loadEnemies(scene) {
  if (!scene) {
    return;
  }

  scene.enemies = [];

  if (scene.enemyData && Array.isArray(scene.enemyData.enemies)) {
    scene.enemyData.enemies.forEach((enemyConfig, index) => {
      if (enemyConfig.removed) {
        return;
      }
      const enemy = createEnemyFromConfig(scene, enemyConfig, index);
      if (enemy) {
        scene.enemies.push(enemy);
      }
    });
  }
}

function saveLocalState(scene) {
  if (!scene) {
    return;
  }

  const completedQuestIds = Array.isArray(scene.quests)
    ? scene.quests.filter(q => q.completed).map(q => q.id)
    : [];

  const removedEnemyIds = Array.isArray(scene.enemyData?.enemies)
    ? scene.enemyData.enemies.filter(e => e.removed).map(e => e.id)
    : [];

  const playerPosition = scene.player ? {
    x: Math.round(scene.player.x),
    y: Math.round(scene.player.y)
  } : { x: scene.playerStart?.x || 0, y: scene.playerStart?.y || 0 };

  const state = {
    completedQuestIds,
    removedEnemyIds,
    playerPosition
  };

  try {
    localStorage.setItem("vengence-save-state", JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save local state:", error);
  }
}

function loadLocalSaveState() {
  try {
    const raw = localStorage.getItem("vengence-save-state");
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Could not load local state:", error);
    return null;
  }
}

function clearLocalSaveState() {
  try {
    localStorage.removeItem("vengence-save-state");
  } catch (error) {
    console.warn("Could not clear local state:", error);
  }
}

function resetEnemies(scene) {
  if (!scene) {
    return;
  }

  if (scene.enemies?.length) {
    scene.enemies.forEach(enemy => {
      if (enemy.debugDanger) enemy.debugDanger.destroy();
      if (enemy.debugChase) enemy.debugChase.destroy();
      if (enemy.debugAttack) enemy.debugAttack.destroy();
      if (enemy.circle) enemy.circle.destroy();
    });
  }

  scene.enemies = [];

  if (scene.enemyData && Array.isArray(scene.enemyData.enemies)) {
    scene.enemyData.enemies.forEach(enemy => {
      enemy.removed = false;
    });

    scene.enemyData.enemies.forEach((enemyConfig, index) => {
      const enemy = createEnemyFromConfig(scene, enemyConfig, index);
      if (enemy) {
        scene.enemies.push(enemy);
      }
    });

    if (typeof updateEnemiesFile === 'function') {
      updateEnemiesFile(scene.enemyData.enemies);
    }
  }
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

async function updateEnemiesFile(enemies) {
  try {
    const payload = { enemies };
    await fetch("assets/worldData/dungeon/enemies.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.log("Could not save enemies:", error);
  }
}