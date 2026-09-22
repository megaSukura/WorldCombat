/**
 * 找伙伴 / entrainment 的客户端表现。
 *
 * 一句话：施法者踩着一段古怪节拍、身侧荡开一圈圈音纹 → 拍子沿两人连线一节节亮起推到对手身上 →
 *         在它身上炸开一圈摆动的音符，受波及的敌人各自被一圈节奏套住。
 * 色相家族：节拍黄 0xE8C24A 作主体，暖白 0xFFF0C8 作高光，只在落点核心上补一点亮青 0x9FE8D8。
 * 拍子：起 dance 0–12t ／ 行 beat（延迟后沿 path 推进）／ 落 settle 36t ／ 空 fizzle 22t。
 * 范围：beat 与 spread 的环按 `data.scale`（波及半径比）铺开，画出这一段节拍覆盖到多大一圈；
 *   spread 的连线沿 `data.path` 从施法者指向被波及的敌人，让玩家读出「谁被带上了」。
 * 运动：音纹向两侧荡开、拍子沿连线一格一格推进、落定时在目标身上环绕摆动。
 * 数：连线上的拍子数绑 `data.beats`（速度派生），落点摆动的密度绑 `data.sway`（特攻派生），
 *   波及人数 `data.shared` 决定落点核心的强弱。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const EntrainmentSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        dance: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "dance_note", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: { data: "beats", fallback: 6 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "up", speed: [0.02, 0.09], spin: 25,
                    lifetime: [8, 15], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xE8C24A, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "dance_wave", bind: "source", fit: "body", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [9, 15], size: [0.26, 0.6], sizeMode: "sin",
                    color: 0xFFF0C8, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        beat: {
            emitters: [
                {
                    name: "beat_note", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/note",
                    shape: { kind: "polyline" },
                    rate: { data: "beats", fallback: 8 }, direction: "shape", speed: [0.05, 0.16], spread: 12, spin: 30,
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xE8C24A, alpha: [0.8, 0], light: "full", maxParticles: 120
                },
                {
                    name: "beat_spark", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "polyline" },
                    rate: { data: "beats", fallback: 6 }, direction: "shape", speed: [0.02, 0.1], spread: 16,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFF0C8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 90
                }
            ]
        },
        spread: {
            duration: 32,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "spread_ring", bind: "target", fit: "body", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.34, 0.85], sizeMode: "sin",
                    color: 0xE8C24A, alpha: [0.55, 0], light: "full", maxParticles: 18
                },
                {
                    name: "spread_sway", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "sway", fallback: 8 }, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.06], spin: 20,
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFFF0C8, alpha: [0.7, 0], light: "full", maxParticles: 70
                }
            ]
        },
        settle: {
            duration: 36,
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "settle_core", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: { data: "shared", fallback: 1 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "shape", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.34, 0.08], sizeMode: "index",
                    color: 0x9FE8D8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "settle_note", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "beats", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.22], spread: 18, drag: 0.9,
                    lifetime: [12, 22], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xE8C24A, alpha: [0.85, 0], light: "full", maxParticles: 120
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fizzle_puff", bind: "source", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.32],
                    color: 0x8A8172, alpha: [0.3, 0], light: "world", render: "translucent", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_entrainment", 1, EntrainmentSceneDefinition);
