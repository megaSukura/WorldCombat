/**
 * 背水一战 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：术者沉腰怒吼，脚边炸开一圈金色阵环，一束束力场粒子从地面向上冲起；此后阵环在脚下持续明灭，
 *   直到立誓期满、阵环碎裂散去。
 * 色相家族：金琥珀（0xE0B040 阵环 / 0xF0D060 力束）加暖白高光（0xFFF2C8）；一个色相家族。
 * 拍子：起（gather 沉腰聚气）→ 击（burst 阵环炸开、力束冲起）→ 收（stand 阵环明灭、release 碎裂散去）。
 * 范围：burst／stand／release 的阵环绑 `point`、按 `data.ring`（体重换算的阵环半径）画，玩家看到脚下阵环多大就知道立誓的范围；
 *   `data.scale` 再整体缩放。
 * 运动：gather 的土点向脚边收拢；burst 的力束由地面向上冲出；stand 的阵环贴地缓慢脉动；release 时阵环向外扩后碎掉。
 * 数：冲起的力束与土点量按 `data.surge`（物攻换算的迸发量）与 `data.boosts`（顶起的项数）派生。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const NoretreatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_dust", bind: "source", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0xE0B040, alpha: [0.5, 0], light: "world", maxParticles: 34
                },
                {
                    name: "gather_glint", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 13], size: [0.08, 0.01],
                    color: 0xFFF2C8, alpha: [0.55, 0], light: "full", maxParticles: 18
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "burst_ring", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 1 },
                    shape: { kind: "ring", radius: 1.6 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [12, 20], size: [0.5, 1.1], sizeMode: "linear",
                    color: 0xE0B040, alpha: [0.85, 0], light: "world", maxParticles: 10
                },
                {
                    name: "burst_surge", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "surge", fallback: 16 }, at: 1 },
                    shape: { kind: "circle", radius: 1.6, thickness: 0.7 },
                    direction: "up", speed: [0.12, 0.34], spread: 12, gravity: 0.02, drag: 0.92,
                    lifetime: [12, 22], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xF0D060, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "burst_core", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    burst: { count: { data: "boosts", fallback: 5 }, repeats: 4, interval: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spread: 18,
                    lifetime: [10, 18], size: [0.24, 0.04], sizeMode: "linear",
                    color: 0xFFF2C8, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        stand: {
            duration: 0,
            exit: { stop: 0, drain: 22 },
            emitters: [
                {
                    name: "stand_ring", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 3, shape: { kind: "circle", radius: 1.6, thickness: 0.92 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [24, 36], size: [0.34, 0.1], sizeMode: "sin",
                    color: 0xE0B040, alpha: [0.35, 0.05], alphaMode: "sin", light: "world", maxParticles: 18
                },
                {
                    name: "stand_dust", bind: "source", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 2, shape: { kind: "circle", radius: 1.6, thickness: 0.85 },
                    direction: "up", speed: [0.005, 0.02], gravity: 0.01, drag: 0.94,
                    lifetime: [20, 30], size: [0.12, 0.03],
                    color: 0xF0D060, alpha: [0.2, 0.02], alphaMode: "sin", light: "world", maxParticles: 10
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "release_ring", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 1.6 },
                    direction: "outward", speed: [0.06, 0.18], drag: 0.9,
                    lifetime: [14, 22], size: [0.5, 0.8], sizeMode: "linear",
                    color: 0xE0B040, alpha: [0.6, 0], light: "world", maxParticles: 8
                },
                {
                    name: "release_dust", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "surge", fallback: 12 }, at: 1 },
                    shape: { kind: "circle", radius: 1.6, thickness: 0.9 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02, drag: 0.92,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xF0D060, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_noretreat", 1, NoretreatDefinition);
