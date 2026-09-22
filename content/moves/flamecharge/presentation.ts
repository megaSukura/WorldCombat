/**
 * 蓄能焰袭 / flamecharge 的客户端表现。
 *
 * 一句话：火焰从四周收拢包住全身，随后整个人低头拖着一串火与火星直线撞出去，命中的地方炸开一片火系撞击。
 * 色相家族：橙红（flame / ember / cloudyfire_white，0xF08030 与 0xC03818），强调处近白（0xFFE8A0）。
 * 拍子：起（flare 收火）→ 冲（rush 拖火）→ 行（wake 余焰）→ 击（hit）→ 提（boost）→ 灭（fizzle）。
 * 范围：rush 的火焰半径就是判定半径（`data.scale` 由火焰半径派生），玩家看得出贴着这条线会被点着。
 * 运动：flare 沿球面向内卷拢；rush 的火贴着身体向后甩、火星向外抛。
 * 数：火星数量绑定 `data.heat`（速度与物攻派生），命中强弱绑定 `data.intensity`（本次伤害比例派生），
 *   提速级数绑定 `data.stages`。
 */
const FlamechargeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        flare: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.8 }, direction: "inward", speed: [0.06, 0.2],
                    lifetime: [7, 12], size: [0.34, 0.12],
                    color: 0xF08030, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "embers", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.7 }, direction: "inward", speed: [0.04, 0.16],
                    lifetime: [6, 11], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 40
                }
            ]
        },
        rush: {
            duration: 40,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "cloak", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "heat", fallback: 20 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "away", speed: [0.05, 0.2], drag: 0.9,
                    lifetime: [7, 13], size: [0.4, 0.14],
                    color: 0xF08030, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "trailfire", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "heat", fallback: 20 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "away", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [6, 11], size: [0.3, 0.08], sizeMode: "index",
                    color: 0xC03818, alpha: [0.65, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "heat", fallback: 20 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "away", speed: [0.1, 0.4], spread: 20, drag: 0.9,
                    lifetime: [5, 9], size: [0.12, 0.02],
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 80
                }
            ]
        },
        wake: {
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "after", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "heat", fallback: 20 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "away", speed: [0.02, 0.1], drag: 0.92, gravity: -0.01,
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0xF08030, alpha: [0.4, 0], light: "full", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 28,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "heat", fallback: 20 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFE8A0, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "flames", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "heat", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.1, 0.35], drag: 0.9,
                    lifetime: [8, 16], size: [0.34, 0.1], sizeMode: "index",
                    color: 0xF08030, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 150
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1], gravity: -0.02, drag: 0.9,
                    lifetime: [14, 24], size: [0.4, 0.18],
                    color: 0x6A5B52, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        boost: {
            duration: 30,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "ring", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "stages", fallback: 1 } }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 16], size: [0.32, 0.62],
                    color: 0xF08030, alpha: [0.75, 0], light: "full", maxParticles: 24
                },
                {
                    name: "flareup", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "stages", fallback: 1 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.08, 0.3], drag: 0.9,
                    lifetime: [8, 14], size: [0.3, 0.08],
                    color: 0xFFE8A0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 60
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "die", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.88,
                    lifetime: [6, 12], size: [0.09, 0.01],
                    color: 0xC03818, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flamecharge", 1, FlamechargeDefinition);
