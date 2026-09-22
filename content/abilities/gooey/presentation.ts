/**
 * Particle language for Gooey. One goo-green family on a sticky, low silhouette.
 *
 * The ability is contact-reactive: the holder carries the goo, and whoever strikes it gets
 * coated. The server triggers these from the incoming-damage event, where the event source is
 * the attacker and the holder arrives through `data.target`, so `source` binds the attacker
 * and `target` binds the holder/bearer.
 *   sheen  - while the holder is engaged: a sparse low film and a few bubbles at the feet.
 *   splat  - a close hit lands: goo bursts off the holder and splashes onto the attacker.
 *   coat   - a Pokemon attacker also takes the real effect: darker goo wraps and tightens.
 *   coated - the cling itself, kept on the bearer while the effect lasts.
 *
 * Textures and frame sizes come from particle_types.txt. The effect colour 0x6A8F3C anchors
 * the hue; light details stay small and the persistent layers stay low-alpha.
 */
const GooeyDefinition: ParticleDefinition = {
    moments: {
        // Persistent, engaged holder: a film at the feet so the target stays readable.
        sheen: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "sheen_goo", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 4, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [26, 46], size: [0.30, 0.10],
                    color: 0x6A8F3C, alpha: [0.22, 0.04], alphaMode: "sin",
                    light: "world", maxParticles: 20
                },
                {
                    name: "sheen_bubbles", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 6, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 38], size: [0.07, 0.015],
                    color: 0xA8D060, alpha: [0.55, 0], light: "full", maxParticles: 24
                },
                {
                    name: "sheen_orb", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 2, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.0, 0.012],
                    lifetime: [30, 44], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0x86B34C, alpha: [0.30, 0.08], alphaMode: "sin",
                    light: "world", maxParticles: 10
                }
            ]
        },
        // A hit lands: goo bursts off the holder (target) and splashes onto the attacker (source).
        splat: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "splat_impact", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.28, thickness: 0.6 },
                    direction: "outward", speed: [0.06, 0.20],
                    lifetime: [8, 15], size: [0.28, 0.04], sizeMode: "index",
                    color: 0x86B34C, alpha: [1, 0], light: "full", bloom: 0.25
                },
                {
                    name: "splat_goo", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 10, at: 1 }, shape: { kind: "sphere", radius: 0.30 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.9,
                    lifetime: [14, 28], size: [0.26, 0.12],
                    color: 0x6A8F3C, alpha: [0.9, 0], light: "world", maxParticles: 24
                },
                {
                    name: "splat_drops", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    burst: { count: 10, at: 2 }, shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.03, 0.10], gravity: 0.06, drag: 0.95,
                    lifetime: [16, 30], size: [0.06, 0.02],
                    color: 0xC8EC8A, alpha: [0.8, 0], light: "full", maxParticles: 20
                },
                {
                    name: "splat_origin", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.20, 0.03], sizeMode: "index",
                    color: 0x6A8F3C, alpha: [0.75, 0], light: "world"
                }
            ]
        },
        // The Pokemon layer takes hold: darker goo wraps the attacker and tightens inward.
        coat: {
            duration: 30,
            exit: { stop: 14, drain: 24 },
            emitters: [
                {
                    name: "coat_wrap", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 12, at: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.06, 0.12],
                    lifetime: [14, 24], size: [0.30, 0.14],
                    color: 0x4F6E28, alpha: [0.85, 0], light: "world", maxParticles: 20
                },
                {
                    name: "coat_strands", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    burst: { count: 8, at: 2 }, shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "inward", speed: [0.04, 0.10], drag: 0.9,
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0x9FD35A, alpha: [0.9, 0], light: "full", maxParticles: 18
                },
                {
                    name: "coat_flash", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: 10, size: [0.26, 0.05], sizeMode: "index",
                    color: 0xDCF6A8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 5
                },
                {
                    name: "coat_ring", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.05, 0.08],
                    lifetime: [10, 16], size: [0.34, 0.16],
                    color: 0x6A8F3C, alpha: [0.5, 0], light: "full"
                }
            ]
        },
        // The cling itself: a thin goo film and slow drips on the bearer, out of the sight line.
        coated: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "coated_goo", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 5, shape: { kind: "ring", radius: 0.35 },
                    direction: "down", speed: [0.01, 0.03], gravity: 0.01,
                    lifetime: [18, 30], size: [0.18, 0.06],
                    color: 0x52702C, alpha: [0.35, 0], light: "world", maxParticles: 20
                },
                {
                    name: "coated_drips", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    rate: 6, shape: { kind: "sphere", radius: 0.30 },
                    direction: "down", speed: [0.02, 0.05], gravity: 0.05,
                    lifetime: [14, 26], size: [0.06, 0.02],
                    color: 0x9FD35A, alpha: [0.7, 0], light: "full", maxParticles: 24
                },
                {
                    name: "coated_bubbles", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 3, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 34], size: [0.06, 0.015], alphaMode: "sin",
                    color: 0xB6E06A, alpha: [0.4, 0], light: "full", maxParticles: 14
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:ability_gooey", 1, GooeyDefinition);
