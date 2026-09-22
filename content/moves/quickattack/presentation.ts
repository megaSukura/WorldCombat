/**
 * 电光一闪 / quickattack 的客户端表现。
 *
 * 一句话：脚下卷起一小股尘与速度线，身体化作一道贴地的白色直线射出去，撞上的一刻在接触点炸开一圈
 *   钝白冲击与向外扫开的速度线，然后立刻停住收势；冲空则只在地上留下一撮被带起的尘。
 * 色相家族：近白暖米（0xFFF6E2 / 0xFFF0C8）为主，速度线是浅米色，尘点是暖土棕，没有饱和色。
 * 拍子：起 coil（压低聚力）→ 冲 dash（直线速度线）→ 击 strike（钝白冲击）→ 收 miss（冲空带尘）。
 * 范围：dash 的速度线沿施法者实际走过的轨迹铺开，就是判定扫过的那条线；strike 绑命中点画在接触处。
 * 运动：起手是向内收拢的小环，冲刺是把速度线沿历史拖尾甩在身后，命中是短促的外爆、冲空是贴地尘圈。
 * 数：dash 的速度线数量绑定 `data.streak`（速度与等级换算），strike 的冲击量绑定 `data.count`
 *   （本击威力换算），亮度绑定 `data.intensity`（本击威力 / 60）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const QuickattackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: { data: "windup", fallback: 2 },
            exit: { stop: 2, drain: 8 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xC7A97B, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "coil_lines", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 10, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [5, 10], size: [0.18, 0.04],
                    color: 0xFFF4D8, alpha: [0.55, 0], light: "full", maxParticles: 24
                }
            ]
        },
        dash: {
            duration: 40,
            exit: { stop: 34, drain: 12 },
            emitters: [
                {
                    name: "streak", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "streak", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "away", speed: [0.06, 0.22],
                    lifetime: [4, 9], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xFFF4D8, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "rush_trail", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 30, trail: { minDistance: 0.28 },
                    shape: { kind: "point" },
                    direction: "away", speed: [0.03, 0.12],
                    lifetime: [3, 7], size: [0.16, 0.04],
                    color: 0xEADDC0, alpha: [0.5, 0], light: "full", maxParticles: 140
                },
                {
                    name: "kick_dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 26, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    gravity: 0.04, drag: 0.94,
                    lifetime: [7, 14], size: [0.07, 0.02],
                    color: 0xBFA377, alpha: [0.5, 0], light: "world", maxParticles: 140
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "count", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.07, 0.26],
                    lifetime: [5, 10], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFF6E2, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 56
                },
                {
                    name: "scatter", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "count", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.28], spread: 22,
                    lifetime: [4, 9], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFE9BC, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "skid", bind: "target", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xBFA377, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "overrun", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "streak", fallback: 16 }, at: 0 },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.15],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02], sizeMode: "index",
                    color: 0xBFA377, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_quickattack", 1, QuickattackDefinition);
