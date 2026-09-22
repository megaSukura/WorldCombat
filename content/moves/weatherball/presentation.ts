/**
 * 气象球 / weatherball —— 客户端表现。
 *
 * 一句话：细小的天色光点从头顶落下、被收进手里 → 手里那颗球越收越亮（颜色就是收来的元素）→
 * 球沿直线飞出、拖一条同色尾迹 → 命中处炸开一口同色元素与一圈扩散环；无天气时球是灰白色、光点也少。
 * 色相家族：收来的元素色（data.tint）为主，细节近白。数量由机制值驱动：聚气光点 = data.motes，
 * 命中粒子 = data.bursts，光环直径 = data.halo，天色是否可收由 data.charged 改变亮度与密度。
 * 拍子：预告（windup）→ 聚（gather）→ 飞（flight）→ 击（impact）／空（fizzle）。
 */
const WeatherBallDefinition: ParticleDefinition = {
    moments: {
        windup: {
            duration: 24,
            exit: { stop: 16, drain: 14 },
            emitters: [
                {
                    name: "sky_drift", bind: "source", offset: [0, 2.6, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "box", size: [1.6, 1.8, 1.6] },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: { data: "tint", fallback: 0xA8A878 }, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        gather: {
            duration: 26,
            exit: { stop: 18, drain: 14 },
            emitters: [
                {
                    name: "collect", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    rate: 18, shape: { kind: "sphere", radius: 0.9 },
                    direction: "inward", speed: [0.03, 0.10],
                    lifetime: [7, 14], size: [0.12, 0.02],
                    color: { data: "tint", fallback: 0xA8A878 }, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 26, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: { data: "tint", fallback: 0xA8A878 }, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        flight: {
            duration: 60,
            exit: { stop: 52, drain: 16 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 46, shape: { kind: "sphere", radius: 0.14 },
                    direction: "away", speed: [0.02, 0.08],
                    lifetime: [5, 11], size: [0.06, 0.01],
                    color: { data: "tint", fallback: 0xA8A878 }, alpha: [0.85, 0], light: "full", maxParticles: 80
                }
            ]
        },
        impact: {
            duration: 34,
            exit: { stop: 8, drain: 28 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: { data: "bursts", fallback: 16 } }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.12, 0.32], gravity: 0.015,
                    lifetime: [10, 22], size: [0.16, 0.02],
                    color: { data: "tint", fallback: 0xA8A878 }, alpha: [1, 0], light: "full", maxParticles: 140
                },
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 10, size: [0.44, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "scale", fallback: 0.9 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 20], size: [0.6, 0.2],
                    color: { data: "tint", fallback: 0xA8A878 }, alpha: [0.7, 0], light: "full", maxParticles: 4
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 6, drain: 18 },
            emitters: [
                {
                    name: "fizzle", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.10], gravity: 0.02,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: { data: "tint", fallback: 0xA8A878 }, alpha: [0.6, 0], light: "world", maxParticles: 28
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:move_weatherball", 1, WeatherBallDefinition);
