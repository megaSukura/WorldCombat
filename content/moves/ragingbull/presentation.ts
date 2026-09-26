/**
 * 怒牛 / ragingbull 的客户端表现。
 *
 * 一句话：低头压角、身周聚起一圈随形态变色的角气后沿直线冲出去，蹄下拖出一道尘迹与速度线；角尖撞上
 * 谁，谁就被整套冲势撞开，屏障随之炸成碎片。
 * 色相家族：蹄尘与近白（冲撞本身）为底，角气用随形态变化的单色 tint（普通灰白／格斗赤红／火橘／水蓝），
 * 屏障碎片用一处冷蓝高光。
 * 拍子：起（windup 聚气）→ 冲（charge 尘迹与速度线）→ 撞（ram 角气爆发）→ 碎（break 真实穿越处的碎片）→ 收（settle 刹停扬尘）。
 * 范围：这是一条直线冲撞，运动本身画出作用范围；ram 绑命中点，break 的碎片出现在身体真实扫过的屏障处，终点 settle 收势。
 * 运动：角气向内收再顺着冲势向外甩，蹄尘贴地拖尾，命中是短促外爆，碎片带重力四散。
 * 数：`data.scale`（牛身半径 / 0.5）放大尘迹与爆发，`data.power`（冲撞威力）绑定角气火花的发射量，
 * `data.wards`（实际撞碎的屏障层数）绑定碎片波数。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const RagingbullDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: 18, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.24, 0.08], sizeMode: "sin",
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "hoof", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x8A6A50, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        charge: {
            duration: 48,
            exit: { stop: 36, drain: 14 },
            emitters: [
                {
                    name: "speed", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 28, shape: { kind: "circle", radius: 0.4 },
                    direction: "away", speed: [0.08, 0.24], orient: "velocity",
                    lifetime: [5, 10], size: [0.22, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", bloom: 0.15, maxParticles: 120
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x9A7A58, alpha: [0.45, 0], light: "world", maxParticles: 140
                }
            ]
        },
        ram: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "power", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.08, 0.28], spread: 22,
                    lifetime: [7, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "gust", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.12, 0.3],
                    lifetime: [8, 14], size: [0.6, 0.2], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x8A6A50, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        },
        break: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "shards", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "wards", fallback: 0 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.26], spread: 28,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xBFD8F0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 100
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 22, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.12, 0.26],
                    lifetime: [10, 18], size: [0.5, 0.18], sizeMode: "sin",
                    color: 0xDCEFFF, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        settle: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0x9A7A58, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ragingbull", 1, RagingbullDefinition);
