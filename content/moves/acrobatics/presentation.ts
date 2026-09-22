/**
 * 杂技 / acrobatics 的客户端表现。
 *
 * 一句话：施法者压成弹簧蓄势，脚边卷起一圈风丝，随后腾身翻滚着撞出去，在接触点炸开一片近白气旋，
 * 再顺着势头从对方身侧滑过、留下一道贴地风尘。
 * 色相家族：近白与浅青（swirlingwind / impact_flying / speedlines）为体，没有饱和色；空手翻倍时颜色更亮、气旋更密。
 * 拍子：起（crouch 蓄势）→ 飞（launch 腾身）→ 击（impact 气旋爆）→ 收（miss 冲空 / 滑出）。
 * 范围：impact 绑命中点，画出的就是撞中的位置；launch 的风丝沿施法者实际翻过的轨迹铺开。
 * 运动：蓄势时风丝内旋，翻滚时气旋沿历史拖尾，命中是外向的浅青爆，滑出是贴地风尘。
 * 数：`data.motes`（速度派生的气旋数）驱动腾身与命中的粒子量；`data.intensity`（本击伤害占比）放大爆发，`data.bare` 使空手那一翻更亮更密。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const AcrobaticsDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        crouch: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 30, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [5, 11], size: [0.14, 0.03],
                    color: 0xEAF6FF, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        launch: {
            duration: 42,
            exit: { stop: 30, drain: 14 },
            emitters: [
                {
                    name: "spin", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "motes", fallback: 14 }, trail: { minDistance: 0.34 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [5, 11], size: [0.16, 0.03],
                    color: 0xE6F7FF, alpha: [0.55, 0], light: "world", maxParticles: 150
                },
                {
                    name: "streaks", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 34, shape: { kind: "box", size: [0.3, 0.5, 0.3] },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [3, 8], size: [0.16, 0.03],
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", maxParticles: 120
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [5, 10], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xF2FBFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "gale", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.1, 0.3], drag: 0.9,
                    lifetime: [7, 15], size: [0.13, 0.02],
                    color: 0xD6F0FF, alpha: [0.7, 0], light: "world", maxParticles: 130
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [8, 16], size: [0.46, 0.18],
                    color: 0xFFFFFF, alpha: [0.55, 0], light: "world", maxParticles: 4
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "skid", bind: "point", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.02, drag: 0.92,
                    lifetime: [6, 13], size: [0.1, 0.02],
                    color: 0xDCEFF7, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_acrobatics", 1, AcrobaticsDefinition);
