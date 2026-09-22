/**
 * 喷水 / waterspout 的客户端表现。
 *
 * 一句话：水先在脚边兜成一颗越涨越大的水团 → 潮头贴着地一圈圈向外漫出去，浪墙上翻、泡沫四溅，
 *   被扫到的人各自炸开水花、被推着走并被浇透（回卷式则水向内收，把人往中心带）。
 * 色相家族：水蓝的一族（0x4FB6E8／0x8FD6F5 为主体，0xE8F8FF 只做浪头高光，水汽用中性灰）。
 * 拍子：起（gather 兜水）→ 涌（surge 潮头一格格外推、hit 拍中、douse 浇熄）→ 退（recede 湿痕）。
 * 范围：surge 的地面环按服务端逐个刷新的 `data.radius`（潮头当前半径）画出，圈到哪就是会扫到哪。
 * 运动：潮头沿地表向外扩，浪墙向上翻；回卷式的 inward 层把水与泡沫向中心收。
 * 数：`data.volume`（体重派生的水量）决定浪花密度，`data.scale`（潮头距离派生）决定粒子尺度，
 *   `data.step`／`data.steps`（推进进度）决定潮头的明暗轻重——画面里的数与机制里的数一致。
 */
const WaterspoutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "pool", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 12, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.24, 0.5],
                    color: 0x8FD6F5, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "gather_spray", bind: "source", offset: [0, 0.25, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: { data: "volume", fallback: 20 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0x6FC6E8, alpha: [0.7, 0], light: "full", maxParticles: 70
                }
            ]
        },
        surge: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "wall", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "ring", radius: { data: "radius", fallback: 1 } },
                    direction: "up", speed: [0.1, 0.34], spread: 16,
                    lifetime: [8, 16], size: [0.28, 0.07],
                    color: 0x8FD6F5, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 160
                },
                {
                    name: "crest", bind: "point", fit: "none", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "ring", radius: { data: "radius", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.3], spread: 22,
                    lifetime: [8, 15], size: [0.16, 0.04],
                    color: 0x6FC6E8, alpha: [0.6, 0], light: "world", maxParticles: 180
                },
                {
                    name: "foam", bind: "point", fit: "none", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: { data: "volume", fallback: 30 }, shape: { kind: "ring", radius: { data: "radius", fallback: 1 } },
                    direction: "outward", speed: [0.12, 0.38], spread: 30, gravity: 0.05, drag: 0.94,
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0xBFE8FA, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "undertow_pull", bind: "point", fit: "none", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: { data: "inward", fallback: 0 }, shape: { kind: "ring", radius: { data: "radius", fallback: 1 } },
                    direction: "inward", speed: [0.12, 0.4], spread: 18,
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0x8FD6F5, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "soak_burst", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "splash", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26, gravity: 0.07, drag: 0.92,
                    lifetime: [8, 16], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xBFE8FA, alpha: [0.95, 0], light: "full", maxParticles: 70
                },
                {
                    name: "soak_ring", bind: "target", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.28, 0.7],
                    color: 0x8FD6F5, alpha: [0.55, 0], light: "world", maxParticles: 6
                },
                {
                    name: "soak_drops", bind: "target", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "splash", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xE8F8FF, alpha: [0.6, 0], light: "full", maxParticles: 50
                }
            ]
        },
        douse: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "steam", bind: "target", offset: [0, 0.3, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [14, 26], size: [0.3, 0.14],
                    color: 0xB9C4CC, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        recede: {
            duration: 26,
            exit: { drain: 20 },
            emitters: [
                {
                    name: "wet_ground", bind: "point", fit: "none", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.2 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [14, 24], size: [0.3, 0.9],
                    color: 0x8FD6F5, alpha: [0.35, 0], light: "world", maxParticles: 4
                },
                {
                    name: "residue", bind: "point", fit: "none", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "volume", fallback: 20 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.2 } },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.04, drag: 0.92,
                    lifetime: [12, 22], size: [0.07, 0.02],
                    color: 0xBFE8FA, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_waterspout", 1, WaterspoutDefinition);
