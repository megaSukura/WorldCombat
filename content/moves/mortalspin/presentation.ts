/**
 * 晶光转转 / mortalspin 的客户端表现。
 *
 * 一句话：施法者脚边聚起一圈毒紫的晶光 → 贴地旋起来，毒晶绕着身体公转、贴着地面荡成一圈圈紫环 → 沾到的人
 *   身上炸开一撮毒光（剧毒式更亮更浓），缠在身上的东西被甩散，余毒慢慢沉下去。
 * 色相家族：毒紫晶（0xB06AD0 主体、0xE2B8F2 亮面、0xF6ECFB 近白核心），余韵用中性灰；无第二个色相。
 * 拍子：起 gather 0–12t ／ 旋 spin 0–30t ／ 中 hit ／ 解 free ／ 沉 settle。
 * 范围：spin／free 的贴地毒环半径绑 `data.scale`（晶光半径 / 2.6），玩家一眼看出毒荡到哪一圈。
 * 运动：gather 的毒晶向脚边收；spin 的毒晶绕身公转并贴地外抛、紫环一圈圈扩散；hit 的毒光从目标身上向上炸。
 * 数：`data.scatter`（物攻与等级派生的毒晶数）驱动 gather／spin／hit 的发射量，`data.rings`（旋动圈数）
 *   决定毒环重放次数，`data.freed`（甩脱的束缚条数）追加解缚环，`data.toxic`（剧毒式）抬高毒光的亮度与浓度。
 */
const MortalSpinDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "pool", bind: "source", offset: [0, 0.2, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "scatter", fallback: 16 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16], spin: 12,
                    lifetime: [7, 13], size: [0.12, 0.02],
                    color: 0xB06AD0, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "shimmer", bind: "source", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 14, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.09, 0.01],
                    color: 0xE2B8F2, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        spin: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crystals", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: { data: "scatter", fallback: 16 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.28], spin: 22, spread: 22,
                    lifetime: [7, 14], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xB06AD0, alpha: [0.75, 0], light: "world", maxParticles: 140
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 22, shape: { kind: "ring", radius: 0.42 },
                    direction: "shape", speed: [0.05, 0.16], spin: 26,
                    lifetime: [5, 11], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xE2B8F2, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 100
                },
                {
                    name: "ring", bind: "source", offset: [0, 0.05, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, interval: 5, repeats: { data: "rings", fallback: 2 } },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.14, 0.32],
                    lifetime: [10, 18], size: [0.4, 0.9], sizeMode: "sin",
                    color: 0x9A57C0, alpha: [0.55, 0], light: "world", maxParticles: 8
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "scatter", fallback: 14 }, at: 0 }, shape: { kind: "sphere", radius: 0.33 },
                    direction: "outward", speed: [0.1, 0.3], spread: 24,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE2B8F2, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "venom", bind: "target", offset: [0, 0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "toxic", fallback: 0 }, interval: 2 },
                    shape: { kind: "hemisphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.18],
                    lifetime: [10, 18], size: [0.13, 0.02],
                    color: 0xB06AD0, alpha: [0.8, 0], light: "world", maxParticles: 40
                },
                {
                    name: "sink", bind: "target", offset: [0, 0.3, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "scatter", fallback: 14 } }, shape: { kind: "circle", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.05,
                    lifetime: [12, 20], size: [0.07, 0.02],
                    color: 0x8A8F98, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        },
        free: {
            duration: 24,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "unwind", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "freed", fallback: 1 }, interval: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.16, 0.38],
                    lifetime: [10, 18], size: [0.4, 0.88], sizeMode: "sin",
                    color: 0xE2B8F2, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        settle: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "source", offset: [0, 0.25, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "scatter", fallback: 12 } }, shape: { kind: "hemisphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1], gravity: 0.04,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x8A8F98, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mortalspin", 1, MortalSpinDefinition);
