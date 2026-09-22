/**
 * 冰砾 / iceshard 的客户端表现。
 *
 * 一句话：冷气在手前收成一颗冰砾，随即沿直线高速甩出，拖着一条细冰碴尾；撞上谁就在接触处炸成一团冰屑、
 *   把那人裹上一层寒雾，落点地面结出一小片会滑的薄冰。砸到地形只炸起一撮雪尘。
 * 色相家族：冰蓝一族（0xBFE8F8 主体、0xE8F8FF 高光、0x8FC8E0 暗冰、0xD8E8F0 雪雾白）。
 * 拍子：起 charge（结冰）→ 飞 fly（冰砾与冰碴尾）→ 击 shatter（冰屑爆开）／冻 chill → 落 frost（薄冰）／收 dud。
 * 范围：fly 绑在飞行物本体上；shatter／frost 绑命中点，`data.scale` 是冰砾粗细、frost 的薄冰按 `data.scale` 铺开。
 * 运动：冰砾沿自身运动（orient: velocity）直线飞行，冰碴反向拖尾；崩开时冰屑向外翻、雪雾向下沉。
 * 数：fly 与 shatter 的冰碴量绑定 `data.splinters`（速度与等级换算），亮暗绑定 `data.intensity`（冰砾威力换算）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const IceshardDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 1 },
            exit: { stop: 2, drain: 8 },
            emitters: [
                {
                    name: "charge_crystal", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 22, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.05, 0.2],
                    spin: 12,
                    lifetime: [5, 10], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xE8F8FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 36
                },
                {
                    name: "charge_mist", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 16, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xD8E8F0, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fly: {
            duration: 60,
            exit: { stop: 50, drain: 12 },
            emitters: [
                {
                    name: "fly_shard", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 60, trail: { minDistance: 0.18 },
                    shape: { kind: "point" },
                    orient: "velocity", direction: "away", speed: [0.02, 0.1], spread: 14,
                    spin: 10,
                    lifetime: [6, 12], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xBFE8F8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 140
                },
                {
                    name: "fly_mist", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: { data: "splinters", fallback: 16 }, trail: { minDistance: 0.14 },
                    shape: { kind: "point" },
                    direction: "away", speed: [0.01, 0.06], spread: 20,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.09, 0.02], sizeMode: "index",
                    color: 0xD8E8F0, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        shatter: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shatter_burst", bind: "point", fit: "none", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.7, 1.5], sizeMode: "index",
                    color: 0xE8F8FF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 6
                },
                {
                    name: "shatter_shard", bind: "point", fit: "none", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "splinters", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.12, 0.42], spread: 26,
                    gravity: 0.07, drag: 0.9, spin: 14,
                    lifetime: [8, 15], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xBFE8F8, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "shatter_ring", bind: "point", fit: "none", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 15], size: [0.28, 0.6],
                    color: 0xE8F8FF, alpha: [0.5, 0], light: "full", maxParticles: 6
                }
            ]
        },
        chill: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "chill_frost", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.1],
                    gravity: 0.04, drag: 0.94,
                    lifetime: [10, 18], size: [0.14, 0.04],
                    color: 0xD8E8F0, alpha: [0.55, 0], light: "world", maxParticles: 30
                }
            ]
        },
        frost: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "frost_sheet", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: { data: "splinters", fallback: 16 }, at: 0 },
                    shape: { kind: "circle", radius: 1.2 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xBFE8F8, alpha: [0.6, 0], light: "world", maxParticles: 50
                },
                {
                    name: "frost_glint", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "circle", radius: 1.2 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xE8F8FF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        dud: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dud_puff", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "splinters", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02], sizeMode: "index",
                    color: 0xD8E8F0, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "dud_shard", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2],
                    gravity: 0.06, drag: 0.9, spin: 12,
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xBFE8F8, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_iceshard", 1, IceshardDefinition);
