/**
 * 治愈波动 / Heal Pulse 的粒子语言。
 *
 * 一句话：施法者胸口拢起一圈温润的蓝白光，一收一放把它推出去；波沿直线飞向伙伴，抵达时整圈化开、把他裹住。
 * 色相家族：波青 0x8FD8E8 作主体，近白 0xEAFBFF 作高光与回复，淡紫 0x9AA8E0 只作余韵。
 * 拍子：起（windup）／送（emit）／行（seek）／化（wash）；被挡下或伙伴离场时走 fizzle。
 * 范围：emit 的环与 wash 的环半径都绑定 data.radius（波动半径），画出的正是判定用的尺度；seek 沿 data.path（施法者→伙伴的连线）铺开。
 * 运动：seek 的波沿两端身体之间的连线一束束涌向伙伴（direction: toward），涌动的时长由服务端的飞行时间决定（消息到期即收），
 *   玩家从光带持续多久读出这一口要赶多远；抵达时 wash 在伙伴身上整圈化开。
 * 数：波动光点绑定 data.motes（特攻换算），wash 的化开数量再乘 data.share（实际回复占最大生命的比例），
 *   所以补得越足、画面越亮越满；overcharge 时 emit 更沉更亮。
 */
const HealPulseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.65, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "motes", fallback: 18 }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.75 } },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x8FD8E8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 50
                },
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 5, shape: { kind: "ring", radius: { data: "radius", fallback: 0.75 } },
                    direction: "inward", speed: [0.01, 0.03],
                    lifetime: [8, 14], size: [0.24, 0.06],
                    color: 0x9AA8E0, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        emit: {
            duration: 28,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "push_ring", bind: "source", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "radius", fallback: 0.75 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: { data: "radius", fallback: 0.75 }, sizeMode: "linear",
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "full", maxParticles: 12
                },
                {
                    name: "push_motes", bind: "source", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.75 } },
                    direction: "outward", speed: [0.05, 0.18], drag: 0.94,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        seek: {
            duration: 44,
            exit: { stop: 40, drain: 8 },
            emitters: [
                {
                    name: "wave_lane", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: { data: "motes", fallback: 18 }, interval: 2, repeats: 12 },
                    shape: { kind: "polyline", closed: false }, direction: "toward", orient: "direction",
                    speed: [0.08, 0.2], drag: 0.9,
                    lifetime: [6, 12], size: { data: "scale", fallback: 0.2 }, sizeMode: "sin",
                    color: 0x8FD8E8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 100
                },
                {
                    name: "wave_spark", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 18 }, interval: 2, repeats: 12 },
                    shape: { kind: "polyline", closed: false }, direction: "toward",
                    speed: [0.1, 0.26], drag: 0.92,
                    lifetime: [5, 10], size: [0.06, 0.01],
                    color: 0xEAFBFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 90
                }
            ]
        },
        wash: {
            duration: 32,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "wash_ring", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 4 }, shape: { kind: "circle", radius: { data: "radius", fallback: 0.75 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: { data: "scale", fallback: 0.3 },
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "full", maxParticles: 20
                },
                {
                    name: "wash_motes", bind: "target", offset: [0, 0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 18 }, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.75 } },
                    direction: "up", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xEAFBFF, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "wash_glow", bind: "target", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "glow", fallback: 8 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0x9AA8E0, alpha: [0.4, 0], light: "full", maxParticles: 24
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "break", bind: "source", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.6 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0x9AA8E0, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_healpulse", 1, HealPulseDefinition);
