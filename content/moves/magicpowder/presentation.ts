/**
 * 魔法粉 / magicpowder 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者手里抖起一小把泛着粉光的粉，粉团慢慢飘向对象、罩住它炸开，粉粒钻进身体泛起超能的粉光；
 *   改写到期时粉末从它身上飘散，不留一团同质粉云。草属性把粉抖开，点或方向空撒时粉团撞墙自散。
 *
 * 色相家族：超能粉（0xE86CC8 主体／0xF0A8E0 粉雾）与乳白（0xFFF0FA 粉粒高光）撑起全部层次，
 *   超能环只给命中那一下的强调。
 * 层次：聚（起手，粉在手里收拢）→ 撒（粉团带尾迹飘行）→ 改（命中处粉爆、闪点、超能环）→ 散／免／空。
 * 起击收：gather（聚）→ throw（撒）→ coat（改，只在真正改类型时）→ immune（免）→ wipe（散）／empty（空撒）／miss。
 * 范围：coat 的粉爆与超能环半径直接绑 `data.cloud`（实际粉团半径），画出的那圈就是判定尺度。
 * 运动：粉团沿 projectile 拖尾飘行（慢，能躲），命中处粉粒向外炸开后受重力下沉、超能环向外荡，散去时粉末向上飘离。
 * 数：粉粒数读 `data.motes`（特攻派生）、闪点数读 `data.glints`（等级派生），整体尺寸随 `data.scale`、
 *   亮度随 `data.intensity`（改写时长派生）。
 */
const MagicpowderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "sift", bind: "source", offset: [0, 0.25, 0.3], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 14, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.01, 0.06], spin: 16,
                    lifetime: [9, 15], size: [0.1, 0.03],
                    color: 0xE86CC8, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.3, 0.3], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 7, shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xFFF0FA, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        throw: {
            duration: 50,
            exit: { stop: 50, drain: 10 },
            emitters: [
                {
                    name: "puff", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 22, trail: { minDistance: 0.16 },
                    shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.12, 0.03], spin: 18,
                    color: 0xE86CC8, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "trail_glint", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 10 }, trail: { minDistance: 0.32 },
                    direction: "away", speed: [0.0, 0.04], spread: 20,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0xFFF0FA, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        coat: {
            duration: 32,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "motes", fallback: 18 }, interval: 2 },
                    shape: { kind: "sphere", radius: { data: "cloud", fallback: 1.2 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 45, drag: 0.9, gravity: 0.008,
                    lifetime: [12, 22], size: [0.14, 0.04], spin: 16,
                    color: 0xE86CC8, alpha: [0.85, 0], light: "world", maxParticles: 100
                },
                {
                    name: "glints", bind: "point", offset: [0, 0.5, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "glints", fallback: 10 } },
                    shape: { kind: "sphere", radius: { data: "cloud", fallback: 1.2 } },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0xFFF0FA, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.55, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "cloud", fallback: 1.2 } },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.24, 0.6], sizeMode: "index",
                    color: 0xE86CC8, alpha: [0.6, 0], light: "full", maxParticles: 8
                }
            ]
        },
        wipe: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "drift", bind: "point", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 14 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], gravity: -0.004,
                    lifetime: [14, 22], size: [0.1, 0.02], spin: 12,
                    color: 0xE86CC8, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "fade", bind: "point", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xFFF0FA, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        immune: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "puff_off", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 16 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.88, gravity: 0.012,
                    lifetime: [12, 20], size: [0.12, 0.03], spin: 18,
                    color: 0xE86CC8, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "leaf", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 8 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.01,
                    lifetime: [12, 22], size: [0.14, 0.04], spin: 10,
                    color: 0x7AC74C, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dust", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9, gravity: 0.01,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xD8A8C8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        },
        empty: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "scatter", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9, gravity: 0.008,
                    lifetime: [10, 18], size: [0.1, 0.02], spin: 14,
                    color: 0xE86CC8, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "settle_dust", bind: "point", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.01, drag: 0.94,
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xFFF0FA, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fall", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.01, drag: 0.92,
                    lifetime: [10, 18], size: [0.09, 0.02], spin: 14,
                    color: 0xE86CC8, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_magicpowder", 1, MagicpowderDefinition);
