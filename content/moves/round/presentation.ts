/**
 * 轮唱 / round 的客户端表现。
 *
 * 一句话：施法者清嗓起调、音符绕着身体打转 → 这句歌的余韵落到身边每个同伴头上（浮起一串音符提示还能接）→
 *   歌句**瞬时**点到目标身上，在起点与落点两端同刻亮起金色声纹，落点炸开一圈音符；接唱的那一句更亮更密。
 * 色相家族：温暖的象牙金（0xFFE9B0 / 0xE8C86A）为主体，近白（0xFFF6DC）只给击点高光；不引入第二个色相。
 * 拍子：起 charge（清嗓）→ 传 join（余韵落同伴）→ 唱 verse（施法者端声纹瞬发）→ 击 impact／收 miss。
 * 范围：verse 在施法者身上（`bind:"source"`）一次爆出，impact 在目标身上（`bind:"target"`）收束；两者同刻，
 *   不画跨越两点的飞行线，声音的伤害本来就是瞬时结算。impact 的环按 `data.scale` 收束在落点。
 * 运动：verse 的音符从身体表面沿 `data.speed`（歌速）向外散开，散得越急只是画面更快，不代表抵达时间。
 * 数：burst 量与 `data.notes`（音数，特攻与等级换算）一致；`data.answered`（是否消费了自身余韵起唱）额外放出一枚音符；
 *   `data.chorusAlpha`（接上的同伴数换算）只在有同伴接上时点亮起唱处的合唱光圈，独唱没有。
 */
const RoundDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "charge_notes", bind: "source", offset: [0, 0.5, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 12, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xFFE9B0, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "charge_ring", bind: "source", offset: [0, 0.05, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 6, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.25, 0.5],
                    color: 0xE8C86A, alpha: [0.4, 0], light: "full", maxParticles: 16
                }
            ]
        },
        join: {
            duration: 24,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "join_notes", bind: "target", offset: [0, 0.3, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "notes", fallback: 3 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [10, 16], size: [0.12, 0.02],
                    color: 0xFFE9B0, alpha: [0.85, 0], light: "full", maxParticles: 24
                },
                {
                    name: "join_ring", bind: "target", offset: [0, 0.05, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.26, 0.6],
                    color: 0xE8C86A, alpha: [0.55, 0], light: "full", maxParticles: 6
                }
            ]
        },
        verse: {
            duration: 28,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "verse_from", bind: "source", offset: [0, 0.5, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "notes", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: { data: "speed", fallback: 1.1 }, spread: 26,
                    lifetime: [7, 12], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xFFE9B0, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "verse_spark", bind: "source", offset: [0, 0.55, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "notes", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spread: 20,
                    lifetime: [6, 12], size: [0.09, 0.01],
                    color: 0xFFF6DC, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "verse_answer", bind: "source", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "answered", fallback: 0 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 16], size: [0.18, 0.04],
                    color: 0xFFF6DC, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 12
                },
                {
                    name: "verse_pulse", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1, repeats: 2, interval: 3 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0xE8C86A, alpha: [{ data: "chorusAlpha", fallback: 0 }, 0], light: "full", maxParticles: 8
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact_burst", bind: "target", offset: [0, 0.6, 0], height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "notes", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [8, 15], size: [0.11, 0.02],
                    color: 0xFFF6DC, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "impact_notes", bind: "target", offset: [0, 0.6, 0], height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "notes", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 16], size: [0.14, 0.03],
                    color: 0xFFE9B0, alpha: [0.9, 0], light: "full", maxParticles: 36
                },
                {
                    name: "impact_ring", bind: "target", offset: [0, 0.08, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 18], size: [0.3, { data: "scale", fallback: 1 }], sizeMode: "linear",
                    color: 0xE8C86A, alpha: [0.55, 0], light: "full", maxParticles: 8
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "miss_note", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 3, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "down", speed: [0.02, 0.08],
                    gravity: 0.05, drag: 0.95,
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0xC9B98A, alpha: [0.5, 0], light: "world", maxParticles: 8
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_round", 1, RoundDefinition);
