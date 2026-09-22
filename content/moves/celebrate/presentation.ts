/**
 * 庆祝 / celebrate 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者原地蹦起来，一圈彩带与星星整圈撒开，被庆祝到的同伴头顶各亮起一串音符。
 * 色相家族：暖金（0xFFC24D）为骨架，彩带与星星层直接用贴图原色——庆祝的含义需要多色，其余层保持金白。
 * 拍子：起（windup 音符上浮）→ 击（burst 彩带撒开、cheer 逐人点亮）→ 收（mark 存续期头顶小簇彩带）。
 * 范围：burst 绑 `point`，形状半径读 `data.radius`（真实感染半径），玩家看到的圈就是会被庆祝到的人。
 * 运动：彩带整圈向外翻飞再落下，星星向上飘；持续期音符只在头顶小范围起伏。
 * 数：彩带量按 `data.motes`（亲密度与等级派生）派生，拍数按 `data.streamers` 派生。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const CelebrateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "windup_glow", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFFC24D, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "windup_note", bind: "source", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 3, interval: 4, repeats: 2 },
                    shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.16, 0.05], sizeMode: "sin",
                    alpha: [0.5, 0], light: "full", maxParticles: 12
                }
            ]
        },
        burst: {
            duration: 36,
            exit: { stop: 16, drain: 26 },
            emitters: [
                {
                    name: "burst_streamer", bind: "point", offset: [0, 0.7, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 34 }, interval: 5, repeats: { data: "streamers", fallback: 3 } },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 4 } },
                    direction: "outward", speed: [0.08, 0.3], spread: 26,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [14, 26], size: [0.22, 0.04], sizeMode: "index",
                    alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 220
                },
                {
                    name: "burst_star", bind: "point", offset: [0, 0.8, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 14, interval: 6, repeats: { data: "streamers", fallback: 3 } },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 4 } },
                    direction: "up", speed: [0.06, 0.2], spread: 24,
                    gravity: 0.015, drag: 0.94,
                    lifetime: [16, 28], size: [0.24, 0.06], sizeMode: "sin",
                    spin: 6, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "burst_ring", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 4 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [14, 22], size: [0.7, 1.3], sizeMode: "linear",
                    color: 0xFFC24D, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "burst_note", bind: "source", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 6, interval: 5, repeats: { data: "streamers", fallback: 3 } },
                    shape: { kind: "circle", radius: 0.7 },
                    direction: "up", speed: [0.03, 0.12], spread: 20,
                    lifetime: [18, 30], size: [0.2, 0.06], sizeMode: "sin",
                    alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        cheer: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "cheer_spark", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "motes", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "up", speed: [0.04, 0.18], spread: 22,
                    lifetime: [12, 22], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xFFD98A, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "cheer_star", bind: "target", offset: [0, 0.2, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, at: 1 }, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [16, 26], size: [0.18, 0.05], sizeMode: "sin",
                    spin: 5, alpha: [0.7, 0], light: "full", maxParticles: 16
                }
            ]
        },
        mark: {
            duration: 40,
            exit: { drain: 30 },
            emitters: [
                {
                    name: "mark_note", bind: "target", offset: [0, 0.35, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 3, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [20, 30], size: [0.14, 0.04], sizeMode: "sin",
                    alpha: [0.35, 0], alphaMode: "sin", light: "full", maxParticles: 12
                },
                {
                    name: "mark_spark", bind: "target", offset: [0, 0.3, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 4, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0xFFD98A, alpha: [0.3, 0], light: "full", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_celebrate", 1, CelebrateDefinition);
