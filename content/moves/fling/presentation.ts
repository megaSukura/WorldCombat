/**
 * 投掷 / fling —— 客户端表现。
 *
 * 一句话：施法者把手里的东西举到身后 → 道具本体（投射物外观就是那件物品）沿弧线翻飞、身后拖一条尘线 →
 * 命中处炸起一圈尘与碎屑，道具本体随后落在脚边、闪一下。色相家族：中性尘（0xE8ECF2 / 0xF2F4F8），
 * 道具本身的贴图自带身份。碎屑数量由服务端算出的 data.bursts 驱动。
 * 拍子：抬（draw）→ 飞（flight）→ 击（impact）→ 落（land）。
 */
const FlingDefinition: ParticleDefinition = {
    moments: {
        feed: { duration: 20, emitters: [{ name: "berry_taken", bind: "target", fit: "body", particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
            burst: { count: 10 }, shape: { kind: "sphere", radius: .4 }, direction: "up", speed: [.015, .045], lifetime: [8, 16], size: [.13, .03], color: 0xB9E283, alpha: [.7, 0] }] },
        draw: {
            duration: 18,
            exit: { stop: 12, drain: 10 },
            emitters: [
                {
                    name: "windup", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 24, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xE8ECF2, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        flight: {
            duration: 60,
            exit: { stop: 52, drain: 16 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "sphere", radius: 0.12 },
                    direction: "away", speed: [0.01, 0.05],
                    lifetime: [5, 12], size: [0.05, 0.01],
                    color: 0xE8ECF2, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 8, drain: 24 },
            emitters: [
                {
                    name: "debris", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "bursts", fallback: 14 } }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.10, 0.28], gravity: 0.025,
                    lifetime: [9, 20], size: [0.07, 0.01],
                    color: 0xE8ECF2, alpha: [0.9, 0], light: "world", maxParticles: 120
                },
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 2 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 9, size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 4
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [8, 16], size: [0.42, 0.16],
                    color: 0xF2F4F8, alpha: [0.6, 0], light: "world", maxParticles: 4
                }
            ]
        },
        land: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.03, 0.09], gravity: 0.02,
                    lifetime: [6, 14], size: [0.05, 0.01],
                    color: 0xE8ECF2, alpha: [0.5, 0], light: "world", maxParticles: 20
                },
                {
                    name: "glint", bind: "point", fit: "none", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", maxParticles: 6
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:move_fling", 1, FlingDefinition);
