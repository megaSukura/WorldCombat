/**
 * Client visuals for Multitype. One prism family: a pale cyan base with a brief rainbow accent
 * only on the change itself, so the ability reads as "the body takes on the ground".
 *
 * Moments:
 *   attune - one-shot on the holder when the element changes: a ground ring runs out, color
 *            glints climb the body and a short prism flash marks the new type.
 *   share  - one-shot on each ally caught by the field: a small cyan spark at the feet.
 *   aura   - the kept field boundary: a wide, low prism ring that lets the fight read through it.
 *
 * The pulse hook's source is the holder, so all moments bind `target`.
 */
const MultitypeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // Attune: ground ring, color climb, prism flash.
        attune: {
            duration: 44,
            exit: { stop: 16, drain: 34 },
            emitters: [
                {
                    name: "ground_ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 30, at: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.16],
                    lifetime: [16, 26], size: [0.4, 0.8],
                    color: 0xB6E8FF, alpha: [0.6, 0], light: "full"
                },
                {
                    name: "color_climb", bind: "target", offset: [0, 0.05, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    burst: { count: 14, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0x9FD8FF, alpha: [0.85, 0], light: "full", maxParticles: 28
                },
                {
                    name: "prism_flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: 8, at: 2 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 20], size: [0.12, 0.02],
                    alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 16
                }
            ]
        },
        // Share: a small cyan spark at the ally's feet.
        share: {
            duration: 28,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "share_spark", bind: "target", offset: [0, 0.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xB6E8FF, alpha: [0.85, 0], light: "full", maxParticles: 14
                },
                {
                    name: "share_rim", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [16, 26], size: [0.36, 0.5], sizeMode: "sin",
                    color: 0xB6E8FF, alpha: [0.35, 0], light: "full", maxParticles: 4
                }
            ]
        },
        // Aura: the kept field boundary, low and sparse.
        aura: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "field_ring", bind: "target", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 3, shape: { kind: "circle", radius: 1.4, thickness: 0.5 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [30, 46], size: [0.5, 0.7], sizeMode: "sin",
                    color: 0xB6E8FF, alpha: [0.14, 0.04], alphaMode: "sin",
                    light: "world", maxParticles: 12
                },
                {
                    name: "field_mote", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "circle", radius: 1.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [24, 40], size: [0.05, 0.01],
                    color: 0xDCF4FF, alpha: [0.3, 0], light: "full", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_multitype", 1, MultitypeDefinition);
