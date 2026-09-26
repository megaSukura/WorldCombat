/**
 * 水流尾 / aquatail 的客户端表现。
 *
 * 一句话：尾巴甩起、水光在身侧聚成一道弧 → 浪头从贴身一圈圈向前压出去，每一拍都有一道填满的弧形水墙，
 *   浪头拍到谁，谁身上炸开水花并被推走；被浇熄的火腾起水汽 → 浪推到头，地上只留一片湿痕。
 * 色相家族：水蓝的一族（0x6FC6E8 / 0x8FD4F0 为主体，0xE8F8FF 只做浪头高光，水汽用中性灰）。
 * 拍子：起 lash（甩尾聚水）→ 推 crest（每拍一道弧，叠成推进的浪）→ 击 hit（拍中）／浇 douse（水汽）→ 收 miss（空浪湿痕）。
 * 范围：crest 用与判定同一组 `data.path` 顶点填出弧形环带，玩家一眼看出站在哪条弧里会被拍到。
 * 运动：弧带随 `data.step`／`data.steps` 一站一站往外推，浪头朝 `data.direction` 向外翻卷；
 *   `data.outer` 同时驱动一条从尾根沿同一朝向扫到浪头的细水线，把这一挥的来路连出来，不留下持续水域。
 * 数：水花量绑定 `data.splash`（物攻与体重换算），弧带尺度绑定 `data.scale`（尾长换算），亮度绑定 `data.intensity`（浪威力换算）。
 */
const AquaTailDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        lash: {
            duration: { data: "windup", fallback: 11 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lash_water", bind: "source", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 26, shape: { kind: "arc", radius: 0.7, arcDegrees: 150, rotation: [0, 40, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [7, 13], size: [0.14, 0.03],
                    color: 0x8FD4F0, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "lash_ring", bind: "source", offset: [0, 0.05, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/water/ripple_white",
                    rate: 6, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [0.24, 0.5],
                    color: 0xE8F8FF, alpha: [0.5, 0], light: "world", maxParticles: 14
                }
            ]
        },
        crest: {
            duration: 14,
            exit: { stop: 10, drain: 10 },
            emitters: [
                {
                    name: "crest_sheet", bind: "path", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    shape: { kind: "polygon" },
                    rate: 120, direction: "up", speed: [0.03, 0.12], spread: 20,
                    lifetime: [7, 13], size: [0.14, 0.04],
                    color: 0x6FC6E8, alpha: [0.45, 0], light: "world", maxParticles: 200
                },
                {
                    name: "crest_edge", bind: "path", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "outward", speed: [0.1, 0.34], spread: 20,
                    lifetime: [7, 15], size: [0.26, 0.07],
                    color: 0xE8F8FF, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "crest_spray", bind: "path", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    shape: { kind: "polygon" },
                    burst: { count: { data: "splash", fallback: 14 }, at: 0 },
                    direction: "outward", speed: [0.12, 0.36], spread: 30,
                    gravity: 0.06, drag: 0.94,
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0xBFE8FA, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "crest_sweep", bind: "source", fit: "world", offset: [0, 0.15, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    shape: { kind: "line", length: { data: "outer", fallback: 3.6 } },
                    burst: { count: 7, at: 0 }, direction: "shape", speed: [0.06, 0.22], spread: 8,
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0x8FD4F0, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_splash", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "splash", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26,
                    gravity: 0.07, drag: 0.92,
                    lifetime: [8, 16], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xBFE8FA, alpha: [0.95, 0], light: "full", maxParticles: 70
                },
                {
                    name: "hit_ring", bind: "target", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.28, 0.7],
                    color: 0x8FD4F0, alpha: [0.55, 0], light: "world", maxParticles: 6
                }
            ]
        },
        douse: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "douse_steam", bind: "target", offset: [0, 0.3, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [14, 26], size: [0.3, 0.12],
                    color: 0xB9C4CC, alpha: [0.45, 0], light: "world", maxParticles: 40
                },
                {
                    name: "douse_drops", bind: "target", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xE8F8FF, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "miss_puddle", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.3, 0.8],
                    color: 0x8FD4F0, alpha: [0.35, 0], light: "world", maxParticles: 4
                },
                {
                    name: "miss_dust", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xBFE8FA, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aquatail", 1, AquaTailDefinition);
