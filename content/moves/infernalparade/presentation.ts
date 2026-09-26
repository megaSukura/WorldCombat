/**
 * 群魔乱舞 / infernalparade 的客户端表现。
 *
 * 一句话：脚下腾起一圈幽蓝鬼火，散开冲成一队，各自扭头追向目标扑上去；被异常缠身的目标更容易被整队扑实、烧起来。
 * 色相家族：幽蓝紫为主（wisp / shadowball_impact），火只作小面积暖点（ember / impact_fire 的亮帧）。
 * 拍子：起（coven 0–6t 聚拢）→ 击（summon 散开、flight 每团沿真实投射物飞、strike 追踪扑击）→ 收（fade 空过、ignite 点燃）。
 * 范围：coven/summon 贴施法者，flight 绑各团真实投射物（`data.projectile`），strike / ignite 绑命中点——画面随鬼火实际落点走。
 * 运动：鬼火本体由投射物外观渲染，flight 轮廓沿同一位置拖行；到达起旋延迟前保持散开方向、之后才弯转，撞墙只散一团鬼气。
 * 数：`data.count`（本轮实际团数）决定起旋那一burst 的鬼火数，`data.strikeCount`（总威力 / 60 派生）决定扑击爆发的量，
 * `data.intensity` 同时抬高亮度与发射量，`data.scale`（单团判定 / 0.24）放大起旋地面环与飞行轮廓。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const InfernalparadeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coven: {
            duration: 10,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.25, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 16, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [8, 16], size: [0.12, 0.04], sizeMode: "sin",
                    color: 0x8FB3FF, alpha: [0.8, 0], light: "full", maxParticles: 44
                },
                {
                    name: "floor_ring", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 6, shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.28, 0.1],
                    color: 0x6FA8FF, alpha: [0.4, 0], light: "full", maxParticles: 26
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { drain: 8 },
            emitters: [
                {
                    name: "wisp_body", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    trail: { minDistance: 0.32 }, rate: 18,
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [4, 9], size: [0.13, 0.04],
                    color: 0x9FC2FF, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 46
                },
                {
                    name: "wisp_wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    trail: { minDistance: 0.5 }, rate: 10,
                    direction: "velocity", speed: [0.01, 0.06], drag: 0.94,
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0x6A8FE0, alpha: [0.5, 0], light: "world", maxParticles: 34
                }
            ]
        },
        summon: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "parade", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "count", fallback: 4 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.12, 0.4],
                    lifetime: [10, 18], size: [0.18, 0.05], sizeMode: "sin",
                    color: 0x9FC2FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 140
                },
                {
                    name: "wispsmoke", bind: "source", offset: [0, 0.4, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    burst: { count: 26 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [12, 22], size: [0.2, 0.05],
                    color: 0x6A8FE0, alpha: [0.5, 0], drag: 0.92, light: "world", maxParticles: 110
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "ghostburst", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/moves/shadowball_impact",
                    burst: { count: { data: "strikeCount", fallback: 0 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [7, 14], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xBFD4FF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "flames", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 30 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFB469, alpha: [0.9, 0], gravity: 0.03, drag: 0.9, light: "full", maxParticles: 120
                },
                {
                    name: "ghost_ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 16], size: [0.3, 0.12],
                    color: 0x8FB3FF, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        fade: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "dissipate", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0x7FA0E0, alpha: [0.6, 0], light: "full", maxParticles: 50
                }
            ]
        },
        ignite: {
            duration: 22,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "catch_fire", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "kindle", bind: "target", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xFF9A4D, alpha: [0.75, 0], light: "full", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_infernalparade", 1, InfernalparadeDefinition);
