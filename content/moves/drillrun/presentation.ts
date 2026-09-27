/**
 * 直冲钻 / drillrun 的客户端表现。
 *
 * 一句话：脚下的尘土先旋转升起，随后一支旋转的钻头贴地冲出、钻轴对准行进方向、锥形钻尖在前，
 * 钻身沿冲程甩出一串螺旋粒子与速度线；命中处迸出石屑，钻过的路线扬起一道贴地短尘，暴击时钻花更亮。
 * 色相家族：土黄与岩灰（earth／large_rock／impact_ground／tinydust）＋白亮钻尖（smallsparkle／glowingsparkle_yellow）。
 * 拍子：起（windup 起旋扬尘）→ 钻（spin 旋转冲刺、沿 path 甩粒子、bore 命中）→ 尘（dust 贴地余尘）→ 强调（crit）。
 * 范围：`data.scale` 与钻头判定同源；dust 的 path 是服务端真实走过的地面采样点，画面即那条冲程。
 * 运动：钻头贴着地面沿 `data.direction` 直线前进、钻身自转，命中石屑向外迸，落点余尘慢慢沉下。
 * 数：`data.sparks`（物攻换算的碎屑量）绑定命中与钻身的量；`data.dustTicks` 决定余尘留多久；`data.progress` 让钻花随冲程变亮。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DrillrunDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "kickup", bind: "source", offset: [0, 0.06, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "ring", radius: 0.5 }, direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 16], size: [0.09, 0.03], spin: 8,
                    color: 0x9A8258, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "revup", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/drill",
                    rate: 12, shape: { kind: "circle", radius: 0.35 }, direction: "shape", speed: [0.05, 0.2],
                    lifetime: [6, 10], size: [0.34, 0.1], spin: 22,
                    color: 0xD8C08A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        spin: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "bore_body", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/drill",
                    rate: { data: "sparks", fallback: 16 }, shape: { kind: "cylinder", radius: 0.4, length: 0.9, thickness: 0 },
                    orient: "direction", direction: "shape", speed: [0.06, 0.22], spread: 20,
                    lifetime: [5, 10], size: [0.4, 0.12], spin: 30,
                    color: 0xE0C98E, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 130
                },
                {
                    name: "drill_tip", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "sparks", fallback: 16 }, shape: { kind: "cone", radius: 0.26, angleDegrees: 18 },
                    direction: "shape", speed: [0.05, 0.22], spread: 18,
                    lifetime: [4, 8], size: [0.28, 0.08], spin: 24,
                    color: 0xFFF4D0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "dash_trail", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    trail: { minDistance: 0.22 },
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    rate: 40, shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.04, 0.16],
                    lifetime: [7, 13], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xBFA871, alpha: [0.5, 0], light: "world", maxParticles: 140
                },
                {
                    name: "spin_edge", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 20, shape: { kind: "line", length: 0.9 },
                    orient: "direction", direction: "shape", speed: [0.02, 0.08],
                    lifetime: [4, 8], size: [0.34, 0.08],
                    color: 0xF2E6C4, alpha: [0.55, 0], light: "full", bloom: 0.25, maxParticles: 70
                }
            ]
        },
        bore: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "chip_burst", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "sparks", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.26], spread: 26,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xE4CE96, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "chip_rock", bind: "target", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.12, drag: 0.92,
                    lifetime: [10, 18], size: [0.1, 0.03],
                    color: 0x7E6B48, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        dust: {
            duration: { data: "dustTicks", fallback: 120 },
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "dust_line", bind: "path", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" }, rate: { data: "sparks", fallback: 16 }, stop: 10, direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.1, 0.03],
                    color: 0x8A744C, alpha: [0.55, 0], light: "world", maxParticles: 90
                },
                {
                    name: "settle_dust", bind: "point", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, stop: { data: "dustTicks", fallback: 120 },
                    shape: { kind: "sphere", radius: 0.6 }, direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [16, 28], size: [0.07, 0.02],
                    color: 0x8E8064, alpha: [0.32, 0], light: "world", maxParticles: 50
                },
                {
                    name: "quake", bind: "point", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 0 }, shape: { kind: "point" },
                    lifetime: [12, 16], size: [0.7, 0.2],
                    color: 0xC7B183, alpha: [0.6, 0], light: "world", maxParticles: 4
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 5, drain: 11 },
            emitters: [
                {
                    name: "wall_spark", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.08, 0.28], spread: 34,
                    lifetime: [5, 10], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 30
                },
                {
                    name: "wall_chip", bind: "point", offset: [0, 0.24, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 10, at: 0 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.12, drag: 0.92,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x7E6B48, alpha: [0.65, 0], light: "world", maxParticles: 30
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vital_spark", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.08, 0.26], spread: 26,
                    lifetime: [8, 15], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 42
                },
                {
                    name: "vital_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 1, at: 0 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 16], size: [0.5, 0.12],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.55, maxParticles: 8
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.08,
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0x9A8C6C, alpha: [0.3, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_drillrun", 1, DrillrunDefinition);
