/**
 * 力量转换 / powershift 的客户端表现。
 *
 * 一句话：身侧先分出两股力道——左边一股偏暖（攻势）、右边一股偏冷（守势）→ 两股力道对流穿过彼此，
 *   在中间撞出一圈亮环，真正换过位置 → 此后交换还在的时间里，左右各留一圈很小的双色扣环（暖环移到右侧、
 *   冷环留在左侧，读出已经对调）→ 关闭的一刻两股力道各自回到原来的位置。
 * 色相家族：双色——攻势暖橙 0xFF8A4C 与守势青蓝 0x6FC7E8 对流，中性近白 0xEAF2F8 只落在锁定强调层。
 * 拍子：起（gather 0–16t）→ 转（cross 0–24t）→ 存（hum 持续）→ 收（fade）；缺项时短播 reject。
 * 范围：本招作用在自己身上；gather/cross/hum/fade 绑 `source` 随体型缩放，转段的亮环绑 `point`、fit none，
 *   半径按 `data.reach`（攻防差距 / 60，夹 0.4..1.6）推出，差距越大锁环张得越开。
 * 运动：gather 两股力道就地成形；cross 暖流向右、冷流向左穿过彼此；hum 暖环在右、冷环在左各极慢环绕；fade 彼此回到原位。
 * 数：对流条数与锁定粒子数绑 `data.bands`（物攻与防御之和派生），锁环半径绑 `data.reach`（攻防差距派生）；
 *   两样本钱差距越大，画面里的对流越密、亮环越开。
 * 持续：hum 绑在真正的交换窗口上（服务端 `WorldFeedback.onEffect`），窗口走完或提前清除会同步收回。
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
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_warm_ring", bind: "source", offset: [0.32, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2.2, shape: { kind: "ring", radius: 0.2 },
                    direction: "outward", speed: [0.004, 0.012], spin: 8,
                    lifetime: [16, 28], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xFF8A4C, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "hum_cool_ring", bind: "source", offset: [-0.32, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2.2, shape: { kind: "ring", radius: 0.2 },
                    direction: "outward", speed: [0.004, 0.012], spin: -8,
                    lifetime: [16, 28], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x6FC7E8, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 14
                }
            ]
        },
        reject: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "reject_warm", bind: "source", offset: [-0.4, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xFF8A4C, alpha: [0.4, 0], light: "world", maxParticles: 16
                },
                {
                    name: "reject_cool", bind: "source", offset: [0.4, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x6FC7E8, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 9, drain: 17 },
            emitters: [
                {
                    name: "revert_warm", bind: "source", offset: [0.35, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "point" }, direction: [-1, 0, 0], speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xFF8A4C, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
                {
                    name: "revert_cool", bind: "source", offset: [-0.35, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "point" }, direction: [1, 0, 0], speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x6FC7E8, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
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
