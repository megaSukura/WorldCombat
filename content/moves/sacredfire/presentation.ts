/**
 * 神圣之火 / sacredfire 的客户端表现。
 *
 * 一句话：虹彩圣火从脚下升起裹住全身，随后一团虹火从身前飞出、沿瞄准方向逐段推进，撞上实体或方块炸开；
 * 友方被净火碰到时冰壳化开成彩汽，敌人则吃一记火击；圣火式在落点留一片慢慢灭的虹彩余焰。
 * 色相家族：金白（0xFFE0A0）是核心与主色，彩虹来自 `sparkle/shinesparkle_rainbow` 的原色；烟尘收在深褐（0x3A2E2A）。
 * 拍子：起 risen（升火）→ 飞 flight（彩虹尾，身体留原地）→ 击 hit（撞开）／thaw（化冰）／whiff（空爆）
 *   → 焚 flame（余焰，由场地效果托管）与 flamehit → fade。
 * 范围：flight 的 `data.path` 是服务端送出的原点与当刻前沿（与判定同一份头尾点）；
 *   flame／flamehit 的地面环按服务端 `data.radius`（机制余焰半径）画出，圈就是会被烫到的地。
 * 运动：虹火从身前沿路径飞出、撞击向外炸开、余焰贴地闷烧。
 * 数：火星数绑定 `data.sparks`（物攻与等级换算），强度绑定 `data.intensity`（威力派生），
 *   身量绑定 `data.scale`（判定半径 / 0.7）。
 */
const SacredfireDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        risen: {
            duration: 16,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "rising", bind: "source", offset: [0, 0.1, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 26, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.06, 0.22], spread: 12,
                    lifetime: [7, 14], size: [0.28, 0.05],
                    color: 0xFFE0A0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "rainbow", bind: "source", offset: [0, 0.1, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: 16, shape: { kind: "ring", radius: 0.46 },
                    direction: "up", speed: [0.05, 0.18],
                    lifetime: [8, 16], size: [0.12, 0.02],
                    alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 50
                }
            ]
        },
        flight: {
            duration: 0,
            emitters: [
                {
                    name: "cloak", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 44, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.04, 0.16], spread: 18,
                    lifetime: [6, 12], size: [0.28, 0.05],
                    color: 0xFFE0A0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "trail", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: { data: "sparks", fallback: 24 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.05, 0.2], spread: 22, drag: 0.9,
                    lifetime: [8, 16], size: [0.13, 0.02],
                    alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 140
                },
                {
                    name: "head", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 34, shape: { kind: "sphere", radius: 0.4 },
                    direction: "away", speed: [0.06, 0.24], spread: 20,
                    lifetime: [7, 13], size: [0.3, 0.05],
                    color: 0xFFF4D0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "embers", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 24, shape: { kind: "sphere", radius: 0.4 },
                    direction: "away", speed: [0.06, 0.22], spread: 24, gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xFFD06A, alpha: [0.85, 0], light: "full", maxParticles: 120
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "sparks", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.34], spread: 18,
                    lifetime: [7, 13], size: [0.42, 0.05], sizeMode: "index",
                    color: 0xFFF4D0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "rainbow", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "sparks", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.4], spread: 26,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [10, 20], size: [0.14, 0.02], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 100
                }
            ]
        },
        thaw: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "melt", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.12], spread: 14, drag: 0.9,
                    lifetime: [10, 18], size: [0.26, 0.44],
                    color: 0xBFE8F5, alpha: [0.45, 0], light: "world", maxParticles: 40
                },
                {
                    name: "rainbow", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "sparks", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.26], spread: 24,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.13, 0.02], sizeMode: "index",
                    alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 70
                }
            ]
        },
        whiff: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crater", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "sparks", fallback: 24 } },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.08, 0.32], spread: 16,
                    lifetime: [7, 13], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFFF4D0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "rainbow", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "sparks", fallback: 24 } },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.1, 0.38], spread: 24,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.13, 0.02], sizeMode: "index",
                    alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 100
                }
            ]
        },
        flame: {
            duration: 0,
            emitters: [
                {
                    name: "bed", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "flow", fallback: 40 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2 } },
                    direction: "up", speed: [0.02, 0.09], spread: 18,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0xFFE0A0, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "rainbow", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: 14, shape: { kind: "circle", radius: { data: "radius", fallback: 2 } },
                    direction: "up", speed: [0.01, 0.06], drag: 0.9,
                    lifetime: [14, 26], size: [0.11, 0.02],
                    alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "haze", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 12, shape: { kind: "circle", radius: { data: "radius", fallback: 2 } },
                    direction: "up", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [16, 28], size: [0.32, 0.5],
                    color: 0x3A2E2A, alpha: [0.25, 0], light: "world", maxParticles: 60
                }
            ]
        },
        flamehit: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.03, 0.13], spread: 16,
                    lifetime: [8, 15], size: [0.08, 0.01],
                    color: 0xFFE0A0, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "dying", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [14, 24], size: [0.32, 0.56],
                    color: 0x2E2624, alpha: [0.3, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sacredfire", 1, SacredfireDefinition);
