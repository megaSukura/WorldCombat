/**
 * Client visuals for Justified. One gold family carries the ability: a heavy blow lights the
 * just heart, a Dark move is burned away into drawn steel, and the Strength it grants keeps a
 * low gold ward at the holder's feet.
 *
 * Three moments:
 *   kindle - one heavy hit (>=25% max health) kindles Strength: dust gathers, the blow flashes,
 *            the chest core and a heart sigil flare, sparks and a ground ring read at distance.
 *   temper - a Dark-type move raises Attack: a dark ring contracts and dark dust sinks while gold
 *            breaks out and a crossed-swords mark rises.
 *   ward   - while the granted Strength lasts and the holder is engaged: a sparse gold ring and
 *            dust at the feet plus a faint crest overhead, renewed every 20 ticks.
 *
 * A heavy Dark hit fires both one-shots; their text lines sit at different heights. The holder is
 * `target` for the event-driven moments (the server event source is the attacker) and `source`
 * for the pulse-driven ward. Textures and frame sizes come from particle_types.txt.
 */
const JustifiedDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // One-shot on the holder: gather, hit, chest core, heart sigil, sparks, ground ring, exit.
        kindle: {
            duration: 44,
            exit: { stop: 18, drain: 40 },
            emitters: [
                {
                    name: "gather", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xE8C87A, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "impact", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 8, at: 3 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 14], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xFFD86B, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "chest_core", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 3, at: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: 16, size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 4
                },
                {
                    name: "heart", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 1, at: 4 }, shape: { kind: "point" },
                    direction: "up", speed: [0.01, 0.02],
                    lifetime: 22, size: [0.5, 0.28], sizeMode: "sin",
                    color: 0xFFD86B, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 2
                },
                {
                    name: "sparks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 22, at: 3 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [12, 24], size: [0.08, 0.01],
                    color: 0xFFE08A, alpha: [0.95, 0], light: "full", maxParticles: 40
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, at: 3, interval: 3 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.12],
                    lifetime: [14, 22], size: [0.35, 0.85],
                    color: 0xC99A2E, alpha: [0.7, 0], light: "full", maxParticles: 4
                },
                {
                    name: "lingering", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10, at: 10 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [18, 34], size: [0.07, 0.01],
                    color: 0xFFD86B, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        // One-shot on the holder: dark seal contracts, dark dust sinks, gold breaks out, swords rise.
        temper: {
            duration: 40,
            exit: { stop: 14, drain: 36 },
            emitters: [
                {
                    name: "dark_seal", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 26 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.05, 0.08],
                    lifetime: [12, 16], size: [0.42, 0.16],
                    color: 0x5B3B8C, alpha: [0.6, 0], light: "world"
                },
                {
                    name: "dark_dust", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.02, drag: 0.95,
                    lifetime: [14, 22], size: [0.07, 0.02],
                    color: 0x3A2450, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "backfire_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 8, at: 3 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.3, 0.04], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "updraft", bind: "target", offset: [0, 0.1, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 14, start: 3, stop: 20,
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [16, 28], size: [0.1, 0.02],
                    color: 0xFFD86B, alpha: [0.85, 0], light: "full", maxParticles: 44
                },
                {
                    name: "sword_mark", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/crossedswords",
                    burst: { count: 1, at: 4 }, shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.04],
                    lifetime: 24, size: [0.42, 0.16], sizeMode: "sin",
                    color: 0xFFD86B, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 2
                },
                {
                    name: "motiv_sparks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 18, at: 3 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "up", speed: [0.05, 0.18], gravity: 0.02, drag: 0.94,
                    lifetime: [14, 26], size: [0.09, 0.01],
                    color: 0xFFE08A, alpha: [0.95, 0], light: "full", maxParticles: 36
                }
            ]
        },
        // Continuous while the granted Strength lasts; renewed every 20 ticks from the pulse hook.
        // Kept at the feet and overhead so the holder and the fight stay readable.
        ward: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "foot_ring", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [30, 44], size: [0.42, 0.5], sizeMode: "sin",
                    color: 0xC99A2E, alpha: [0.16, 0.06], alphaMode: "sin",
                    light: "world", maxParticles: 12
                },
                {
                    name: "foot_dust", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "ring", radius: 0.38 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 40], size: [0.05, 0.01],
                    color: 0xFFD86B, alpha: [0.5, 0], light: "full", maxParticles: 20
                },
                {
                    name: "crest", bind: "source", offset: [0, 0.2, 0], height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [24, 34], size: [0.14, 0.05], sizeMode: "sin",
                    color: 0xFFE08A, alpha: [0.3, 0], alphaMode: "sin",
                    light: "full", maxParticles: 10
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_justified", 1, JustifiedDefinition);
