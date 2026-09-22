/**
 * Particle language for Frisk.
 *
 * The ability sizes up the field the moment a fight starts: the holder sweeps a reading reticle
 * over the 12-block reach, brands every enemy it finds, and reads the nearest Pokemon's held
 * item. The visuals should read as an instrument taking a measurement, not as an attack.
 *
 * One brass-gold family taken from the effect's own colour (0x8A7F4A): dark warm neutrals carry
 * dust and shadow, mid brass draws the reticles, and near-white gold is the only accent, kept to
 * the small reading flashes. The persistent `exposed` layers sit above the head and at the feet
 * so the marked body and the fight stay readable.
 *
 * Moments:
 *   scan     - one-shot on the holder: the reticle sweeps out to the 12-block read.
 *   mark     - one-shot on each enemy the sweep reveals.
 *   exposed  - kept while world_combat:frisk_exposed holds on a victim.
 *   suppress - one-shot on the nearest Pokemon whose held item is read and disabled.
 *
 * Textures and frame sizes come from particle_types.txt.
 */
const FriskDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // One-shot on the holder: a brass reticle sweeps out to the read radius, a near-white core
        // flashes at the chest, insight marks rise overhead and a low neutral dust settles.
        scan: {
            duration: 55,
            exit: { stop: 26, drain: 34 },
            emitters: [
                {
                    name: "scan_ring", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 120 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.55, 0.62], spread: 2,
                    lifetime: [20, 26], size: [0.5, 0.85],
                    color: 0x8A7F4A, alpha: [0.5, 0], light: "full"
                },
                {
                    name: "ring_glints", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 50, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.5, 0.72], spread: 4,
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0xD9CE96, alpha: [0.9, 0], light: "full", maxParticles: 200
                },
                {
                    name: "focus_flash", bind: "source", offset: [0, 0.15, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 3, at: 3 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.02, 0.1],
                    lifetime: 12, size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFF6DC, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 4
                },
                {
                    name: "insight_marks", bind: "source", offset: [0, 0.2, 0], height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    burst: { count: 4, at: 4, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 22], size: [0.24, 0.08],
                    color: 0xC9BC7E, alpha: [0.8, 0], light: "full", maxParticles: 12
                },
                {
                    name: "scan_dust", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    start: 6, rate: 10,
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [26, 42], size: [0.3, 0.06],
                    color: 0x3A3428, alpha: [0.28, 0], light: "world", maxParticles: 70
                }
            ]
        },
        // One-shot on a revealed enemy: a reticle contracts onto the body, a near-white reading
        // flash marks the spot, gold specks lift off and dark dust is pressed to the ground.
        mark: {
            duration: 30,
            exit: { stop: 14, drain: 24 },
            emitters: [
                {
                    name: "reticle_close", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: 0.95 },
                    direction: "inward", speed: [0.055, 0.085],
                    lifetime: [12, 16], size: [0.42, 0.16],
                    color: 0x8A7F4A, alpha: [0.55, 0], light: "full"
                },
                {
                    name: "reveal_hit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [7, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFF6DC, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "insight_spark", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.02, drag: 0.92,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xD9CE96, alpha: [0.95, 0], light: "full", maxParticles: 26
                },
                {
                    name: "reveal_dust", bind: "target", height: 0.22,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.02, drag: 0.95,
                    lifetime: [14, 22], size: [0.07, 0.02],
                    color: 0x3A3428, alpha: [0.55, 0], light: "world", maxParticles: 36
                }
            ]
        },
        // The revealed state: a slow turning reticle above the head and a few motes at the feet,
        // low and off the sight line. Renewed every 20 ticks while the exposure holds.
        exposed: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "reticle", bind: "target", offset: [0, 0.2, 0], height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3,
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.005, 0.02], spin: 10,
                    lifetime: [24, 32], size: [0.22, 0.08], sizeMode: "sin",
                    color: 0x8A7F4A, alpha: [0.4, 0], alphaMode: "sin",
                    light: "full", maxParticles: 12
                },
                {
                    name: "feet_motes", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3,
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [24, 40], size: [0.06, 0.02],
                    color: 0xC9BC7E, alpha: [0.3, 0], light: "full", maxParticles: 18
                },
                {
                    name: "mark_ring", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2,
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [30, 42], size: [0.4, 0.5], sizeMode: "sin",
                    color: 0x6A6138, alpha: [0.12, 0.05], alphaMode: "sin",
                    light: "world", maxParticles: 8
                }
            ]
        },
        // One-shot on the nearest Pokemon whose held item is read: a lock ring tightens onto the
        // body, the item flashes once near-white, gold glints are drawn in and dull dust falls.
        suppress: {
            duration: 30,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "lock_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3, at: 1, interval: 3 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.09],
                    lifetime: [12, 20], size: [0.36, 0.14],
                    color: 0x8A7F4A, alpha: [0.6, 0], light: "full"
                },
                {
                    name: "item_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: 12, size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF6DC, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 4
                },
                {
                    name: "invoke_glints", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 10, at: 2 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xD9CE96, alpha: [0.9, 0], light: "full", maxParticles: 16
                },
                {
                    name: "dull_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.02, drag: 0.95,
                    lifetime: [12, 20], size: [0.06, 0.02],
                    color: 0x2A2620, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_frisk", 1, FriskDefinition);
