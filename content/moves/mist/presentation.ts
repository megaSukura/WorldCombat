/**
 * 白雾 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：一口白雾从施法者身上漫开，铺成一圈罩住它和身边的队友；雾里一旦有人要被压低，
 * 一小股雾就卷过去把那条下降吞掉；雾走到尽头时整片安静变淡散开。
 *
 * 色相家族：雾白青（0xBFE6F0）为主体，近白（0xE8F6FA）做高光，灰青（0x9FC3CC）做脚下影与淡出。
 * 一个效果一个色相家族。要遮挡是这招的本意，所以主体层可以密；但持续层压在脚下与身侧，让出目标本体视线。
 * 层次：吐雾（起手，源侧）／铺开环＋雾团（罩住一圈）／身周薄雾（持续）／吞掉下降（事件）／
 *       某人丢雾（lose）／整片来源退出（fade）。
 * 起击收：windup（聚雾）→ veil（铺开）→ veiled（持续）→ guard（吞掉一次下降）→ lose（某人失雾）→ fade（来源退出）。
 * 数：铺开的雾团量与持续时间绑定服务端算出的 data.density；雾圈半径绑定 data.field；
 * 吞掉下降的粒子量绑定实际被还原的等级数（data.motes 由 absorbed 派生）。
 * lose 由来源租约退出触发：只有真的失去这一份保护的人才闪一小股雾；最后一个来源退出才播整片的 fade。
 */
const MistDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    burst: { count: 7, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.24, 0.06], sizeMode: "sin",
                    color: 0xBFE6F0, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        veil: {
            duration: 44,
            exit: { stop: 16, drain: 30 },
            emitters: [
                {
                    name: "veil_ring", bind: "source", height: 0.06, offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 34 }, shape: { kind: "ring", radius: { data: "field", fallback: 3 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.34, 0.16],
                    color: 0xE8F6FA, alpha: [0.5, 0], light: "world", maxParticles: 70
                },
                {
                    name: "veil_cloud", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    burst: { count: { data: "density", fallback: 26 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.9,
                    lifetime: [20, 34], size: [0.34, 0.6],
                    color: 0xBFE6F0, alpha: [0.4, 0], light: "world", maxParticles: 90
                },
                {
                    name: "veil_spread", bind: "source", height: 0.2, offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    burst: { count: 18, interval: 4, repeats: 3 }, shape: { kind: "ring", radius: { data: "field", fallback: 3 } },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.92,
                    lifetime: [22, 36], size: [0.26, 0.04], sizeMode: "sin",
                    color: 0xE8F6FA, alpha: [0.35, 0], light: "world", maxParticles: 80
                },
                {
                    name: "veil_dust", bind: "source", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "ring", radius: { data: "field", fallback: 3 } },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0x9FC3CC, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        veiled: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "body_mist", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    rate: 4, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [18, 30], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0xBFE6F0, alpha: [0.32, 0], alphaMode: "sin", light: "world", maxParticles: 20
                },
                {
                    name: "body_drift", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 2, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 34], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xE8F6FA, alpha: [0.22, 0], light: "world", maxParticles: 14
                }
            ]
        },
        guard: {
            duration: 26,
            exit: { stop: 9, drain: 22 },
            emitters: [
                {
                    name: "guard_swallow", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "inward", speed: [0.06, 0.2], drag: 0.9,
                    lifetime: [10, 18], size: [0.24, 0.05], sizeMode: "sin",
                    color: 0xE8F6FA, alpha: [0.7, 0], light: "world", maxParticles: 50
                },
                {
                    name: "guard_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xBFE6F0, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 22
                }
            ]
        },
        lose: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "lose_puff", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [10, 18], size: [0.22, 0.1],
                    color: 0x9FC3CC, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "fade_cloud", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [24, 40], size: [0.4, 0.7],
                    color: 0xBFE6F0, alpha: [0.24, 0], light: "world", maxParticles: 60
                },
                {
                    name: "fade_ring", bind: "target", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 }, shape: { kind: "ring", radius: { data: "field", fallback: 3 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 28], size: [0.24, 0.06],
                    color: 0x9FC3CC, alpha: [0.3, 0], light: "world", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mist", 1, MistDefinition);
