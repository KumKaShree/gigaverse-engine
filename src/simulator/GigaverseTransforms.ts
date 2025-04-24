// path: gigaverse-engine/src/simulator/GigaverseTransforms.ts

import {
  Player as SdkPlayer,
  LootOption as SdkLootOption,
  EnemyEntity,
} from "@slkzgm/gigaverse-sdk/dist/client/types/game";
import {
  GigaverseFighter,
  GigaverseMoveState,
  GigaverseHealthState,
  GigaverseArmorState,
  GigaverseLootOption,
  GigaverseRunState,
} from "./GigaverseTypes";
import { ActionResponseData } from "@slkzgm/gigaverse-sdk";

/**
 * Transform a server-side `Player` object into our minimal `GigaverseFighter`.
 */
export function transformSdkPlayerToGigaverseFighter(
  p: SdkPlayer
): GigaverseFighter {
  // We'll define a helper to avoid repeating ourselves:
  const toMoveState = (stats: {
    currentATK: number;
    currentDEF: number;
    currentCharges: number;
  }): GigaverseMoveState => {
    return {
      currentATK: stats.currentATK,
      currentDEF: stats.currentDEF,
      currentCharges: stats.currentCharges, // ignoring maxCharges if always 3
    };
  };

  const toHealthState = (h: {
    current: number;
    currentMax: number;
  }): GigaverseHealthState => {
    return {
      current: h.current,
      max: h.currentMax,
    };
  };

  const toArmorState = (s: {
    current: number;
    currentMax: number;
  }): GigaverseArmorState => {
    return {
      current: s.current,
      max: s.currentMax,
    };
  };

  return {
    rock: toMoveState(p.rock),
    paper: toMoveState(p.paper),
    scissor: toMoveState(p.scissor),
    health: toHealthState(p.health),
    armor: toArmorState(p.shield),
  };
}

export function transformSdkEnemyEntityToGigaverseFighter(
  e: EnemyEntity
): GigaverseFighter {
  const arr = e.MOVE_STATS_CID_array;

  const [
    rockATK,
    rockShield,
    paperATK,
    paperShield,
    scissorATK,
    scissorShield,
    maxHP,
    maxArmor,
  ] = arr;

  return {
    rock: {
      currentATK: rockATK,
      currentDEF: rockShield,
      currentCharges: 3,
    },
    paper: {
      currentATK: paperATK,
      currentDEF: paperShield,
      currentCharges: 3,
    },
    scissor: {
      currentATK: scissorATK,
      currentDEF: scissorShield,
      currentCharges: 3,
    },
    health: {
      current: maxHP,
      max: maxHP,
    },
    armor: {
      current: maxArmor,
      max: maxArmor,
    },
  };
}

/**
 * Convert the server's `LootOption` into a minimal `GigaverseLootOption`.
 */
export function transformSdkLootOptionToGigaverse(
  sdkLoot: SdkLootOption
): GigaverseLootOption {
  return {
    selectedVal1: sdkLoot.selectedVal1,
    selectedVal2: sdkLoot.selectedVal2,
    boonTypeString: sdkLoot.boonTypeString,
  };
}

/**
 * If you want to transform an entire array:
 */
export function transformSdkLootOptions(
  sdkLoots: SdkLootOption[]
): GigaverseLootOption[] {
  return sdkLoots.map(transformSdkLootOptionToGigaverse);
}

/**
 * Helper: Build a GigaverseRunState from the server's runData + known enemies.
 * This is a minimal transform example.
 * Adjust logic to match how your server data organizes players + enemies.
 */
export function buildGigaverseRunState(
  data: ActionResponseData,
  allEnemies: EnemyEntity[]
): GigaverseRunState {
  const { run, entity } = data;
  // run => { players[], lootPhase, lootOptions, etc. }
  // entity => { ROOM_NUM_CID, ... }

  const userPlayer = transformSdkPlayerToGigaverseFighter(run.players[0]);

  // example: if we have 1 current enemy in run.players[1], or we look up by ROOM_NUM_CID
  const currentEnemyIndex = entity.ROOM_NUM_CID - 1;
  // or set to 0 if uncertain

  // Build an array of all enemies =>
  // If your real design is just user+1 enemy in run.players, you can do simpler approach.
  const enemyFighters: GigaverseFighter[] = [];
  for (let i = 0; i < allEnemies.length; i++) {
    // Some logic to see if this is the "current" enemy
    if (i === currentEnemyIndex) {
      // transform the actual enemy in run.players[1]
      const eFighter = transformSdkPlayerToGigaverseFighter(run.players[1]);
      enemyFighters.push(eFighter);
    } else {
      // or transform from the known list
      const eFighter = transformSdkEnemyEntityToGigaverseFighter(allEnemies[i]);
      enemyFighters.push(eFighter);
    }
  }

  // transform loot if needed
  let lootOptions: GigaverseLootOption[] = [];
  if (run.lootPhase && run.lootOptions?.length) {
    lootOptions = run.lootOptions.map(transformSdkLootOptionToGigaverse);
  }

  return {
    player: userPlayer,
    enemies: enemyFighters,
    currentEnemyIndex,
    lootPhase: run.lootPhase,
    lootOptions,
  };
}
