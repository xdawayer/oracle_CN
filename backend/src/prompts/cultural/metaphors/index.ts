/**
 * 比喻库统一导出
 */

// 行星
export {
  PLANET_METAPHORS,
  getPlanetMetaphor,
  getAllPlanetMetaphors,
} from './planets';

// 相位
export {
  ASPECT_METAPHORS,
  getAspectMetaphor,
  getAllAspectMetaphors,
  getAspectNature,
} from './aspects';

// 宫位
export {
  HOUSE_METAPHORS,
  HOUSE_GROUPS,
  getHouseMetaphor,
  getAllHouseMetaphors,
} from './houses';

// 合盘相位
export {
  SYNASTRY_ASPECT_KNOWLEDGE,
  getSynastryAspectMeaning,
  getAllSynastryAspectKnowledge,
  isChallenging,
  isPositive,
  type SynastryAspectMeaning,
  type PlanetPairAspects,
} from './synastry-aspects';

// 类型
export type {
  PlanetMetaphor,
  AspectMetaphor,
  HouseMetaphor,
} from '../../core/types';
