/**
 * 临别礼物 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者收拢自己，当场倒下；一团深紫的遗念在倒下处炸开、缠住四周的敌人，随后一小簇幽火
 *   留在原地，慢慢淡去。
 *
 * 色相家族：深紫与近黑（0x2E1A47／0x4B2A6B）为主体，幽紫（0x8E5FD0）与惨白（0xB9AEC9）只做细节与高光。
 * 层次：收拢（起手）→ 遗念爆＋地环（倒下）→ 缠身鬼火（命中）→ 原地幽火（持续）→ 散尽的烟（落空/离场）。
 * 起击收：windup（聚拢）→ farewell／grief（爆开）→ remnant（留着）→ fade（散去）。
 * 数：爆开的遗念数量由服务端 data.darkness 派生；碎片半径与遗留圈的半径读 data.radius／data.scale，
 *   画出的正是判定里那个 giftRadius。遗念实体本身用 world.spawn 的外观（幽火）呈现。
 */
const MementoDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            emitters: [
                {
                    name: "farewell_gather", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 20, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.2, 0.03],
                    color: 0x2E1A47, alpha: [0.6, 0], light: "world", maxParticles: 36
                },
                {
                    name: "farewell_motes", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 10, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0x8E5FD0, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        farewell: {
            duration: 34,
            emitters: [
                {
                    name: "farewell_ring", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 44 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 22], size: [0.34, 0.8],
                    color: 0x4B2A6B, alpha: [0.6, 0], light: "full", maxParticles: 80
                },
                {
                    name: "farewell_burst", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "darkness", fallback: 24 }, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.22], spread: 30,
                    lifetime: [10, 18], size: [0.36, 0.08], sizeMode: "index",
                    color: 0x2E1A47, alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "farewell_wisp", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 20 }, shape: { kind: "circle", radius: { data: "radius", fallback: 3.0 } },
                    direction: "up", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [16, 30], size: [0.16, 0.03],
                    color: 0x8E5FD0, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        grief: {
            duration: 28,
            emitters: [
                {
                    name: "grief_core", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "darkness", fallback: 24 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18], spread: 24,
                    lifetime: [9, 16], size: [0.3, 0.06], sizeMode: "index",
                    color: 0x2E1A47, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "grief_wisp", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 16, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [14, 24], size: [0.13, 0.02],
                    color: 0x8E5FD0, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        remnant: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "remnant_flame", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 10, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [20, 34], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0x8E5FD0, alpha: [0.5, 0], alphaMode: "sin", light: "full", maxParticles: 26
                },
                {
                    name: "remnant_smoke", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 5, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [22, 38], size: [0.26, 0.06],
                    color: 0x2E1A47, alpha: [0.16, 0], light: "world", maxParticles: 24
                },
                {
                    name: "remnant_dust", bind: "point", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 28], size: [0.05, 0.01],
                    color: 0xB9AEC9, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        },
        wasted: {
            duration: 20,
            emitters: [
                {
                    name: "wasted_fade", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 22], size: [0.2, 0.04],
                    color: 0x2E1A47, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        fade: {
            duration: 24,
            emitters: [
                {
                    name: "fade_smoke", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 28], size: [0.24, 0.05],
                    color: 0x4B2A6B, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_memento", 1, MementoDefinition);
