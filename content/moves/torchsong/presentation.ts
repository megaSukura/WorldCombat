/**
 * 闪焰高歌 / torchsong 的客户端表现。
 *
 * 一句话：先吸一口气、火星与音符往嗓子口收，随后张口朝目标喷出一道越唱越旺的火焰锥，火焰里裹着金色音符，
 * 命中处炸开火系撞击，唱完余烬散去。
 * 色相家族：橙金（flame / ember / note，0xF0A030 与 0xFFD25A），强调处近白；音符用原色。
 * 拍子：起（inhale）→ 唱（sing 多段锥面）→ 击（hit）→ 提（boost）→ 收（fade）。
 * 范围：sing 的锥面长度与张角就是判定锥（`data.reach`、`data.half`），玩家看得出站进锥里会被烧到。
 * 运动：inhale 向内收拢；sing 沿 `data.direction` 从口中喷出、贴锥面向外甩；音符上浮。
 * 数：音符与火星数量绑定 `data.notes`（特攻派生），命中强弱绑定 `data.intensity`（总威力派生），
 *   当前段数绑定 `data.pulse`。
 */
const TorchsongDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.8, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.6 }, direction: "inward", speed: [0.05, 0.18],
                    lifetime: [6, 11], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFFD25A, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 40
                },
                {
                    name: "notes", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 6, shape: { kind: "sphere_surface", radius: 0.6 }, direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFFF2C0, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        },
        sing: {
            duration: 0,
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "throat", bind: "source", offset: [0, 0, 0], height: 0.8, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "notes", fallback: 26 }, interval: 2, repeats: 3 },
                    shape: { kind: "cone_volume", radius: 0.25, length: 7, angleDegrees: { data: "half", fallback: 13 } },
                    direction: "shape", speed: [0.06, 0.22], spread: 8,
                    lifetime: [6, 11], size: [0.34, 0.1], sizeMode: "index",
                    color: 0xF0A030, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 200
                },
                {
                    name: "core", bind: "source", offset: [0, 0, 0], height: 0.8, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "notes", fallback: 26 },
                    shape: { kind: "cone_volume", radius: 0.25, length: 7, angleDegrees: { data: "half", fallback: 13 } },
                    direction: "shape", speed: [0.04, 0.16],
                    lifetime: [5, 10], size: [0.42, 0.16],
                    color: 0xFFD25A, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 160
                },
                {
                    name: "songers", bind: "source", offset: [0, 0, 0], height: 0.85, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: { data: "notes", fallback: 26 },
                    shape: { kind: "cone_volume", radius: 0.25, length: 7, angleDegrees: { data: "half", fallback: 13 } },
                    direction: "shape", speed: [0.05, 0.18], spin: 20,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xFFF2C0, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "notes", fallback: 26 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFD25A, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "scorch", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "notes", fallback: 26 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.32], drag: 0.9,
                    lifetime: [8, 15], size: [0.3, 0.09], sizeMode: "index",
                    color: 0xF0A030, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08], gravity: -0.02, drag: 0.9,
                    lifetime: [14, 22], size: [0.34, 0.16],
                    color: 0x6A5B52, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        },
        boost: {
            duration: 28,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "ring", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 16], size: [0.32, 0.62],
                    color: 0xFFD25A, alpha: [0.75, 0], light: "full", maxParticles: 20
                },
                {
                    name: "chorus", bind: "source", offset: [0, 0.7, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "gift", fallback: 1 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.5 }, direction: "up", speed: [0.04, 0.16], spin: 24,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xFFF2C0, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "embers", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1], gravity: -0.01, drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0xF0A030, alpha: [0.5, 0], light: "world", maxParticles: 50
                },
                {
                    name: "hush", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.01, 0.06],
                    gravity: -0.02, lifetime: [14, 24], size: [0.3, 0.12],
                    color: 0x7A6A60, alpha: [0.25, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_torchsong", 1, TorchsongDefinition);
