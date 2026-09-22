/**
 * 抢夺 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身侧凝出一只暗紫的手 → 手沿两人之间的直线探出去、在对手面前张开等着 →
 *   对手那手刚起势就被抓住、指痕从对手身上抽回施法者身上；没等到东西时手只在空气里攥紧。
 *
 * 色相家族：暗紫 0x7B4FBF 为主体与持续，品红 0xC05CE0 做强调，近黑 0x241238 做烟，近白 0xE8D8FF 只做高光。
 * 层次：手（主体，`generic/grab` 帧条）／指痕（细节，沿路径的细光点与指痕线）／烟（余韵，低饱和暗烟）。
 * 拍子：brace（聚手 0–14t）→ reach（探手并等待）→ take（抽回，0–28t）／empty（攥空，0–18t）。
 * 范围：reach 的指痕线沿 `data.path`（对手 ↔ 施法者）画出，长度就是两只实际距离——站哪会被这只手够到，一眼可读。
 * 运动：手落到对手身上不动，指痕线在窗口里持续脉动；take 时细光点沿 `data.path` 从对手一侧抽回施法者。
 * 数：指痕与光点的数量绑 `data.grip`（特攻派生），窗口剩余比例由 `data.remaining` / `data.span` 写出节奏。
 */
const SnatchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "hand", bind: "source", offset: [0, 0.62, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    rate: 2, shape: { kind: "sphere", radius: 0.22 },
                    direction: [0, 0.2, 0], speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.34, 0.2], sizeMode: "index",
                    color: 0x7B4FBF, alpha: [0.9, 0], light: "full", maxParticles: 6
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 14, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xC05CE0, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "shade", bind: "source", offset: [0, 0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 6, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 28], size: [0.2, 0.05],
                    color: 0x241238, alpha: [0.28, 0], light: "world", maxParticles: 26
                }
            ]
        },
        reach: {
            exit: { stop: 6, drain: 18 },
            emitters: [
                {
                    name: "tendril", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 26, direction: "shape", speed: [0.02, 0.07],
                    lifetime: [6, 11], size: [0.16, 0.02], sizeMode: "index",
                    color: 0x7B4FBF, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "motes", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "grip", fallback: 8 }, interval: 6, repeats: 40 },
                    direction: "shape", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xC05CE0, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "waiting_hand", bind: "target", fit: "body", offset: [0, 0.7, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    rate: 3, shape: { kind: "sphere", radius: 0.18 },
                    direction: [0, 0.15, 0], speed: [0.01, 0.03],
                    lifetime: [8, 14], size: [0.3, 0.16], sizeMode: "index",
                    color: 0xE8D8FF, alpha: [0.55, 0], light: "full", maxParticles: 10
                }
            ]
        },
        take: {
            duration: 28,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "snap", bind: "target", fit: "body", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "grip", fallback: 10 } }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.3, 0.03], sizeMode: "index",
                    color: 0xC05CE0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "yank", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "grip", fallback: 10 } }, direction: "shape", speed: [0.24, 0.6],
                    lifetime: [8, 15], size: [0.1, 0.01], sizeMode: "index",
                    color: 0xE8D8FF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "trail", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 20, direction: "shape", speed: [0.03, 0.1],
                    lifetime: [14, 24], size: [0.18, 0.04],
                    color: 0x241238, alpha: [0.32, 0], light: "world", maxParticles: 40
                }
            ]
        },
        empty: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "clench", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0x6B5A78, alpha: [0.6, 0], light: "world", maxParticles: 20
                },
                {
                    name: "closing_smoke", bind: "source", offset: [0, 0.45, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.2, 0.34],
                    color: 0x241238, alpha: [0.24, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_snatch", 1, SnatchDefinition);
