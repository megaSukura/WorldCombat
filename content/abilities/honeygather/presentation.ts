/**
 * Client visuals for Honey Gather. One honey family: amber, cream and a soft green leaf note
 * for the pollination, all slow and warm.
 *
 * Moments:
 *   forage  - one-shot on the holder: honey drops gather up and a small amber ring rises.
 *   share   - one-shot on each ally: a sweet spark at the chest and a rising mote.
 *   growth  - one-shot at the plant: seed dust falls and a sprout answers upward.
 *   pp      - one-shot on the holder for the PP restore: a compact cream spark.
 *   nectar  - while the buff holds: a slow amber mote at the feet and a crest overhead.
 *
 * The holder and plant moments bind `target` or `point`; the pulse hook's source is the holder.
 */
const HoneyGatherDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // Forage: honey lifts on the holder, warm ring at the feet.
        forage: {
            duration: 36,
            exit: { stop: 12, drain: 30 },
            emitters: [
                {
                    name: "honey_lift", bind: "target", offset: [0, 0.1, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 12, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0xE8B84A, alpha: [0.9, 0], light: "full", maxParticles: 26
                },
                {
                    name: "warm_ring", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2, at: 1, interval: 4 }, shape: { kind: "ring", radius: 0.46 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 28], size: [0.44, 0.62], sizeMode: "sin",
                    color: 0xE8B84A, alpha: [0.55, 0], light: "full", maxParticles: 5
                },
                {
                    name: "drip_mote", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 24], size: [0.05, 0.01],
                    color: 0xFFD98A, alpha: [0.6, 0], light: "full", maxParticles: 18
                }
            ]
        },
        // Share: a sweet spark and mote on the ally.
        share: {
            duration: 30,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "sweet_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xFFD98A, alpha: [0.9, 0], light: "full", maxParticles: 18
                },
                {
                    name: "sweet_mote", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 5, at: 2 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 28], size: [0.12, 0.04], sizeMode: "sin",
                    color: 0xFFE8B0, alpha: [0.6, 0], light: "full", maxParticles: 12
                }
            ]
        },
        // Growth: seed dust down, sprout up.
        growth: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "sprinkle", bind: "point", offset: [0, 0.8, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: 16 }, shape: { kind: "circle", radius: 0.4 },
                    direction: "down", speed: [0.05, 0.1],
                    lifetime: [14, 24], size: [0.09, 0.02],
                    color: 0xC8E88A, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "sprout_up", bind: "point", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 3, at: 3 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "up", speed: [0.04, 0.09],
                    lifetime: [18, 30], size: [0.24, 0.1],
                    color: 0x8FCF6E, alpha: [0.95, 0], light: "full", maxParticles: 6
                }
            ]
        },
        // PP restore: a compact cream spark.
        pp: {
            duration: 26,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "pp_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [12, 22], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 12
                }
            ]
        },
        // Nectar state: amber motes at the feet and a crest overhead.
        nectar: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "nectar_mote", bind: "target", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4, shape: { kind: "ring", radius: 0.38 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 36], size: [0.08, 0.02],
                    color: 0xE8B84A, alpha: [0.4, 0], light: "full", maxParticles: 16
                },
                {
                    name: "nectar_crest", bind: "target", offset: [0, 0.15, 0], height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [22, 32], size: [0.06, 0.01],
                    color: 0xFFD98A, alpha: [0.3, 0], light: "full", maxParticles: 10
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_honeygather", 1, HoneyGatherDefinition);
