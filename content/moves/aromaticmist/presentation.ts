/**
 * 芳香薄雾 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身上腾起一层粉色甜香，香顺着方向飘到落点、摊开成一片会停留的香云；走进雾里的伙伴被一圈
 *   香点裹住，离雾后香点还跟着飘一小会儿。
 *
 * 色相家族：甜粉（0xF6C7E0）为主体，近白（0xFFF0F8）做高光，暗紫红（0xB07C96）做余韵；没有第二个色相。
 * 层次：聚香（起）／香息飞出与落地摊开（击）／停留的香云（持续）／被裹住的香点（持续）／散（收）。
 * 起击收：gather（起）→ release（击）→ settle（击）→ cloud（持续）→ veiled（受香）→ fade（收）。
 * 范围：地环绑落点、fit none，半径按 `data.scale`（实际香雾半径 / 3.6）推出，画出来的圈就是香真罩到的范围。
 * 运动：香息沿施法者到落点的方向飘去；落地时向外摊成环；香云缓慢上浮、打转；受香者身上的香点绕着升起。
 * 数：香点量绑 `data.motes`（特防派生），尺寸与范围绑 `data.scale`（体型与配置派生）。
 * 持续状态：持续层贴地、低密度、慢节奏，玩家仍看得清目标。
 */
const AromaticMistDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather_mist", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 8, shape: { kind: "sphere", radius: 1.1 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 6,
                    lifetime: [12, 20], size: [0.3, 0.08],
                    color: 0xFFF0F8, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        release: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "release_scent", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "motes", fallback: 20 }, interval: 2, repeats: 3 },
                    shape: { kind: "cone_volume", radius: 0.4, length: { data: "distance", fallback: 4 }, angleDegrees: 22 },
                    direction: "toward", orient: "direction", speed: [0.05, 0.18], drag: 0.9, spin: 12,
                    lifetime: [14, 24], size: [0.26, 0.06],
                    color: 0xF6C7E0, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 120
                }
            ]
        },
        settle: {
            duration: 32,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "settle_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 3.6 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [16, 26], size: [0.34, 0.12],
                    color: 0xF6C7E0, alpha: [0.55, 0], light: "full", maxParticles: 60
                },
                {
                    name: "settle_puff", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 2.4 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.93,
                    lifetime: [18, 30], size: [0.44, 0.16],
                    color: 0xFFF0F8, alpha: [0.4, 0], light: "full", maxParticles: 40
                }
            ]
        },
        cloud: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "cloud_body", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 6, shape: { kind: "ring", radius: 3.6 },
                    direction: "up", speed: [0.006, 0.03], drag: 0.95, spin: 4,
                    lifetime: [22, 38], size: [0.4, 0.16], sizeMode: "sin",
                    color: 0xF6C7E0, alpha: [0.24, 0], alphaMode: "sin", light: "world", maxParticles: 40
                },
                {
                    name: "cloud_mote", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "ring", radius: 3.6 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 30], size: [0.07, 0.01],
                    color: 0xFFF0F8, alpha: [0.3, 0], light: "full", maxParticles: 50
                }
            ]
        },
        veiled: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "veil_heart", bind: "target", fit: "body", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 1, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 32], size: [0.22, 0.06], sizeMode: "sin",
                    color: 0xF6C7E0, alpha: [0.22, 0], light: "full", maxParticles: 8
                },
                {
                    name: "veil_spark", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 3, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.008, 0.03],
                    lifetime: [16, 26], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFFF0F8, alpha: [0.26, 0], light: "full", maxParticles: 16
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "fade_mist", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "up", speed: [0.02, 0.07], drag: 0.94, spin: 5,
                    lifetime: [20, 32], size: [0.3, 0.1],
                    color: 0xB07C96, alpha: [0.35, 0], light: "world", maxParticles: 34
                },
                {
                    name: "fade_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 3.6 },
                    direction: "outward", speed: [0.02, 0.06], drag: 0.94,
                    lifetime: [16, 26], size: [0.24, 0.06],
                    color: 0xB07C96, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aromaticmist", 1, AromaticMistDefinition);
