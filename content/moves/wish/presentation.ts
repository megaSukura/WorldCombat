/**
 * 祈愿 / Wish 的粒子语言。
 *
 * 一句话：脚边收拢一圈祈愿的光，一颗愿星升到头顶悬停，落下时地面绽开一个圈，为圈里的自己与伙伴回复。
 * 色相家族：愿力金 0xFFD36A 作主体，暖白 0xFFF2C8 作高光，浅青 0xBFE6FF 只落在上升的星尾。
 * 拍子：起（windup）／升（rise）／悬（hang）／落（fall）／击（land）／收（fade）。
 * 范围：落地圈绑 point、fit none，几何按 data.scale = 实际半径 / 2.6 缩放，玩家站在圈外就知道不会被加到。
 * 机制驱动：land 的粒子爆发数绑定 data.burst，该值由服务端按「实际受益者数量」算出。
 */
const WishDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.34, 0.12],
                    color: 0xFFD36A, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "gather_mote", bind: "source", offset: [0, 0.3, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xFFF2C8, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        rise: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "rise_star", bind: "source", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: 14, interval: 2, repeats: 4 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.05, 0.14],
                    lifetime: [14, 24], size: [0.28, 0.06],
                    color: 0xFFD36A, alpha: [1, 0], light: "full", maxParticles: 48
                },
                {
                    name: "rise_tail", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xBFE6FF, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        hang: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "star_core", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    rate: 6, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.005, 0.02], spin: 4,
                    lifetime: [20, 34], size: [0.26, 0.05],
                    color: 0xFFD36A, alpha: [0.9, 0.1], alphaMode: "sin", light: "full", bloom: 0.25, maxParticles: 12
                },
                {
                    name: "star_mote", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 28], size: [0.06, 0.01],
                    color: 0xFFF2C8, alpha: [0.8, 0], light: "full", maxParticles: 20
                },
                {
                    name: "ground_hint", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 4, shape: { kind: "circle", radius: 2.6, thickness: 0.9 },
                    direction: "up", speed: [0.004, 0.014],
                    lifetime: [30, 50], size: [0.12, 0.04],
                    color: 0xFFD36A, alpha: [0.16, 0.02], alphaMode: "sin", light: "world", maxParticles: 30
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "fall_streak", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: 18, interval: 2, repeats: 4 }, shape: { kind: "ring", radius: 0.3 },
                    direction: [0, -1, 0], speed: [0.1, 0.24], drag: 0.95,
                    lifetime: [10, 18], size: [0.24, 0.04],
                    color: 0xFFD36A, alpha: [1, 0], light: "full", maxParticles: 40
                },
                {
                    name: "fall_mote", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 16, direction: [0, -1, 0], speed: [0.08, 0.2],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xFFF2C8, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        land: {
            duration: 40,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "land_burst", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: { data: "burst", fallback: 24 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.3], drag: 0.9,
                    lifetime: [14, 26], size: [0.26, 0.03],
                    color: 0xFFD36A, alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 80
                },
                {
                    name: "land_ring", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3, interval: 4 }, shape: { kind: "ring", radius: 2.6 },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [16, 28], size: [0.4, 0.9],
                    color: 0xFFF2C8, alpha: [0.7, 0], light: "full", maxParticles: 16
                },
                {
                    name: "land_mote", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 30, repeats: 2, interval: 5 }, shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [14, 26], size: [0.07, 0.01],
                    color: 0xFFF2C8, alpha: [0.85, 0], light: "full", maxParticles: 70
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_mote", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFF2C8, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wish", 1, WishDefinition);
