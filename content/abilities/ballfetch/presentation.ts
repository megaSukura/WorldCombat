/**
 * Client visuals for Ball Fetch. One ball palette: warm red, cream and spark yellow, all small
 * and quick so the ability reads as a hand catching and returning something.
 *
 * Moments:
 *   catch      - one-shot on the holder: the object snaps into the body with a small puff and sparks.
 *   trip       - one-shot at the attacker: the returned object bursts and dust is knocked loose.
 *   hold       - one-shot on the holder when the object is kept as PP: a cream spark at the chest.
 *   trip_state - while the trip holds: a low ring and a few sparks at the victim's feet.
 *
 * Emitters bind `target` for the holder and `point` for the returned object, because the server
 * event source is the attacker.
 */
const BallFetchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // Catch: the object arrives, a puff and a bright tick at the chest.
        catch: {
            duration: 28,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "grab_puff", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/balls/pokeball_smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0xE8E0D0, alpha: [0.6, 0], light: "world", maxParticles: 20
                },
                {
                    name: "grab_spark", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/balls/pokeball_sparkle_yellow",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFE38A, alpha: [0.95, 0], light: "full", maxParticles: 14
                }
            ]
        },
        // Trip: the object lands on the attacker and dust kicks loose.
        trip: {
            duration: 30,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "return_hit", bind: "point", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 7 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xE0604A, alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "return_spark", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/balls/pokeball_sparkle_yellow",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.2], spread: 20,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xFFD86B, alpha: [0.9, 0], light: "full", maxParticles: 22
                },
                {
                    name: "return_dust", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 26], size: [0.06, 0.01],
                    color: 0xC8B48A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        // Hold: the kept object becomes a compact PP spark at the chest.
        hold: {
            duration: 28,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "keep_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/balls/capturesparks",
                    burst: { count: 9 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xFFF0C0, alpha: [0.9, 0], light: "full", maxParticles: 16
                },
                {
                    name: "keep_glint", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 5, at: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 22], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xFFF2C0, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 10
                }
            ]
        },
        // Trip state: a sparse ground ring and sparks while the slow holds.
        trip_state: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "trip_ring", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [26, 40], size: [0.4, 0.5], sizeMode: "sin",
                    color: 0xB0784A, alpha: [0.16, 0.05], alphaMode: "sin",
                    light: "world", maxParticles: 10
                },
                {
                    name: "trip_spark", bind: "target", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 34], size: [0.05, 0.01],
                    color: 0xE0A060, alpha: [0.4, 0], light: "full", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_ballfetch", 1, BallFetchDefinition);
