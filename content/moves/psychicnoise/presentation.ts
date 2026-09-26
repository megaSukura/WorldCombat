/**
 * 精神噪音 / psychicnoise 的客户端表现。
 *
 * 一句话：施法者耳边聚起一道品红的杂音环，随即化作一道贯穿的音波射出去；命中处炸开一团不和谐的
 *   品红与青色的噪点，目标耳侧从此沉着两圈交错的低鸣环，表示它回不了血。
 * 色相家族：品红 0xE06AD0 作主体、青绿 0x7BE0E8 作不和谐的第二色（噪音的含义）、深紫 0x5A2A6A 作阴影。
 * 拍子：起（windup 聚声／wave 射出）→ 击（hit 命中炸开）→ 余（linger 耳侧低鸣；真拦下一次回复时补一记 mute 短断音）→ 收（recover 散去／subside 被硬解／fizzle 落空）。
 * 范围：wave 的束长绑服务端 data.reach（真实射程），玩家看得出这道音波够到哪。
 * 运动：音波沿瞄准方向直飞；命中在目标耳侧炸开并留下持续低鸣。
 * 数：命中与音波的密度随 data.discharge（特攻派生），贯穿时 data.pierce 让画面读出它穿了几个人。
 */
const PsychicnoiseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "hone", bind: "source", offset: [0, 0.7, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 24, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0xE06AD0, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 50
                },
                {
                    name: "hone_mote", bind: "source", offset: [0, 0.7, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.09, 0.01],
                    color: 0x7BE0E8, alpha: [0.8, 0], light: "full", maxParticles: 26
                }
            ]
        },
        wave: {
            duration: 34,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "wave_core", bind: "projectile", offset: [0, 0, 0], height: 0, fit: "none", orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "discharge", fallback: 26 }, shape: { kind: "cylinder", radius: 0.24, length: 0.5 },
                    direction: "shape", speed: [0.02, 0.08], spin: 4,
                    lifetime: [10, 18], size: [0.3, 0.06],
                    color: 0xE06AD0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "wave_ring", bind: "projectile", offset: [0, 0, 0], height: 0, fit: "none", orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: { data: "discharge", fallback: 20 }, interval: 2, repeats: 5 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "shape", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.24, 0.06], sizeMode: "index",
                    color: 0x7BE0E8, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 30,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "hit_burst", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/moves/psychichit_small",
                    burst: { count: { data: "motes", fallback: 24 } }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3], spread: 22,
                    lifetime: [7, 14], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE06AD0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "hit_discord", bind: "target", offset: [0, 0.2, 0], height: 0.84,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: { data: "motes", fallback: 18 }, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 18], size: [0.24, 0.5], sizeMode: "linear",
                    color: 0x7BE0E8, alpha: [0.85, 0], light: "full", maxParticles: 44
                },
                {
                    name: "hit_dust", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14], drag: 0.9,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0x5A2A6A, alpha: [0.55, 0], light: "world", maxParticles: 28
                }
            ]
        },
        linger: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "ear_ring_a", bind: "target", offset: [0, 0.18, 0], height: 0.86,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 4, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.004, 0.014],
                    lifetime: [16, 26], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xE06AD0, alpha: [0.4, 0.02], alphaMode: "sin", light: "world", maxParticles: 14
                },
                {
                    name: "ear_ring_b", bind: "target", offset: [0, 0.18, 0], height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 3, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.003, 0.012], spin: 2,
                    lifetime: [18, 28], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x7BE0E8, alpha: [0.32, 0.02], alphaMode: "sin", light: "world", maxParticles: 12
                }
            ]
        },
        recover: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "fade", bind: "target", offset: [0, 0.22, 0], height: 0.86,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 16 }, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xE06AD0, alpha: [0.7, 0], light: "full", maxParticles: 26
                }
            ]
        },
        subside: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "break", bind: "target", offset: [0, 0.18, 0], height: 0.84,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 20,
                    lifetime: [7, 13], size: [0.22, 0.04], sizeMode: "index",
                    color: 0x5A2A6A, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        mute: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "mute_gap", bind: "target", offset: [0, 0.2, 0], height: 0.86,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.28 },
                    direction: "inward", speed: [0.03, 0.1], spread: 30,
                    lifetime: [8, 14], size: [0.2, 0.42], sizeMode: "linear",
                    color: 0x5A2A6A, alpha: [0.7, 0], light: "world", maxParticles: 14
                },
                {
                    name: "mute_hush", bind: "target", offset: [0, 0.18, 0], height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 8 }, shape: { kind: "circle", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0x7BE0E8, alpha: [0.5, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "fizzle", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [10, 18], size: [0.1, 0.01],
                    color: 0x5A2A6A, alpha: [0.5, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psychicnoise", 1, PsychicnoiseDefinition);
