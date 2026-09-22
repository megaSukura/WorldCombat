/**
 * 食梦 / dreameater 的客户端表现。
 *
 * 一句话：施法者眼眶亮起紫光、身边聚起梦的碎光 → 一道梦烟从熟睡目标的头顶被拉起，沿一条螺旋的线抽进施法者
 * 口里 → 目标头顶炸开一小团紫色梦雾，施法者身上浮起回血的紫白光环。醒着的目标脚下只散开一点困意（fizzle）。
 *
 * 色相家族：梦紫（0x8E5BD0／0x4B2A6B）与近白紫（0xE8D9FF），近白只给吸取核心与回血层；无第二色相。
 * 拍子：起 sink（聚梦）→ 抽 draw（梦烟连线）→ 食 feast（头顶炸开）＋ 汲 sap（施法者回血）／空 fizzle。
 * 范围：draw 的抽取线长度读 `data.span`（真实抽取距离），方向读 `data.direction`；线到哪，玩家就看得见抽到哪。
 * 运动：dream 从目标头顶向上浮起再被拉走，pull/thread 沿「目标→自身」把梦烟吸回；sap 在施法者身上向上冒起。
 * 数：`data.motes`（特攻与梦深换算）决定梦烟与抽取线的密度，`data.depth`（0..1 梦深）决定梦雾的浓度与尺寸，
 *   `data.sap`（回血比例百分比）决定施法者回血层的量。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DreameaterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        sink: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.07], spread: 12, spin: 24,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0x8E5BD0, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "eye", bind: "source", height: 0.92,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "circle", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8D9FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        draw: {
            duration: 34,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "thread", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.02, 0.08], spread: 8, spin: 30,
                    lifetime: [8, 16], size: [0.13, 0.02], sizeMode: "index",
                    color: 0x8E5BD0, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 130
                },
                {
                    name: "dream", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.10],
                    lifetime: [10, 18], size: [{ data: "depth", fallback: 0.2 }, 0.05],
                    color: 0xB08CFF, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "pull", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    shape: { kind: "line", length: { data: "span", fallback: 8 } },
                    rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.08, 0.24], spread: 10,
                    lifetime: [6, 14], size: [0.09, 0.02],
                    color: 0xE8D9FF, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 90
                }
            ]
        },
        feast: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.95,
                    particle: "world_combat_core:cobblemon/moves/psychichit",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 44
                },
                {
                    name: "dark", bind: "target", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [7, 13], size: [0.28, 0.04], sizeMode: "index",
                    color: 0x4B2A6B, alpha: [0.9, 0], light: "full", maxParticles: 16
                }
            ]
        },
        sap: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "mend", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "sap", fallback: 12 } }, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [12, 20], size: [0.1, 0.01],
                    color: 0xE8D9FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 44
                },
                {
                    name: "rise", bind: "source", height: 0.18,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 6, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.24, 0.5],
                    color: 0x8E5BD0, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "no_dream", bind: "point", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_passive",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 16], size: [0.14, 0.03],
                    color: 0x8E5BD0, alpha: [0.45, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dreameater", 1, DreameaterDefinition);
