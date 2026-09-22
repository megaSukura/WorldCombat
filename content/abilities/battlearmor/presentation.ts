/**
 * Client visuals for Battle Armor. One cool steel family: pale blue-grey plate light with a
 * single warm spark where the blow is turned.
 *
 * Moments:
 *   brace - one-shot on the holder when a heavy hit is blunted: the plate flashes, a hard ring
 *           snaps outward and cold filings scatter.
 *   shell - a low engaged aura: a slow plate rim and a couple of dust motes at the feet.
 *
 * Both moments bind `target`, because the server event source is the attacker's or holder's body.
 */
const BattleArmorDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // Brace: impact turned aside, plate flash, hard ring, cold filings.
        brace: {
            duration: 34,
            exit: { stop: 12, drain: 30 },
            emitters: [
                {
                    name: "plate_flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.07, 0.2],
                    lifetime: [8, 15], size: [0.3, 0.04], sizeMode: "index",
                    color: 0xC8D8E8, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "hard_ring", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, at: 1, interval: 3 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.12],
                    lifetime: [12, 20], size: [0.34, 0.8],
                    color: 0x8FA8C8, alpha: [0.75, 0], light: "full", maxParticles: 5
                },
                {
                    name: "filings", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.16], spread: 18,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [12, 24], size: [0.06, 0.01],
                    color: 0xB8C8D8, alpha: [0.7, 0], light: "full", maxParticles: 28
                },
                {
                    name: "warm_tick", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 6, at: 2 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xFFE0A0, alpha: [0.8, 0], light: "full", maxParticles: 12
                }
            ]
        },
        // Shell: a slow plate rim and ground dust, kept out of the sight line.
        shell: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "shell_rim", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.46 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [28, 42], size: [0.42, 0.52], sizeMode: "sin",
                    color: 0x8FA8C8, alpha: [0.16, 0.05], alphaMode: "sin",
                    light: "world", maxParticles: 10
                },
                {
                    name: "shell_mote", bind: "target", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.38 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [22, 38], size: [0.05, 0.01],
                    color: 0xC8D8E8, alpha: [0.35, 0], light: "full", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_battlearmor", 1, BattleArmorDefinition);
