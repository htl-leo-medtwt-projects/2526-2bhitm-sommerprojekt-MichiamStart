function buildWalkableGrid(map, wallsLayer) {
  const grid = [];
  for (let y = 0; y < map.height; y++) {
    grid[y] = [];
    for (let x = 0; x < map.width; x++) {
      grid[y][x] = wallsLayer.hasTileAt(x, y);
    }
  }
  return grid;
}

function isTileWalkable(grid, x, y) {
  return x >= 0 && y >= 0 && y < grid.length && x < grid[0].length && !grid[y][x];
}

function getNearestWalkableTile(grid, startX, startY) {
  const width = grid[0].length;
  const height = grid.length;
  const visited = new Set();
  const queue = [{ x: Phaser.Math.Clamp(startX, 0, width - 1), y: Phaser.Math.Clamp(startY, 0, height - 1) }];

  while (queue.length) {
    const cell = queue.shift();
    const key = `${cell.x},${cell.y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (isTileWalkable(grid, cell.x, cell.y)) {
      return cell;
    }

    [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 }
    ].forEach(neighbor => {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(neighborKey) && neighbor.x >= 0 && neighbor.y >= 0 && neighbor.x < width && neighbor.y < height) {
        queue.push(neighbor);
      }
    });
  }

  return { x: Phaser.Math.Clamp(startX, 0, width - 1), y: Phaser.Math.Clamp(startY, 0, height - 1) };
}

function tileToWorld(tileX, tileY, tileWidth, tileHeight) {
  return {
    x: tileX * tileWidth + tileWidth / 2,
    y: tileY * tileHeight + tileHeight / 2
  };
}

function worldToTile(worldX, worldY, tileWidth, tileHeight) {
  return {
    x: Math.floor(worldX / tileWidth),
    y: Math.floor(worldY / tileHeight)
  };
}

function findPath(grid, start, goal) {
  if (!isTileWalkable(grid, goal.x, goal.y)) {
    return null;
  }

  const open = [];
  const closed = new Set();
  const startKey = `${start.x},${start.y}`;
  const goalKey = `${goal.x},${goal.y}`;

  open.push({ x: start.x, y: start.y, g: 0, h: Phaser.Math.Distance.Between(start.x, start.y, goal.x, goal.y), f: 0, parent: null });
  open[0].f = open[0].g + open[0].h;

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const currentKey = `${current.x},${current.y}`;
    if (currentKey === goalKey) {
      const path = [];
      let node = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closed.add(currentKey);

    [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
    ].forEach(neighbor => {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (!isTileWalkable(grid, neighbor.x, neighbor.y) || closed.has(neighborKey)) {
        return;
      }

      const g = current.g + 1;
      const h = Phaser.Math.Distance.Between(neighbor.x, neighbor.y, goal.x, goal.y);
      const f = g + h;
      const existing = open.find(node => node.x === neighbor.x && node.y === neighbor.y);

      if (!existing || f < existing.f) {
        if (existing) {
          existing.g = g;
          existing.h = h;
          existing.f = f;
          existing.parent = current;
        } else {
          open.push({ x: neighbor.x, y: neighbor.y, g, h, f, parent: current });
        }
      }
    });
  }

  return null;
}

function findRandomTargetTile(grid, start, minTiles, maxTiles) {
  const tries = 25;
  for (let i = 0; i < tries; i++) {
    const distance = Phaser.Math.Between(minTiles, maxTiles);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const tx = start.x + Math.round(Math.cos(angle) * distance);
    const ty = start.y + Math.round(Math.sin(angle) * distance);
    if (isTileWalkable(grid, tx, ty)) {
      return { x: tx, y: ty };
    }
  }

  for (let radius = minTiles; radius <= maxTiles; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) + Math.abs(dy) === radius && isTileWalkable(grid, start.x + dx, start.y + dy)) {
          return { x: start.x + dx, y: start.y + dy };
        }
      }
    }
  }

  return start;
}

function onPlayerDeath(scene) {
  console.log("Player death triggered by enemy proximity.");
  if (!scene) {
    return;
  }

  if (scene.quests) {
    scene.quests.forEach(quest => {
      quest.completed = false;
    });
    updateQuestsFile(scene.quests);
  }

  if (typeof resetEnemies === "function") {
    resetEnemies(scene);
  }

  if (scene.questMarkers) {
    scene.questMarkers.clear(true, true);
  } else {
    scene.questMarkers = scene.add.group();
  }

  if (scene.quests) {
    scene.quests.forEach(quest => {
      if (!quest.completed) {
        const marker = scene.add.circle(quest.x, quest.y, 15, 0xffff00);
        marker.setStrokeStyle(2, 0xff0000);
        marker.questId = quest.id;
        marker.questName = quest.name;
        scene.questMarkers.add(marker);
      }
    });
  }

  scene.activeQuest = null;

  if (scene.player) {
    const start = scene.playerStart || { x: 0, y: 0 };
    scene.player.setPosition(start.x, start.y);
    if (scene.player.body) {
      scene.player.body.reset(start.x, start.y);
      scene.player.body.setVelocity(0, 0);
    }
  }

  const attackSound = document.getElementById("attackSound");
  if (attackSound) {
    attackSound.currentTime = 0;
    attackSound.play().catch(() => {});
  }

  if (typeof clearLocalSaveState === "function") {
    clearLocalSaveState();
  }

  if (scene.gameOverOverlay && !scene.gameOverActive) {
    scene.gameOverActive = true;
    scene.gameOverOverlay.setVisible(true);
    scene.tweens.add({
      targets: scene.gameOverOverlay,
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: "Cubic.easeOut"
    });

    if (scene.player && scene.player.body) {
      scene.player.body.stop();
    }

    scene.time.delayedCall(3000, () => {
      scene.tweens.add({
        targets: scene.gameOverOverlay,
        alpha: 0,
        duration: 500,
        ease: "Cubic.easeIn",
        onComplete: () => {
          scene.gameOverOverlay.setVisible(false);
          scene.gameOverActive = false;
          if (scene.scene && typeof scene.scene.restart === "function") {
            scene.scene.restart();
          }
        }
      });
    });
  }
}

function updateEnemies(scene) {
  if (!scene.enemies?.length) {
    return;
  }

  const now = scene.time.now;
  const tileWidth = scene.map.tileWidth;
  const tileHeight = scene.map.tileHeight;
  const player = scene.player;
  const playerTile = worldToTile(player.x, player.y, tileWidth, tileHeight);

  let playerDied = false;

  for (let i = 0; i < scene.enemies.length; i++) {
    const enemy = scene.enemies[i];
    const circle = enemy?.circle;
    if (!circle || !circle.body) {
      continue;
    }

    const enemyTile = worldToTile(circle.x, circle.y, tileWidth, tileHeight);
    enemy.debugDanger.setPosition(circle.x, circle.y);
    enemy.debugChase.setPosition(circle.x, circle.y);
    enemy.debugAttack.setPosition(circle.x, circle.y);

    const distanceToPlayer = Phaser.Math.Distance.Between(circle.x, circle.y, player.x, player.y);
    const inAttackRange = distanceToPlayer <= enemy.attackRadiusPx;
    if (inAttackRange) {
      enemy.debugAttack.setFillStyle(0xff6600, 0.18);
      if (enemy.attackStart === null) {
        enemy.attackStart = now;
        enemy.attackDeathTriggered = false;
      } else if (!enemy.attackDeathTriggered && now - enemy.attackStart >= 1000) {
        enemy.attackDeathTriggered = true;
        onPlayerDeath(scene);
        playerDied = true;
        break;
      }
    } else {
      enemy.attackStart = null;
      enemy.attackDeathTriggered = false;
      enemy.debugAttack.setFillStyle(0xffd300, 0.08);
    }

    const inChaseRange = distanceToPlayer <= enemy.chaseRadiusPx;
    if (inChaseRange) {
      const chasePath = findPath(scene.walkableGrid, enemyTile, playerTile);
      if (chasePath && chasePath.length > 1) {
        enemy.state = "chasing";
        enemy.path = chasePath;
        enemy.pathIndex = 1;
      }
    } else if (enemy.state === "chasing") {
      enemy.state = "idle";
      enemy.path = [];
      enemy.pathIndex = 0;
      enemy.nextStateAt = now + Phaser.Math.Between(enemy.idleSecondsMin * 1000, enemy.idleSecondsMax * 1000);
    }

    if (enemy.state === "idle") {
      circle.body.setVelocity(0, 0);
      if (now >= enemy.nextStateAt) {
        const targetTile = findRandomTargetTile(scene.walkableGrid, enemyTile, enemy.moveTilesMin, enemy.moveTilesMax);
        const nextPath = findPath(scene.walkableGrid, enemyTile, targetTile);
        if (nextPath && nextPath.length > 1) {
          enemy.state = "moving";
          enemy.path = nextPath;
          enemy.pathIndex = 1;
        } else {
          enemy.nextStateAt = now + Phaser.Math.Between(enemy.idleSecondsMin * 1000, enemy.idleSecondsMax * 1000);
        }
      }
    }

    if (enemy.state === "moving" || enemy.state === "chasing") {
      if (enemy.path && enemy.pathIndex < enemy.path.length) {
        const target = tileToWorld(enemy.path[enemy.pathIndex].x, enemy.path[enemy.pathIndex].y, tileWidth, tileHeight);
        const distanceToTarget = Phaser.Math.Distance.Between(circle.x, circle.y, target.x, target.y);

        if (distanceToTarget <= 4) {
          enemy.pathIndex += 1;
          if (enemy.pathIndex >= enemy.path.length) {
            enemy.state = "idle";
            enemy.path = [];
            enemy.pathIndex = 0;
            enemy.nextStateAt = now + Phaser.Math.Between(enemy.idleSecondsMin * 1000, enemy.idleSecondsMax * 1000);
            circle.body.setVelocity(0, 0);
          }
        } else {
          const angle = Phaser.Math.Angle.Between(circle.x, circle.y, target.x, target.y);
          circle.body.setVelocity(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed);
        }
      } else {
        enemy.state = "idle";
        enemy.path = [];
        enemy.pathIndex = 0;
        enemy.nextStateAt = now + Phaser.Math.Between(enemy.idleSecondsMin * 1000, enemy.idleSecondsMax * 1000);
        circle.body.setVelocity(0, 0);
      }
    }
  }

  if (playerDied) {
    return;
  }
}
