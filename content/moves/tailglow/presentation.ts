/**
 * 萤火 / tailglow 的客户端表现。
 *
 * 一句话：光点从四周向身上收拢 → 一颗颗亮起、在身周悬停成缓缓明灭的黄绿光环 → 最后一齐灭掉；
 *   被打散时四散飞开、黯淡坠落。色相家族：萤火黄绿 0xD9E85A 为主体，暖白 0xF7F3C2 落在强调层，
 *   暗黄 0x8E9A3A 作余韵。
 * 拍子：起（gather 0–14t）→ 亮（kindle 0–26t）→ 拍（pulse 每拍 0–20t）→ 落（settle 0–24t）→ 悬（hover 0–30t）。
 * 范围：光环绑身上、半径按 `data.glow`，`data.scale`（实际光环半径 / 1.0）同步缩放粒子尺寸——画面里的光圈就是
 *   光点真正悬停的范围。
 * 运动：gather 光点向身上收拢；kindle/pulse 一圈圈向外炸开后悬停，速度按 `data.drift`；
 *   settle 向心收束；scatter 向外四散，fade 向下沉没。
 * 数：光点数量绑 `data.motes`（特攻与速度派生），当前第几拍绑 `data.index`、总拍数绑 `data.beats`；
 *   越强的个体画面里的光点越密。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const TailGlowDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "pull", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 16, shape: { kind: "sphere_surface", radius: { data: "glow", fallback: 0.7 } },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [8, 14], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0xF7F3C2, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "foot_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 8, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.28, 0.06],
                    color: 0x8E9A3A, alpha: [0.45, 0], light: "world", maxParticles: 26
                }
            ]
        },
        kindle: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "flare", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: { data: "glow", fallback: 0.7 } },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [12, 20], size: [0.11, 0.02], sizeMode: "index",
                    color: 0xD9E85A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 130
                },
                {
                    name: "core", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [14, 20], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xF7F3C2, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        pulse: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "beat", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 5 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "glow", fallback: 0.7 } },
                    direction: "outward", speed: [0.04, { data: "drift", fallback: 0.05 }],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xD9E85A, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "echo", bind: "source", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 4 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.05, 0.01], sizeMode: "sin",
                    color: 0xF7F3C2, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        settle: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "close", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: { data: "glow", fallback: 0.7 } },
                    direction: "inward", speed: [0.06, 0.16],
                    lifetime: [10, 16], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xF7F3C2, alpha: [0.8, 0], light: "full", bloom: 0.28, maxParticles: 60
                },
                {
                    name: "wink", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: { data: "glow", fallback: 0.7 } },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0x8E9A3A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hover: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "hover", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "ring", radius: { data: "glow", fallback: 0.7 } },
                    direction: "outward", speed: [0.01, { data: "drift", fallback: 0.05 }],
                    lifetime: [12, 20], size: [0.05, 0.01], sizeMode: "sin",
                    color: 0xD9E85A, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "sink", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: { data: "glow", fallback: 0.7 } },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x8E9A3A, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        scatter: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 18 },
                    shape: { kind: "sphere_surface", radius: { data: "glow", fallback: 0.7 } },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xF7F3C2, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "fall", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "down", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0x8E9A3A, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tailglow", 1, TailGlowDefinition);
