/**
 * 辣椒精华 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者手边聚起红绿星火，甩出一只发光的精华瓶；瓶子落地炸开一片呛人的红辣雾，
 * 雾里升起火星与辣气，过一会儿才慢慢散掉——站在雾里的敌人被辣得发红。
 *
 * 色相家族：辣红（0xD94F2B／0xE2531B）为主体与强调，一点草绿（0x7CCB5A）只作点缀，
 * 深红近黑做烟，近白只做高光小点。
 * 层次：星火（起手）／冲击＋喷溅（爆开）／火星与辣气（残留）／被辣目标的闷响（burn）。
 * 起击收：windup（聚辣）→ burst（炸开）→ burn（辣到人）→ haze（残留）。
 * 数：落地半径用服务端 data.scale 缩放（判定与表现同一半径）；爆开与残留的粒子量绑定服务端算出的 drops。
 */
const SpicyExtractDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "spice_spark", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xE2531B, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 26
                },
                {
                    name: "spice_green", bind: "source", height: 0.55, offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 6, shape: { kind: "ring", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04], spin: 12,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0x7CCB5A, alpha: [0.7, 0], light: "full", maxParticles: 16
                }
            ]
        },
        burst: {
            duration: 34,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "spice_core", bind: "point", offset: [0, 0.25, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "drops", fallback: 80 } }, shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1.4 } },
                    direction: "outward", speed: [0.08, 0.34],
                    lifetime: [8, 15], size: [0.34, 0.04], sizeMode: "index",
                    color: 0xE2531B, alpha: [0.95, 0], light: "full", bloom: 0.3
                },
                {
                    name: "spice_splash", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: 46 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1.4 } },
                    direction: "outward", speed: [0.1, 0.4], spread: 20,
                    lifetime: [7, 13], size: [0.28, 0.03], sizeMode: "index",
                    color: 0xF3D98A, alpha: [0.9, 0], light: "full", bloom: 0.25
                },
                {
                    name: "spice_cloud", bind: "point", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 26 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1.4 } },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [20, 34], size: [0.4, 0.7],
                    color: 0x8E1B1B, alpha: [0.35, 0], light: "world", maxParticles: 50
                },
                {
                    name: "spice_embers", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 40 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1.2 } },
                    direction: "up", speed: [0.03, 0.14], gravity: 0.015, drag: 0.95,
                    lifetime: [12, 24], size: [0.1, 0.02],
                    color: 0xE2531B, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        burn: {
            duration: 28,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "burn_flare", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "gift", fallback: 2 }, interval: 3, repeats: 4 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.26, 0.06], sizeMode: "sin",
                    color: 0xE2531B, alpha: [0.8, 0], light: "full", maxParticles: 18
                },
                {
                    name: "burn_smoke", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "shred", fallback: 2 }, interval: 4, repeats: 3 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.2, 0.32],
                    color: 0x6A1414, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        },
        haze: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "haze_mist", bind: "point", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "circle", radius: { data: "scale", fallback: 1.6 }, thickness: 0.8 },
                    direction: "up", speed: [0.005, 0.03], spin: 6,
                    lifetime: [30, 55], size: [0.34, 0.62],
                    color: 0x7A1A1A, alpha: [0.12, 0], light: "world", maxParticles: 50
                },
                {
                    name: "haze_pulse", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "drops", fallback: 40 }, interval: 20, repeats: 6 },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 1.6 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [18, 30], size: [0.06, 0.01],
                    color: 0xE2A24B, alpha: [0.25, 0], light: "full", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spicyextract", 1, SpicyExtractDefinition);
