/**
 * 清除之烟 / clearsmog 的客户端表现。
 *
 * 一句话：施法者把一团浊泥甩向对手，泥团砸中的一刻炸开一片灰绿的浓烟，烟裹住目标、把一层层能力等级从它身上
 *   冲刷下来（白光一现），烟还在它身上黏着、每隔几刻把新冒出的等级再冲散一次。
 * 色相家族：灰绿与土黄（浊泥与烟），冲刷的一瞬用近白；没有第二个色相。
 * 拍子：起 windup（捏泥冒烟 0–11t）→ 掷 flight（泥团弧飞，随弹体）→ 炸 burst（烟团炸开 0–30t）
 *   → 罩 caught／veil（烟沿目标持续）→ 冲 scour（白冲一现）／散 release。
 * 范围：`data.scale`（烟团半径 / 2.2）缩放 smoke 炸开的范围与落地烟圈，玩家一眼知道站哪会被冲。
 * 运动：泥团绑弹体走小弧、修向目标；炸开后烟从命中点向外翻卷再贴地铺开，罩住的人身上维持一圈上升的浊气。
 * 数：`data.fumes`（特攻换算的烟量）绑定炸开与罩住时的烟团数量，`data.erased` 让被试目标的那一下按冲掉的级数加亮，
 *   `data.intensity`（威力 / 42）放大整幕。
 */
const ClearsmogDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 11,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "knead", bind: "source", offset: [0, 0.8, 0.3], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: 20, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.03, 0.12], spin: 6,
                    lifetime: [6, 11], size: [0.24, 0.1], sizeMode: "linear",
                    color: 0x8E9C7A, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "fume", bind: "source", offset: [0, 0.75, 0.3], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 12, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [10, 16], size: [0.35, 0.14], sizeMode: "linear",
                    color: 0xA9B49A, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { stop: 0, drain: 12 },
            emitters: [
                {
                    name: "clump", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    trail: { minDistance: 0.3 }, rate: 10, spriteFrom: "age",
                    direction: "outward", speed: [0.0, 0.03], spin: 10,
                    lifetime: [5, 10], size: [0.26, 0.1], sizeMode: "linear",
                    color: 0x8E9C7A, alpha: [0.8, 0], light: "world", maxParticles: 26
                },
                {
                    name: "seep", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    trail: { minDistance: 0.5 }, rate: 6,
                    direction: "outward", speed: [0.0, 0.02], drag: 0.94,
                    lifetime: [7, 12], size: [0.3, 0.12],
                    color: 0xA9B49A, alpha: [0.35, 0], light: "world", maxParticles: 18
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "bloom", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    burst: { count: { data: "fumes", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.22], spread: 30, drag: 0.9,
                    lifetime: [12, 22], size: [0.5, 0.18], sizeMode: "linear",
                    color: 0x9AA88A, alpha: [0.6, 0], light: "world", maxParticles: 50
                },
                {
                    name: "splat", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.1, 0.32], spread: 36, gravity: 0.03, drag: 0.9,
                    lifetime: [6, 12], size: [0.2, 0.07],
                    color: 0x8E9C7A, alpha: [0.8, 0], light: "world", maxParticles: 24
                },
                {
                    name: "floor", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 3, at: 1, repeats: 3, interval: 4 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.0, 0.03], drag: 0.92,
                    lifetime: [12, 20], size: [0.7, 0.25], sizeMode: "linear",
                    color: 0x9AA88A, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        },
        caught: {
            duration: 24,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "wash", bind: "point", fit: "none", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "point" },
                    lifetime: [8, 13], size: [0.7, 0.25], sizeMode: "linear",
                    color: 0xAFC6A6, alpha: [0.8, 0], light: "world", maxParticles: 4
                },
                {
                    name: "clear", bind: "point", fit: "none", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "erased", fallback: 0 }, at: 1, interval: 2, repeats: 3 },
                    shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.04, 0.14], gravity: 0.01, drag: 0.95,
                    lifetime: [10, 18], size: [0.14, 0.04],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        veil: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "shroud", bind: "target", fit: "body", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "fumes", fallback: 14 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.93,
                    lifetime: [12, 20], size: [0.4, 0.16], sizeMode: "linear",
                    color: 0x9AA88A, alpha: [0.35, 0], light: "world", maxParticles: 34
                },
                {
                    name: "mote", bind: "target", fit: "body", offset: [0, 0.8, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 5, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.08, 0.03],
                    color: 0xDCE3D0, alpha: [0.4, 0], light: "world", maxParticles: 14
                }
            ]
        },
        scour: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wisp", bind: "point", fit: "none", offset: [0, 0.75, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "fumes", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.06, 0.2], spread: 24, drag: 0.9,
                    lifetime: [8, 14], size: [0.3, 0.12], sizeMode: "linear",
                    color: 0xB6C2A8, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        release: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "thin", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 18], size: [0.5, 0.3], sizeMode: "linear",
                    color: 0xA9B49A, alpha: [0.25, 0], light: "world", maxParticles: 18
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "splat", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], spread: 40, gravity: 0.04, drag: 0.88,
                    lifetime: [8, 14], size: [0.2, 0.07],
                    color: 0x8E9C7A, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_clearsmog", 1, ClearsmogDefinition);
