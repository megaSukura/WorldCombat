/**
 * 细雪 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者嘴边先凝起一层薄霜，随后朝瞄准方向吹出一整片扇形雪霰，白雾贴着扇面迅速铺开、随即散掉；
 *   被吹到的人身上各炸开一小撮霜并沿推开方向留下一道短雪痕，真的被冻住的人才罩上一层冰壳。
 * 色相家族：近白 0xF2FAFF 与冰蓝 0xCFEAF8／0x8FD0EC 为主；一个冷色相，没有强调色。
 * 层次：聚霜（windup）→ 扇面雪霰（puff）→ 命中与推退（impact）→ 冻结冰壳（frozen）→ 无尾场。
 * 范围：puff 用 `data.path`（起点 + 扇面弧上取样点）以 polygon 填满整片扇面——画出来的那片就是判定区，
 *   扇面的长度与张开角随机制变，玩家一眼知道站哪会被吹到；中间的方块会挡住雪。
 * 运动：雪霰从起点沿扇面快速向外铺开、带轻微重力下沉、边缘出现细碎的速度线；命中处霜点向外炸开，
 *   impact 的 `direction` 是服务端算出的实际推开方向，霜痕沿它溅出；冻结冰壳只在真的冻住时出现并收拢。
 * 数：`data.rate`（本招威力派生）决定扇面的粒子密度，`data.impactCount`（威力派生）决定命中霜点数。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PowdersnowDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "chill_breath", bind: "source", offset: [0, 0.8, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 24, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xF2FAFF, alpha: [0.5, 0], light: "world", maxParticles: 34
                }
            ]
        },
        puff: {
            duration: 14,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "fan_body", bind: "path", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    shape: { kind: "polygon" },
                    rate: { data: "rate", fallback: 80 }, direction: "shape", speed: [0.06, 0.24], gravity: 0.012, drag: 0.9,
                    lifetime: [6, 11], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [0.5, 0], light: "world", maxParticles: 200
                },
                {
                    name: "fan_fine", bind: "path", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    shape: { kind: "polygon" },
                    rate: { data: "rate", fallback: 80 }, direction: "shape", speed: [0.1, 0.32], gravity: 0.004,
                    lifetime: [5, 10], size: [0.08, 0.01],
                    color: 0xCFEAF8, alpha: [0.6, 0], light: "full", maxParticles: 180
                },
                {
                    name: "fan_edge", bind: "path", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" },
                    rate: { data: "rate", fallback: 80 }, direction: "shape", speed: [0.08, 0.28],
                    lifetime: [4, 9], size: [0.06, 0.01],
                    color: 0x8FD0EC, alpha: [0.5, 0], light: "full", maxParticles: 120
                }
            ]
        },
        impact: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "snow_pop", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "impactCount", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [7, 13], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "snow_dust", bind: "target", height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.025, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xCFEAF8, alpha: [0.45, 0], light: "world", maxParticles: 30
                },
                {
                    name: "shove_streak", bind: "target", height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 12, at: 1 }, amount: 2,
                    orient: "direction", shape: { kind: "cone", radius: 0.5, angleDegrees: 55, thickness: 0.8 },
                    direction: "shape", speed: [0.12, 0.3], gravity: 0.01,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xF2FAFF, alpha: [0.6, 0], light: "world", maxParticles: 36
                }
            ]
        },
        frozen: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "ice_shell", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 12, at: 1 }, amount: 1,
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.0, 0.03], spin: 16,
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0xBFE8FF, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "freeze_ring", bind: "target", offset: [0, 0.08, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.45, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.24, 0.02],
                    color: 0x8FD0EC, alpha: [0.55, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powdersnow", 1, PowdersnowDefinition);
