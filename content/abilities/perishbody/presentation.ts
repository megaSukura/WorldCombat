/**
 * Particle language for Perish Body. One dark-violet family (the effect's own 0x4B3A6B) with
 * near-black neutrals and a single pale-lavender accent used only on the smallest emphasis.
 *
 * The ability reads as an omen: the holder wears a low miasma, a heavy blow on the holder stamps
 * a seal onto the attacker, and the curse then counts down on that attacker until it takes him.
 *   aura      - while the holder is engaged: a low violet mist at the feet, nothing at eye level.
 *   sentence  - the quota-sized blow lands: the holder recoils (target) while the dark seal clamps
 *               onto the attacker (source) and a sigil flashes.
 *   weaken    - a Pokemon attacker also loses a Special Attack stage: psychic rings drain inward.
 *   curse     - the 12 s countdown, kept on the bearer: sparse ring, motes and a crest overhead.
 *   imminent  - the last 3 s of the countdown: the same read, tighter and brighter.
 *   doom      - the curse is spent: a soul column and a violet burst as the bearer drops.
 *   lift      - the curse clears early (a Pokemon disengaging): the seal breaks apart and fades.
 *
 * `sentence`/`weaken` are triggered from the damage event, whose source is the attacker, so
 * `bind: "source"` carries the attacker and `bind: "target"` carries the holder via data.target.
 * `curse`/`imminent`/`doom`/`lift` are triggered from the effect tick, where the source is the
 * bearer; they pass the bearer as `target` too so the layers anchor unambiguously.
 */
const PerishBodyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // Engaged holder: a low violet miasma at the feet, kept out of the body and the sight line.
        aura: {
            emitters: [
                {
                    name: "aura_miasma", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 4, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [28, 48], size: [0.3, 0.1],
                    color: 0x3A2A55, alpha: [0.18, 0.04], alphaMode: "sin",
                    light: "world", maxParticles: 20
                },
                {
                    name: "aura_ring", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 2, shape: { kind: "ring", radius: 0.48 },
                    direction: "up", speed: [0, 0.01],
                    lifetime: [28, 40], size: [0.4, 0.5], sizeMode: "sin",
                    color: 0x6B4E8C, alpha: [0.16, 0.06], alphaMode: "sin",
                    light: "full", maxParticles: 8
                },
                {
                    name: "aura_motes", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [24, 42], size: [0.06, 0.015],
                    color: 0xA98FC4, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        // The quota blow lands. Holder recoil (target) and the seal on the attacker (source) in one beat.
        sentence: {
            duration: 48,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "blow_hit", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3, thickness: 0.6 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 16], size: [0.34, 0.04], sizeMode: "index",
                    color: 0xE4D6F2, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "blow_recoil", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 6, at: 1 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.14], gravity: 0.03, drag: 0.9,
                    lifetime: [12, 24], size: [0.24, 0.06],
                    color: 0x8A6FA8, alpha: [0.7, 0], light: "full", maxParticles: 12
                },
                {
                    name: "seal_hit", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "seal_ring", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 30, at: 1 }, shape: { kind: "ring", radius: 0.95 },
                    direction: "inward", speed: [0.05, 0.085],
                    lifetime: [12, 16], size: [0.42, 0.18],
                    color: 0x6B4E8C, alpha: [0.6, 0], light: "full"
                },
                {
                    name: "seal_swirl", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 14, at: 2, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0x8A6FA8, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "seal_sigil", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 3, at: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 16], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xD8C4EE, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 6
                },
                {
                    name: "seal_mist", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    start: 3, rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [20, 36], size: [0.24, 0.4],
                    color: 0x1A1220, alpha: [0.3, 0], light: "world", maxParticles: 40
                }
            ]
        },
        // Pokemon-only taste of the omen: the special-offence stage drains away.
        weaken: {
            duration: 32,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "weaken_ring", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 10, at: 1 }, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.08],
                    lifetime: [12, 20], size: [0.34, 0.14],
                    color: 0x8A6FA8, alpha: [0.7, 0], light: "full", maxParticles: 14
                },
                {
                    name: "weaken_fall", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 6, at: 2 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "down", speed: [0.03, 0.08],
                    lifetime: [10, 18], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xC9B0E8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 10
                },
                {
                    name: "weaken_ash", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20, at: 2 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "down", speed: [0.03, 0.09], gravity: 0.02, drag: 0.94,
                    lifetime: [14, 26], size: [0.06, 0.015],
                    color: 0x6B4E8C, alpha: [0.65, 0], light: "world", maxParticles: 30
                }
            ]
        },
        // The calm countdown: sparse, low and off the body so the target stays readable.
        curse: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "curse_ring", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 2, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0, 0.01],
                    lifetime: [30, 44], size: [0.32, 0.42], sizeMode: "sin",
                    color: 0x6B4E8C, alpha: [0.28, 0.08], alphaMode: "sin",
                    light: "world", maxParticles: 8
                },
                {
                    name: "curse_motes", bind: "target", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 36], size: [0.06, 0.01],
                    color: 0x8A6FA8, alpha: [0.55, 0], light: "full", maxParticles: 14
                },
                {
                    name: "curse_crest", bind: "target", offset: [0, 0.2, 0], height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [24, 34], size: [0.15, 0.05], sizeMode: "sin",
                    color: 0x6B4E8C, alpha: [0.4, 0.05], alphaMode: "sin",
                    light: "full", maxParticles: 10
                },
                {
                    name: "curse_mist", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 2, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [26, 44], size: [0.2, 0.3],
                    color: 0x2A1A3A, alpha: [0.2, 0], light: "world", maxParticles: 12
                }
            ]
        },
        // Last three seconds: the same mark, tighter and brighter.
        imminent: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "imminent_ring", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 4, shape: { kind: "ring", radius: 0.46 },
                    direction: "up", speed: [0, 0.012],
                    lifetime: [22, 32], size: [0.34, 0.5], sizeMode: "sin",
                    color: 0x8A6FA8, alpha: [0.34, 0.1], alphaMode: "sin",
                    light: "full", maxParticles: 14
                },
                {
                    name: "imminent_pulse", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "ring", radius: 0.44 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.09, 0.015],
                    color: 0xA98FC4, alpha: [0.8, 0], light: "full", maxParticles: 20
                },
                {
                    name: "imminent_crest", bind: "target", offset: [0, 0.2, 0], height: 1.18,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 4, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.035],
                    lifetime: [18, 26], size: [0.17, 0.05], sizeMode: "sin",
                    color: 0xA98FC4, alpha: [0.55, 0.08], alphaMode: "sin",
                    light: "full", maxParticles: 12
                },
                {
                    name: "imminent_mist", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 34], size: [0.22, 0.34],
                    color: 0x2A1A3A, alpha: [0.26, 0], light: "world", maxParticles: 16
                }
            ]
        },
        // The curse is spent: the bearer is taken. A pale burst, a soul column and a flat ring.
        doom: {
            duration: 52,
            exit: { stop: 26, drain: 44 },
            emitters: [
                {
                    name: "doom_burst", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.36, thickness: 0.5 },
                    direction: "outward", speed: [0.1, 0.32],
                    lifetime: [8, 16], size: [0.4, 0.04], sizeMode: "index",
                    color: 0xE4D6F2, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "doom_column", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 3, at: 1, interval: 3 }, shape: { kind: "circle", radius: 0.35 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [20, 34], size: [0.36, 0.85],
                    color: 0x5B4780, alpha: [0.55, 0], light: "full", maxParticles: 12
                },
                {
                    name: "doom_souls", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 22, at: 1, interval: 4, repeats: 4 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [18, 32], size: [0.09, 0.015],
                    color: 0xA98FC4, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "doom_ring", bind: "point", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 3, at: 1, interval: 2 }, shape: { kind: "ring", radius: 1.1 },
                    direction: "outward", speed: [0.06, 0.12],
                    lifetime: [14, 22], size: [0.5, 1],
                    color: 0x6B4E8C, alpha: [0.6, 0], light: "full", maxParticles: 10
                },
                {
                    name: "doom_mist", bind: "point", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    start: 2, rate: 12, shape: { kind: "ring", radius: 0.55 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [22, 40], size: [0.3, 0.5],
                    color: 0x1A1220, alpha: [0.32, 0], light: "world", maxParticles: 50
                }
            ]
        },
        // The seal lets go without taking him: it breaks apart and thins into dust.
        lift: {
            duration: 34,
            exit: { stop: 14, drain: 28 },
            emitters: [
                {
                    name: "lift_break", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [12, 20], size: [0.4, 0.2],
                    color: 0x8A6FA8, alpha: [0.55, 0], light: "full", maxParticles: 28
                },
                {
                    name: "lift_motes", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20, at: 1 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.02, drag: 0.94,
                    lifetime: [14, 26], size: [0.06, 0.015],
                    color: 0xA98FC4, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "lift_dissolve", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8, at: 1 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [20, 34], size: [0.24, 0.42],
                    color: 0x2A1A3A, alpha: [0.26, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_perishbody", 1, PerishBodyDefinition);
