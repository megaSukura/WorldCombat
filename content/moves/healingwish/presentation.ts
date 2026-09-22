/**
 * 治愈之愿 / Healing Wish 的粒子语言。
 *
 * 一句话：施法者半跪、周身愿光升起（windup）→ 它把生命交出去，原地留下一颗金色的愿星（offer）→ 愿星静静
 *   悬着，脚下画出它能照顾到的圆（wait）→ 第一个来到它身边、又伤又病的伙伴被整口治好，愿星爆成一片金色祝福
 *   （deliver）→ 若始终无人来到，愿光自行淡去（fade）。
 * 色相家族：愿力金 0xFFD36A 作主体，暖白 0xFFF2C8 作高光，心愿用白心贴图染暖金点缀（一个色相家族里做深浅）。
 * 拍子：起 windup 0–18t ／ 献 offer 0–34t ／ 等 wait 持续 ／ 兑 deliver 0–40t ／ 收 fade 0–24t；无人接收时用 wasted。
 * 范围：offer/wait 的环绑 point、fit none，几何按 data.scale = 实际愿望半径 / 3.0 缩放，圈边即判定边。
 * 数：deliver 的愿光爆发绑 data.intensity（由回复比例派生）、总点数绑 data.motes（特防与体型派生），洗涤数绑 data.removed。
 */
const HealingWishDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "kneel_gather", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [10, 16], size: [0.32, 0.1],
                    color: 0xFFD36A, alpha: [0.75, 0], light: "full", maxParticles: 30
                },
                {
                    name: "kneel_heart", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.16, 0.03],
                    color: 0xFFE6B0, alpha: [0.85, 0], light: "full", maxParticles: 20
                }
            ]
        },
        offer: {
            duration: 34,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "offer_ring", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3, interval: 5 }, shape: { kind: "circle", radius: 3.0, thickness: 0.9 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [14, 26], size: [0.3, 0.78], sizeMode: "sin",
                    color: 0xFFD36A, alpha: [0.8, 0], light: "full", maxParticles: 20
                },
                {
                    name: "offer_star", bind: "source", offset: [0, 0.9, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: 12, interval: 3, repeats: 3 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [14, 24], size: [0.26, 0.06],
                    color: 0xFFD36A, alpha: [1, 0], light: "full", maxParticles: 40
                },
                {
                    name: "offer_mote", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 20, shape: { kind: "circle", radius: 3.0 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFF2C8, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        wait: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "wait_star", bind: "point", offset: [0, 0.9, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    rate: 6, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.004, 0.018], spin: 4,
                    lifetime: [22, 36], size: [0.24, 0.05], alphaMode: "sin",
                    color: 0xFFD36A, alpha: [0.9, 0.1], light: "full", bloom: 0.22, maxParticles: 14
                },
                {
                    name: "wait_edge", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 4, shape: { kind: "circle", radius: 3.0, thickness: 0.92 },
                    direction: "up", speed: [0.003, 0.01],
                    lifetime: [24, 40], size: [0.12, 0.04], alphaMode: "sin",
                    color: 0xFFD36A, alpha: [0.2, 0.02], light: "world", maxParticles: 28
                },
                {
                    name: "wait_mote", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "circle", radius: 3.0 },
                    direction: "up", speed: [0.006, 0.024],
                    lifetime: [18, 30], size: [0.06, 0.01],
                    color: 0xFFF2C8, alpha: [0.6, 0], light: "full", maxParticles: 34
                }
            ]
        },
        deliver: {
            duration: 40,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "deliver_burst", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: { data: "motes", fallback: 22 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24], drag: 0.9,
                    lifetime: [14, 26], size: [0.24, 0.03],
                    color: 0xFFD36A, alpha: [1, 0], light: "full", bloom: 0.25, maxParticles: 80
                },
                {
                    name: "deliver_ring", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 3, interval: 4 }, shape: { kind: "circle", radius: 3.0, thickness: 0.9 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [16, 28], size: [0.4, 0.9], sizeMode: "sin",
                    color: 0xFFF2C8, alpha: [0.8, 0], light: "full", maxParticles: 18
                },
                {
                    name: "deliver_heart", bind: "target", offset: [0, 0.7, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: { data: "removed", fallback: 1 }, interval: 3, repeats: 5 }, shape: { kind: "sphere", radius: 0.46 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [16, 28], size: [0.18, 0.03],
                    color: 0xFFE6B0, alpha: [0.85, 0], light: "full", maxParticles: 30
                },
                {
                    name: "deliver_mote", bind: "target", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 26, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.07, 0.01],
                    color: 0xFFF2C8, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        wasted: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wasted_puff", bind: "point", offset: [0, 0.5, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xFFD36A, alpha: [0.4, 0], light: "world", maxParticles: 18
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
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFF2C8, alpha: [0.6, 0], light: "full", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_healingwish", 1, HealingWishDefinition);
