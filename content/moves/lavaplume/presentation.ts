/**
 * 喷烟 / lavaplume 的客户端表现。
 *
 * 一句话：施法者脚边腾起火星与浓烟，一道熔岩烟柱从身上向上喷起，随即向外塌成一圈火环扫过地面，
 * 圈里的人各自烧起来；浓烟式退去后，那一圈地上还闷着一层暗红的余烬慢慢灭。
 * 色相家族：火焰橙与余烬黄（fire/flame / fire/ember / impact_fire / vanilla/lava）为主体，
 * 黑烟（smoke）做衬托，近白只做火柱根部的高光。
 * 拍子：起（stoke 攒火）→ 击（plume 喷柱、wave 塌环、hit 烧身）→ 收（ember 闷烧 / fade 散去 / miss）。
 * 范围：wave / ember 的地面环按服务端传的 `data.radius`（真实火环半径）画出，圈就是会被烧到的地。
 * 运动：烟柱竖直上升，火环再沿地表向外铺开。
 * 数：`data.height`（体型与特攻派生）决定烟柱高度，`data.flow`（半径派生）决定环上密度，
 * `data.count`（威力派生）决定命中火量。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const LavaplumeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        stoke: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "sparks", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1], spread: 14,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 34
                },
                {
                    name: "fumes", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.02, 0.08],
                    drag: 0.9,
                    lifetime: [12, 22], size: [0.2, 0.32],
                    color: 0x4A3A34, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        plume: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "column", bind: "source", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "flow", fallback: 70 }, shape: { kind: "cylinder", radius: 0.42, length: { data: "height", fallback: 1.6 } },
                    direction: "up", speed: [0.08, 0.28], spread: 12,
                    lifetime: [8, 16], size: [0.26, 0.05],
                    color: 0xFF8A33, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "core", bind: "source", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "flow", fallback: 40 }, shape: { kind: "cylinder", radius: 0.3, length: { data: "height", fallback: 1.6 } },
                    direction: "up", speed: [0.05, 0.2], spread: 10,
                    lifetime: [8, 14], size: [0.3, 0.06],
                    color: 0xFFE2A0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "smoke", bind: "source", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 26, shape: { kind: "cylinder", radius: 0.5, length: { data: "height", fallback: 1.6 } },
                    direction: "up", speed: [0.06, 0.2],
                    drag: 0.9,
                    lifetime: [14, 26], size: [0.34, 0.6],
                    color: 0x3A2E2A, alpha: [0.45, 0], light: "world", maxParticles: 90
                }
            ]
        },
        wave: {
            duration: 12,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "front", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "flow", fallback: 70 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.2 } },
                    direction: "outward", speed: [0.04, 0.16], spread: 10,
                    lifetime: [10, 18], size: [0.4, 0.7], sizeMode: "linear",
                    color: 0xFF9A40, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 140
                },
                {
                    name: "embers", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.2 } },
                    direction: "outward", speed: [0.06, 0.26], spread: 16,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", maxParticles: 160
                },
                {
                    name: "haze", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "flow", fallback: 30 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.2 } },
                    direction: "up", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [16, 30], size: [0.4, 0.7],
                    color: 0x3A2E2A, alpha: [0.35, 0], light: "world", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.38, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "scorch", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18], spread: 16,
                    lifetime: [10, 20], size: [0.22, 0.05],
                    color: 0xFF7A2E, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        ember: {
            duration: 24,
            exit: { drain: 20 },
            emitters: [
                {
                    name: "burning_floor", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 8 }, interval: 6, repeats: 4, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.2 } },
                    direction: "outward", speed: [0.02, 0.09], spread: 18,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xFF6A24, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "low_smoke", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 12, shape: { kind: "circle", radius: { data: "radius", fallback: 3.2 } },
                    direction: "up", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [16, 28], size: [0.32, 0.5],
                    color: 0x3A2E2A, alpha: [0.25, 0], light: "world", maxParticles: 60
                }
            ]
        },
        fade: {
            duration: 28,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "dying_smoke", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 20, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.2 } },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [16, 28], size: [0.4, 0.7],
                    color: 0x2E2624, alpha: [0.35, 0], light: "world", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "puff", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [12, 22], size: [0.3, 0.5],
                    color: 0x4A3A34, alpha: [0.3, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lavaplume", 1, LavaplumeDefinition);
