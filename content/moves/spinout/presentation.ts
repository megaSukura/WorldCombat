/**
 * 疾速转轮 / spinout 的客户端表现。
 *
 * 一句话：施法者压低重心、脚边火星先转成一圈 → 整个人像陀螺一样贴地旋进，沿途拖出旋转的钢蓝气流与火星 →
 *   撞上目标炸开钢色冲击，地面磨出一圈痕迹，随后转速刹不住、身上浮起疲软的灰气（速度大降）。
 * 色相家族：钢蓝灰（0x6E7C8C 主体、0x9AA6B4 亮面）为主体，磨地火星的暖橙（0xFFC766）只在细节层，
 *   中性尘作余韵；无第二色相。
 * 拍子：起 wind（压腿旋起）→ 旋 spin（贴地旋进）→ 击 impact（撞实磨地）→ 收 stagger（失速）／失 miss（空转）。
 * 范围：is 一条冲刺线 + 撞击点；impact 的磨痕圈按 `data.radius`（磨痕半径）与 `data.scale` 铺开，
 *   画出的那圈就是地上被磨到的地方。
 * 运动：spin 的钢蓝气流绕身体公转并沿运动方向拖尾；impact 的冲击从撞击点向外崩、火星带重力落回；
 *   stagger 的灰气缓慢上飘。
 * 数：`data.sparks`（速度与体重换算的火星量）决定旋进与撞击的火星密度，`data.intensity`（威力 / 100）
 *   抬高密度与亮度，`data.radius`（磨痕半径）决定撞击点那圈痕迹。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SpinoutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wind: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "leg_scuff", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 26, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.07, drag: 0.9,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0x8C8375, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "grind_spark", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "sparks", fallback: 14 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.2], spin: 16,
                    lifetime: [5, 11], size: [0.08, 0.01],
                    color: 0xFFC766, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 70
                }
            ]
        },
        spin: {
            duration: 0,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gyro", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    trail: { minDistance: 0.2 }, rate: 60,
                    direction: "velocity", speed: [0.0, 0.02], spin: 30,
                    lifetime: [5, 10], size: [0.34, 0.06], sizeMode: "index",
                    color: 0x9AA6B4, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 130
                },
                {
                    name: "drill", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/drill",
                    rate: 26, shape: { kind: "sphere", radius: 0.4 },
                    direction: "velocity", speed: [0.05, 0.18], spin: 24,
                    lifetime: [5, 10], size: [0.24, 0.04],
                    color: 0x6E7C8C, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "dashline", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    trail: { minDistance: 0.26 }, rate: 30,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.26, 0.08],
                    color: 0xC9CFD6, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "trail_spark", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "sparks", fallback: 14 },
                    direction: "velocity", speed: [0.04, 0.16], spin: 18,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFC766, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 90
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "crush", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.1, 0.32], spread: 28,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE6EDF2, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "scuff", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.2 } },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 18], size: [0.5, 1.1], sizeMode: "sin",
                    color: 0x6E7C8C, alpha: [0.5, 0], light: "world", maxParticles: 6
                },
                {
                    name: "ground_spark", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.2 } },
                    direction: "up", speed: [0.05, 0.2], spin: 20, spread: 24,
                    gravity: 0.09, drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xFFC766, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.2 } },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.05, drag: 0.92,
                    lifetime: [12, 20], size: [0.06, 0.02],
                    color: 0x8C8375, alpha: [0.4, 0], light: "world", maxParticles: 80
                }
            ]
        },
        stagger: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "fatigue", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "fatigue", fallback: 20 } },
                    shape: { kind: "box", size: [0.55, 0.65, 0.55] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x9AA6B4, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "circle", radius: 0.8 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x8C8375, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spinout", 1, SpinoutDefinition);
