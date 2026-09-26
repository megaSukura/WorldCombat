/**
 * 潜灵奇袭 / phantomforce 的粒子语言。
 *
 * 一句话：施法者身周收成一团向内旋的影、整个人陷进一道竖直的黑色裂隙里不见了 → 消失期间原地只剩一缕
 * 淡淡的影罩，而目标身后悄悄裂开一道暗口 → 暗口炸开时灵体穿出、一刀劈下，罩在目标身上的守护当场碎成
 * 一圈冷光。
 *
 * 色相家族：灵界深紫（0x6B4FA8）作主体，冷灰蓝（0x9BA8C8）给穿行与碎护的边光，近黑（0x241A33）做裂隙。
 * 与同族的暗影球/暗影之骨分开：这里是「先消失、再从守护里穿出」，靠竖直裂隙与碎护环读，不是一枚飞出去的球。
 * 拍子：起 fade（18t）→ 潜 veil（绑在真实守护效果上，逐刻续期，随相位结束或驱散一起收）→ 破 shatter（28t）
 * → 现 strike（34t）→ 收 whiff／空 air。
 * veil 只对应相位生命周期：finish 时收回守护，影罩表现随即释放，不会多播一段。
 *
 * 范围：strike 与 shatter 都绑目标点，半径由 data.scale 缩放（现身判定半径 / 0.55），玩家一眼知道这一刀能扫到多大；
 * 只朝点空斩的 air 绑落地点，让「没打到人」与「这一刀劈空」在画面上分得清。
 * 运动：fade 的影向内收束，shatter 的碎光从守护表面向外炸开。
 * 机制驱动：`data.scale`（现身判定半径 / 0.55）决定 strike／shatter 的尺寸，`data.broken`（震碎的守护层数）
 * 决定 shatter 的碎光数量与亮度，`data.vanish`（消失刻数）决定 fade 裂隙的持续与长度。
 */
const PhantomForceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 起：身周收影，一道竖直裂隙把整个人吞下去。
        fade: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fade_swirl", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 22, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [8, 16], size: [0.24, 0.05], sizeMode: "sin",
                    color: 0x6B4FA8, alpha: [0.6, 0], light: "world", maxParticles: 100
                },
                {
                    // Vertical tear: length follows data.vanish, so a deeper dive opens a longer rift.
                    name: "fade_rift", bind: "source", fit: "none", offset: [0, 0.25, 0], height: 0,
                    particle: "world_combat_core:cobblemon/moves/shadowball_impact",
                    burst: { count: 14, at: 2 }, shape: { kind: "line", length: { data: "vanish", fallback: 12 } },
                    direction: "down", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.34, 0.06],
                    color: 0x241A33, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "fade_lines", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 30, shape: { kind: "box", size: [0.3, 0.28, 0.3] },
                    direction: "inward", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.18, 0.05],
                    color: 0x9BA8C8, alpha: [0.6, 0], light: "full", maxParticles: 130
                }
            ]
        },
        // 潜：消失期间原地的一缕影罩，低密度、让出视线。
        veil: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "veil_smoke", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.26, 0.5],
                    color: 0x3A2A55, alpha: [0.28, 0], light: "world", maxParticles: 26
                },
                {
                    name: "veil_motes", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0x9BA8C8, alpha: [0.35, 0], light: "full", maxParticles: 22
                }
            ]
        },
        // 击：现身一刀，灵体从裂隙里穿出。
        strike: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "strike_core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 18, at: 1 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [7, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xDCE4FF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "strike_rend", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/moves/shadowball_impact",
                    burst: { count: 22 }, shape: { kind: "hemisphere", radius: 0.5, rotation: [180, 0, 0] },
                    direction: "down", speed: [0.06, 0.28], spread: 18,
                    lifetime: [8, 16], size: [0.28, 0.08],
                    color: 0x6B4FA8, alpha: [0.8, 0], light: "world", maxParticles: 120
                },
                {
                    name: "strike_wind", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.46 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0x241A33, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        // 击（破护）：守护从表面碎成一圈冷光，数量随 data.broken 增长。
        shatter: {
            duration: 26,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "shatter_ring", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 2, interval: 3 }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.18, 0.34],
                    lifetime: [12, 20], size: [0.3, 0.75],
                    color: 0x9BA8C8, alpha: [0.7, 0], light: "full"
                },
                {
                    name: "shatter_shards", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "wards", fallback: 6 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xDCE4FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 80
                }
            ]
        },
        // 空：只朝一个点发动、相位结束后短闪空斩，在落点炸开一团没有目标的影。
        air: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "air_rend", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/moves/shadowball_impact",
                    burst: { count: 16 }, shape: { kind: "hemisphere", radius: 0.5, rotation: [180, 0, 0] },
                    direction: "down", speed: [0.05, 0.22], spread: 18,
                    lifetime: [8, 16], size: [0.24, 0.07],
                    color: 0x6B4FA8, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "air_puff", bind: "point", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 20], size: [0.2, 0.34],
                    color: 0x3A2A55, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        // 挡：影罩把一次攻击吞掉时的一闪。
        phase: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "phase_flash", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [6, 12], size: [0.24, 0.04],
                    color: 0x9BA8C8, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        // 收：扑空，只落下一团散开的影。
        whiff: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "whiff_puff", bind: "target", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [12, 22], size: [0.22, 0.36],
                    color: 0x3A2A55, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_phantomforce", 1, PhantomForceDefinition);
