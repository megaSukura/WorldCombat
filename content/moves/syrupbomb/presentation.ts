/**
 * 糖浆炸弹 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：掌心搓出一团琥珀糖浆，炸弹抛着弧线飞出去，落地炸开一大片粘糖——被裹住的敌人身上滴着糖浆、
 *   一阵阵发沉，落点地面摊开一汪会黏脚的糖洼。
 * 色相家族：琥珀 0xD89A3C / 0xE0A94E 为主，奶油 0xF4DFAE 提亮，暗褐 0x8A5E2E 只做阴影；一个暖色相。
 * 层次：搓糖（windup）→ 糖弹＋尾迹（lob）→ 爆散＋糖洼（burst／pool）→ 裹身（coat／slow）→ 余滴（linger）。
 * 范围：burst 的环半径直接读机制爆散半径（data.radius）；pool 的盘按 data.scale 摊开——画的就是糖真正铺到哪。
 * 运动：糖弹走抛物线并拖一条蜜尾；落地时糖浆向外摊开、气泡上浮，之后糖洼缓慢冒泡，目标身上一滴一滴往下坠。
 * 数：服务端把 data.intensity（威力）与 data.coated（裹住几人）交给发射器，炸得越狠、裹得越多，糖浆越厚。
 * 参照节：视觉语言第二、三、四、五、六、七、九节。
 */
const SyrupbombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "syrup_ball", bind: "source", offset: [0, 0.7, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 20, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.16, 0.03],
                    color: 0xE0A94E, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "syrup_bubble", bind: "source", offset: [0, 0.7, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/bubble/opaque_orange",
                    rate: 8, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xF4DFAE, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        lob: {
            duration: 60,
            exit: { stop: 60, drain: 14 },
            emitters: [
                {
                    name: "bomb_core", bind: "projectile", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 30, trail: { minDistance: 0.2 }, shape: { kind: "sphere", radius: 0.12 },
                    direction: "velocity", speed: [0.0, 0.03], spin: 12,
                    lifetime: [8, 14], size: [0.18, 0.03],
                    color: 0xD89A3C, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "honey_trail", bind: "projectile", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, trail: { minDistance: 0.3 },
                    direction: "velocity", speed: [0.0, 0.02], drag: 0.85,
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xF4DFAE, alpha: [0.5, 0], light: "full", maxParticles: 50
                }
            ]
        },
        burst: {
            duration: 36,
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "splash_core", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 1, at: 1 }, amount: 2,
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.3], gravity: 0.03,
                    lifetime: [10, 18], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xD89A3C, alpha: [0.95, 0], light: "full", maxParticles: 70
                },
                {
                    name: "splash_ring", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "coated", fallback: 1 } }, amount: 8,
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.18], drag: 0.92,
                    lifetime: [12, 22], size: [0.3, 0.03],
                    color: 0xE0A94E, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "splash_goo", bind: "point", offset: [0, 0.16, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 1 }, amount: 10,
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.04, spin: 10,
                    lifetime: [14, 26], size: [0.16, 0.03],
                    color: 0x8A5E2E, alpha: [0.8, 0], light: "world", maxParticles: 90
                }
            ]
        },
        coat: {
            duration: 26,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "coat_splash", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 16 }, amount: 2,
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.22, 0.04], sizeMode: "index",
                    alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "coat_bubble", bind: "target", height: 0.65, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.08, 0.02],
                    color: 0xF4DFAE, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        slow: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "heavy_drip", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 8, at: 2 }, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.03,
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0xD89A3C, alpha: [0.75, 0], light: "world", maxParticles: 20
                },
                {
                    name: "heavy_spark", bind: "target", height: 0.75, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xF4DFAE, alpha: [0.7, 0], light: "full", maxParticles: 14
                }
            ]
        },
        pool: {
            duration: 40,
            exit: { stop: 40, drain: 30 },
            emitters: [
                {
                    name: "pool_disc", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 26, shape: { kind: "circle", radius: 1.6 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 28], size: [0.14, 0.02], sizeMode: "sin",
                    color: 0x8A5E2E, alpha: [0.45, 0], light: "world", maxParticles: 70
                },
                {
                    name: "pool_bubble", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/opaque_orange",
                    rate: 10, shape: { kind: "circle", radius: 1.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.07, 0.01],
                    color: 0xE0A94E, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        stick: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stuck", bind: "target", offset: [0, 0.06, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0xD89A3C, alpha: [0.6, 0], light: "world", maxParticles: 22
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "coated_drip", bind: "target", height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 4, shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "down", speed: [0.01, 0.04], gravity: 0.02,
                    lifetime: [16, 26], size: [0.08, 0.01],
                    color: 0x8A5E2E, alpha: [0.4, 0], light: "world", maxParticles: 14
                },
                {
                    name: "coated_shine", bind: "target", height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3, shape: { kind: "sphere_surface", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xF4DFAE, alpha: [0.35, 0], light: "full", maxParticles: 12
                }
            ]
        },
        fizzle: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "miss_splat", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 16 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03, drag: 0.9,
                    lifetime: [12, 22], size: [0.14, 0.02],
                    color: 0xD89A3C, alpha: [0.6, 0], light: "world", maxParticles: 26
                },
                {
                    name: "miss_mist", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xF4DFAE, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_syrupbomb", 1, SyrupbombDefinition);
