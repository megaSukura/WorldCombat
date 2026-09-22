/**
 * 魔法反射 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身前升起一叠半透膜面 → 膜撑开、把朝自己来的东西弯住 → 接到状态招的一刻膜面一亮、
 *   一道折返光沿两人直线打回那个施放者；没接到东西时膜面合拢、散成细尘。
 *
 * 色相家族：青白 0x8FE8FF 为主体，紫罗兰 0xB388FF 做超能强调，近白 0xF2FBFF 只做折返高光，深蓝 0x2A2350 做烟。
 * 层次：膜面（主体，`generic/screen` 帧条与 psyring）／折返（强调，沿路径的光点与 impact_psychic）／尘（余韵）。
 * 拍子：raise（起膜 0–16t）→ film（撑膜，持续）→ reflect（折返 0–28t）／collapse（收膜 0–18t）。
 * 范围：膜面绑 `source` 随体型缩放；膜面铺开的宽度与折返光路沿 `data.path`（施法者 ↔ 对手）画出，
 *   就是这层膜实际罩住的方向与反射距离 `data.span`，站哪会被弹一眼可读。
 * 运动：膜面缓缓环绕；reflect 时细光点沿 `data.path` 从施法者一侧冲向对手并炸开。
 * 数：膜面与折返光点数量绑 `data.facets`（特攻派生），窗口剩余比例由 `data.remaining` / `data.span` 写出节奏。
 */
const MagicCoatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "panels", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 16, shape: { kind: "arc", radius: 0.55, arcDegrees: 180, rotation: [0, 0, 90] },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.4, 0.14], sizeMode: "index",
                    color: 0x8FE8FF, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "psychic_ring", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1, at: 1 }, shape: { kind: "circle", radius: 0.5, thickness: 1 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 20], size: [0.5, 0.1], sizeMode: "index",
                    color: 0xB388FF, alpha: [0.55, 0], light: "full", maxParticles: 10
                }
            ]
        },
        film: {
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "membrane", bind: "source", offset: [0, 0.62, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: 5, shape: { kind: "arc", radius: 0.6, arcDegrees: 180, rotation: [0, 0, 90] },
                    direction: "outward", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.42, 0.42],
                    color: 0x8FE8FF, alpha: [0.14, 0.14], render: "translucent", light: "world", maxParticles: 14
                },
                {
                    name: "glimmer", bind: "source", offset: [0, 0.7, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "facets", fallback: 8 }, interval: 10, repeats: 60 },
                    shape: { kind: "circle", radius: 0.6 }, direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xB388FF, alpha: [0.4, 0], light: "full", maxParticles: 26
                }
            ]
        },
        reflect: {
            duration: 28,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "surface_burst", bind: "source", offset: [0, 0.62, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: { data: "facets", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.34, 0.03], sizeMode: "index",
                    color: 0xF2FBFF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "bounce", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "facets", fallback: 10 } }, direction: "shape", speed: [0.3, 0.7],
                    lifetime: [8, 15], size: [0.12, 0.01], sizeMode: "index",
                    color: 0x8FE8FF, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "sheen", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 24, direction: "shape", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.2, 0.02], sizeMode: "index",
                    color: 0xB388FF, alpha: [0.55, 0], light: "full", maxParticles: 50
                }
            ]
        },
        collapse: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "shrinking", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 16], size: [0.28, 0.06],
                    color: 0x9FB6C8, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.1],
                    lifetime: [14, 24], size: [0.07, 0.02], gravity: 0.02, drag: 0.95,
                    color: 0x2A2350, alpha: [0.42, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_magiccoat", 1, MagicCoatDefinition);
