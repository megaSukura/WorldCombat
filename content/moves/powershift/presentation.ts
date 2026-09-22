/**
 * 力量转换 / powershift 的客户端表现。
 *
 * 一句话：身侧先分出两股力道——左边一股偏暖（攻势）、右边一股偏冷（守势）→ 两股力道对流穿过彼此，
 *   在中间撞出一圈亮环 → 亮环与粒子锁住的一刻，两股力道交换了位置；此后交换还在的时间里，左右各留一层极淡的光。
 * 色相家族：双色——攻势暖橙 0xFF8A4C 与守势青蓝 0x6FC7E8 对流，中性近白 0xEAF2F8 只落在锁定强调层。
 * 拍子：起（gather 0–16t）→ 转（cross 0–24t）→ 锁（lock 0–28t）→ 存（hum 持续）→ 收（fade）。
 * 范围：本招作用在自己身上；gather/cross/hum/fade 绑 `source` 随体型缩放，lock 的地面环绑 `point`、fit none，
 *   半径按 `data.reach`（攻防差距 / 60，夹 0.4..1.6）推出，差距越大锁环张得越开。
 * 运动：gather 两股力道就地成形；cross 暖流向右、冷流向左穿过彼此；lock 亮环向外一推并锁住；hum 左右各一层极慢环绕；fade 向内收回。
 * 数：对流条数与锁定粒子数绑 `data.bands`（物攻与防御之和派生），锁环半径绑 `data.reach`（攻防差距派生）；
 *   两样本钱差距越大，画面里的对流越密、锁环越开。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PowerShiftDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "warm_wisp", bind: "source", offset: [-0.45, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFF8A4C, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "cool_wisp", bind: "source", offset: [0.45, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x6FC7E8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        cross: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "warm_flow", bind: "source", offset: [-0.5, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "bands", fallback: 14 }, at: 1 },
                    shape: { kind: "point" }, direction: [1, 0, 0], speed: [0.25, 0.55],
                    lifetime: [6, 11], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFF8A4C, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "cool_flow", bind: "source", offset: [0.5, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "bands", fallback: 14 }, at: 1 },
                    shape: { kind: "point" }, direction: [-1, 0, 0], speed: [0.25, 0.55],
                    lifetime: [6, 11], size: [0.32, 0.05], sizeMode: "index",
                    color: 0x6FC7E8, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "cross_spark", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "bands", fallback: 14 }, at: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xEAF2F8, alpha: [0.9, 0], light: "full", maxParticles: 80
                }
            ]
        },
        lock: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "lock_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "reach", fallback: 0.9 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: [0.45, 0.95], sizeMode: "index",
                    color: 0xEAF2F8, alpha: [0.8, 0], light: "full", maxParticles: 14
                },
                {
                    name: "lock_spark", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "bands", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: { data: "reach", fallback: 0.9 } },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x9FD8E8, alpha: [0.92, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_warm", bind: "source", offset: [-0.35, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 2, shape: { kind: "ring", radius: 0.25 },
                    direction: "up", speed: [0.004, 0.014],
                    lifetime: [16, 28], size: [0.06, 0.01], sizeMode: "sin",
                    color: 0xFF8A4C, alpha: [0.22, 0], alphaMode: "sin", light: "world", maxParticles: 12
                },
                {
                    name: "hum_cool", bind: "source", offset: [0.35, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 2, shape: { kind: "ring", radius: 0.25 },
                    direction: "up", speed: [0.004, 0.014],
                    lifetime: [16, 28], size: [0.06, 0.01], sizeMode: "sin",
                    color: 0x6FC7E8, alpha: [0.22, 0], alphaMode: "sin", light: "world", maxParticles: 12
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 9, drain: 17 },
            emitters: [
                {
                    name: "revert_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: { data: "reach", fallback: 0.9 } },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.26, 0.05],
                    color: 0xEAF2F8, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powershift", 1, PowerShiftDefinition);
