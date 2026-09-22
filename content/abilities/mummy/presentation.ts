/**
 * Particle language for Mummy. One pale linen family on a low, dry outline.
 *
 * The holder is the mummy and the attacker is the source of every server trigger, so the
 * moments read from the struck body outward:
 *   wrap       - the blow lands: dry bandages lash off the mummy (target) and coil onto the
 *                attacker (source), tightening while grave dust settles.
 *   wrap_state - while the wrap holds on the attacker: a few loose strips sag at the body,
 *                a sparse crest above the head and dust at the feet keep the state readable.
 *   seal       - Pokemon attacker only: its ability is sealed; a cold neutral ring clamps down
 *                and a dim spectral flash reads the sealed layer apart from the warm bandages.
 *
 * Textures and frame sizes come from particle_types.txt; the wrap texture (32x32, 9 frames) is
 * the identity layer, dust/smoke carry the grave-dry neutral, and the seal borrows cold neutrals.
 */
const MummyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // The contact counter: bandages leave the mummy and bind the attacker in one beat.
        wrap: {
            duration: 36,
            exit: { stop: 18, drain: 30 },
            emitters: [
                {
                    // Rise: dry strips snap outward off the struck body.
                    name: "lash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.18], spread: 35,
                    drag: 0.9,
                    lifetime: [10, 18], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xD8CBA0, alpha: [0.95, 0], light: "world", maxParticles: 28
                },
                {
                    // Rise: grave dust shaken loose.
                    name: "holder_dust", bind: "target", offset: [0, 0.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.02, 0.08], gravity: 0.03, drag: 0.94,
                    lifetime: [14, 26], size: [0.07, 0.02],
                    color: 0xA89870, alpha: [0.5, 0], light: "world", maxParticles: 36
                },
                {
                    // Impact: the bands converge and clamp onto the attacker.
                    name: "bind_bands", bind: "source", height: 0.5, start: 3,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 24 },
                    shape: { kind: "sphere", radius: 0.42, thickness: 0.75 },
                    direction: "inward", speed: [0.05, 0.12], drag: 0.86,
                    lifetime: [12, 22], size: [0.3, 0.1], sizeMode: "index",
                    color: 0xEDE3C8, alpha: [0.92, 0], light: "world", maxParticles: 46
                },
                {
                    // Impact: a banded ring cinches in around the body.
                    name: "tighten", bind: "source", height: 0.5, start: 3,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.05, 0.08],
                    lifetime: [10, 16], size: [0.5, 0.2],
                    color: 0xC9B98A, alpha: [0.5, 0], light: "world", maxParticles: 12
                },
                {
                    // Impact: the one bright beat, a small bone flash where the bands close.
                    name: "clamp_flash", bind: "source", height: 0.5, start: 3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xF5EED8, alpha: [1, 0], light: "full", bloom: 0.25, maxParticles: 16
                },
                {
                    // Taper: musty air hangs over the bound body and fades.
                    name: "muffle", bind: "source", height: 0.55, start: 6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 4, interval: 5, repeats: 2 },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 34], size: [0.22, 0.32],
                    color: 0x8A7A58, alpha: [0.24, 0], light: "world", maxParticles: 12
                }
            ]
        },
        // The wrap state: thin and low, kept off the line of sight on the bound attacker.
        wrap_state: {
            exit: { drain: 40 },
            emitters: [
                {
                    // Loose strips sag against the body.
                    name: "state_band", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: 3, shape: { kind: "ring", radius: 0.36 },
                    direction: "down", speed: [0.005, 0.02], drag: 0.95,
                    lifetime: [20, 34], size: [0.16, 0.04],
                    color: 0xD8CBA0, alpha: [0.4, 0], light: "world", maxParticles: 14
                },
                {
                    // Dry dust at the feet.
                    name: "state_motes", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [24, 40], size: [0.045, 0.015],
                    color: 0xB8A87E, alpha: [0.18, 0], light: "world", maxParticles: 16
                },
                {
                    // A faint crest above the head keeps the state readable from a distance.
                    name: "state_crest", bind: "target", offset: [0, 0.2, 0], height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 2, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [24, 32], size: [0.12, 0.05], sizeMode: "sin",
                    color: 0xD8CBA0, alpha: [0.3, 0], alphaMode: "sin", light: "full",
                    maxParticles: 8
                }
            ]
        },
        // The sealed layer, Pokemon attackers only: cold neutrals clamp the ability shut.
        seal: {
            duration: 30,
            exit: { stop: 16, drain: 28 },
            emitters: [
                {
                    name: "seal_aura", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.42, 0.16],
                    color: 0x8894A8, alpha: [0.55, 0], light: "full", maxParticles: 12
                },
                {
                    name: "seal_lock", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 4, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.05, 0.09],
                    lifetime: [10, 16], size: [0.4, 0.14],
                    color: 0x6A7488, alpha: [0.6, 0], light: "world", maxParticles: 10
                },
                {
                    name: "seal_flash", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xBCC6D6, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 18
                },
                {
                    name: "seal_motes", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.02, 0.06], gravity: 0.02, drag: 0.95,
                    lifetime: [14, 24], size: [0.05, 0.015],
                    color: 0x9AA4B4, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_mummy", 1, MummyDefinition);
