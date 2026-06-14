(function () {
  const debugSpawner = {
    quests: [],
    enemies: [],
    nextQuestId: 1,
    nextEnemyId: 1
  };

  function getPlayerPosition(scene) {
    if (!scene?.player) {
      return { x: 0, y: 0 };
    }

    const player = scene.player;
    const center = player.body ? player.body.center : player;
    return {
      x: Math.round(center.x),
      y: Math.round(center.y)
    };
  }

  function buildQuestData(scene) {
    const position = getPlayerPosition(scene);
    return {
      id: `debug-quest-${debugSpawner.nextQuestId}`,
      name: `Debug Quest ${debugSpawner.nextQuestId}`,
      x: position.x,
      y: position.y,
      completed: false
    };
  }

  function buildEnemyData(scene) {
    const position = getPlayerPosition(scene);
    return {
      id: `debug-enemy-${debugSpawner.nextEnemyId}`,
      type: "basic",
      x: position.x,
      y: position.y,
      speed: 30,
      moveTilesMin: 3,
      moveTilesMax: 6,
      idleSecondsMin: 3,
      idleSecondsMax: 30,
      detectionRadius: 3,
      chaseRadius: 7,
      attackRadius: 2.5,
      removed: false
    };
  }

  function logDebugData() {
    console.log(JSON.stringify(debugSpawner.quests, null, 2));
    console.log(JSON.stringify(debugSpawner.enemies, null, 2));
  }

  function addQuestAtPlayer(scene) {
    const quest = buildQuestData(scene);
    debugSpawner.quests.push(quest);
    debugSpawner.nextQuestId += 1;
    console.log("Added debug quest at player position.");
  }

  function addEnemyAtPlayer(scene) {
    const enemy = buildEnemyData(scene);
    debugSpawner.enemies.push(enemy);
    debugSpawner.nextEnemyId += 1;
    console.log("Added debug enemy at player position.");
  }

  function initializeDebugSpawner(scene) {
    if (!scene || !scene.input || !scene.input.keyboard) {
      console.warn("Debug spawner could not be initialized: scene or keyboard input missing.");
      return;
    }

    if (scene.__debugSpawnerInitialized) {
      return;
    }

    scene.__debugSpawnerInitialized = true;

    scene.input.keyboard.on("keydown-Q", () => {
      addQuestAtPlayer(scene);
    });

    scene.input.keyboard.on("keydown-E", () => {
      addEnemyAtPlayer(scene);
    });

    scene.input.keyboard.on("keydown-P", () => {
      console.log("Quests JSON array:");
      console.log(JSON.stringify(debugSpawner.quests, null, 2));
      console.log("Enemies JSON array:");
      console.log(JSON.stringify(debugSpawner.enemies, null, 2));
    });

    console.log("Debug spawner initialized. Press Q to create a quest at the player position, E to create an enemy, and P to print JSON arrays.");
  }

  window.initializeDebugSpawner = initializeDebugSpawner;
  window.debugSpawner = debugSpawner;
})();