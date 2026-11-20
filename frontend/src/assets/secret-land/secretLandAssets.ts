import badgeBook from './secret-land-badge-book-v2.png';
import treasureChest from './secret-land-treasure-chest-v2.png';
import world from './world-terrain-compact-rainbow-bridge-v3-2400x800.png';
import cloudCastle from './place-cloud-castle-v2.png';
import magicSpring from './place-magic-spring-v2.png';
import rainbowBridge from './place-rainbow-bridge-v2.png';
import sproutHill from './place-sprout-hill-v2.png';
import starlightGate from './place-starlight-gate-v2.png';
import sproutHillWorldDesign from './world-design/02_landmark_candidates/01_sprout_hill_landmark.png';
import magicSpringWorldDesign from './world-design/02_landmark_candidates/02_magic_spring_landmark.png';
import cloudAreaWorldDesign from './world-design/02_landmark_candidates/04_cloud_area_landmark_CANDIDATE.png';
import starlightAreaWorldDesign from './world-design/02_landmark_candidates/05_starlight_area_landmark_CANDIDATE.png';
import sproutPathForegroundCluster from './world-environment-v1/sprout-path-foreground-cluster-v1.png';
import sproutSpringPathStrip from './world-environment-v1/sprout-spring-path-strip-v1.png';
import magicSpringWaterbankCluster from './world-environment-v1/magic-spring-waterbank-cluster-v1.png';
import rainbowBridgeApproachCluster from './world-environment-v1/rainbow-bridge-approach-cluster-v1.png';
import cloudCastleApproachCluster from './world-environment-v1/cloud-castle-approach-cluster-v1.png';
import starlightGateApproachCluster from './world-environment-v1/starlight-gate-approach-cluster-v1.png';

/**
 * Raster art only. World coordinates and unlock state remain in the dashboard
 * component so artwork never becomes a source of progression data.
 */
export const secretLandAssets = {
  world,
  treasureChest,
  badgeBook,
  destinations: {
    sprout: sproutHill,
    spring: magicSpring,
    bridge: rainbowBridge,
    castle: cloudCastle,
    gate: starlightGate,
  },
  /** Transparent landmark candidates from the approved design pack. These
   * are used as calibrated world landmarks; opaque concept boards remain
   * reference-only and are not rendered in the game. */
  worldDesignLandmarks: {
    sprout: sproutHillWorldDesign,
    spring: magicSpringWorldDesign,
    castle: cloudAreaWorldDesign,
    gate: starlightAreaWorldDesign,
  },
  environment: {
    sproutPathForegroundCluster: {
      assetId: 'secret-land-sprout-path-foreground-cluster-v1',
      src: sproutPathForegroundCluster,
      worldX: 0,
      worldY: 240,
      width: 1800,
      height: 600,
      anchorX: 0,
      anchorY: 0,
      zIndex: 3.5,
      zoneId: 'sprout',
      usage: 'active',
    },
    sproutSpringPathStrip: {
      assetId: 'secret-land-sprout-spring-path-strip-v1',
      src: sproutSpringPathStrip,
      worldX: 0,
      worldY: 180,
      width: 2172,
      height: 724,
      anchorX: 0,
      anchorY: 0,
      zIndex: 4.5,
      zoneId: 'sprout-spring',
      usage: 'active',
    },
    magicSpringWaterbankCluster: {
      assetId: 'secret-land-magic-spring-waterbank-cluster-v1',
      src: magicSpringWaterbankCluster,
      worldX: 1650,
      worldY: 170,
      width: 1800,
      height: 922,
      anchorX: 0,
      anchorY: 0,
      zIndex: 3.2,
      zoneId: 'spring',
      usage: 'active',
      minUnlockedTarget: 1,
    },
    rainbowBridgeApproachCluster: {
      assetId: 'secret-land-rainbow-bridge-approach-cluster-v1',
      src: rainbowBridgeApproachCluster,
      worldX: 3250,
      worldY: 40,
      width: 1900,
      height: 950,
      anchorX: 0,
      anchorY: 0,
      zIndex: 4.5,
      zoneId: 'bridge',
      usage: 'active',
    },
    cloudCastleApproachCluster: {
      assetId: 'secret-land-cloud-castle-approach-cluster-v1',
      src: cloudCastleApproachCluster,
      worldX: 5850,
      worldY: 40,
      width: 1700,
      height: 1133,
      anchorX: 0,
      anchorY: 0,
      zIndex: 3.2,
      zoneId: 'castle',
      usage: 'active',
      minUnlockedTarget: 3,
    },
    starlightGateApproachCluster: {
      assetId: 'secret-land-starlight-gate-approach-cluster-v1',
      src: starlightGateApproachCluster,
      worldX: 7350,
      worldY: 30,
      width: 1650,
      height: 929,
      anchorX: 0,
      anchorY: 0,
      zIndex: 3.2,
      zoneId: 'gate',
      usage: 'active',
      minUnlockedTarget: 4,
    },
  },
} as const;
