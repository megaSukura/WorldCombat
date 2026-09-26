/**
 * 辣椒精华 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者手边聚起红绿星火，甩出一只发光的精华瓶；瓶子沿弧线飞出，落地（或撞上掩体）炸开一片呛人的红辣雾，
 * 雾边一圈薄薄的红环，雾里升起辣气；被辣到的人打一个喷嚏式的小爆——全程没有火，只是在改攻防。
 *
 * 色相家族：辣红（0xD94F2B／0xE2531B）为主体与强调，一点草绿（0x7CCB5A）只作点缀，
 * 深红近黑做烟，近白只做高光小点。
 * 层次：星火（起手）／冲击＋喷溅＋辣气＋辣粒（爆开）／接触面的碎瓶（掩体挡下）／喷嚏（被辣到的人）／薄边辣雾（残留）。
 * 起击收：windup（聚辣）→ burst（炸开）→ shatter（撞掩体）→ sneeze（辣到人）→ haze（残留，绑定 field 效果）。
 * 数：落地半径用服务端 data.scale 缩放（判定与表现同一半径）；爆开与残留的粒子量绑定服务端算出的 drops；
 *     喷嚏的粒子量绑定礼物的攻防级数；haze 由 WorldFeedback.onEffect 绑定辣雾本身，随雾一起收。
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
                    name: "spice_core", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "drops", fallback: 80 } }, shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1.4 } },
                    direction: "outward", speed: [0.08, 0.34],
                    lifetime: [8, 15], size: [0.34, 0.04], sizeMode: "index",
                    color: 0xE2531B, alpha: [0.95, 0], light: "full", bloom: 0.3
                },
                {
                    name: "spice_splash", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: 46 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1.4 } },
                    direction: "outward", speed: [0.1, 0.4], spread: 20,
                    lifetime: [7, 13], size: [0.28, 0.03], sizeMode: "index",
                    color: 0xF3D98A, alpha: [0.9, 0], light: "full", bloom: 0.25
                },
                {
                    name: "spice_cloud", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 26 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1.4 } },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [20, 34], size: [0.4, 0.7],
                    color: 0x8E1B1B, alpha: [0.35, 0], light: "world", maxParticles: 50
                },
                {
                    name: "spice_grains", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 36 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1.2 } },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.012, drag: 0.96,
                    lifetime: [12, 24], size: [0.06, 0.01],
                    color: 0xE2A24B, alpha: [0.7, 0], light: "full", maxParticles: 56
                }
            ]
        },
        shatter: {
            duration: 20,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "glass_splash", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 12 }, shape: { kind: "hemisphere", radius: 0.22 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xF3D98A, alpha: [0.8, 0], light: "full", bloom: 0.2
                },
                {
                    name: "glass_dust", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02,
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xD94F2B, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        sneeze: {
            duration: 26,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "sneeze_puff", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "gift", fallback: 2 }, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [7, 13], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xE2531B, alpha: [0.85, 0], light: "full", bloom: 0.2
                },
                {
                    name: "sneeze_grains", bind: "target", offset: [0, 1.05, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shred", fallback: 2 }, interval: 4, repeats: 3 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xE2A24B, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        haze: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "haze_edge", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 4, shape: { kind: "ring", radius: { data: "scale", fallback: 1.6 }, thickness: 0.12 },
                    direction: "inward", speed: [0.008, 0.025],
                    lifetime: [18, 28], size: [0.18, 0.28], sizeMode: "sin",
                    color: 0xD94F2B, alpha: [0.35, 0], light: "full", maxParticles: 22
                },
                {
                    name: "haze_mist", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 5, shape: { kind: "circle", radius: { data: "scale", fallback: 1.6 }, thickness: 0.5 },
                    direction: "up", speed: [0.005, 0.025], spin: 6,
                    lifetime: [30, 52], size: [0.32, 0.56],
                    color: 0x7A1A1A, alpha: [0.1, 0], light: "world", maxParticles: 34
                },
                {
                    name: "haze_pulse", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
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
