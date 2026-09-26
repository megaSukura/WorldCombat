/**
 * 烧尽 / incinerate 的客户端表现。
 *
 * 一句话：施法者口前拢起一束火苗，随后这束窄火舌从左向右一路舔过去，像一把移动的火镰；被舔到的敌人身上
 * 炸开火团，若它手里的树果或宝石真的被烧掉，火顺着那件东西窜高一簇、腾起几粒焦灰。
 * 色相家族：火橙（flame / ember / impact_fire）为唯一主色，烟与焦灰（smoke / tinydust）作衬，近白只在击点。
 * 拍子：起（gather 拢火）→ 扫（sweep 火舌逐刻横移）→ 击（burn 命中／爆燃）→ 撞墙（wall）→ 被挡（ward）→ 空（fizzle）。
 * 范围：sweep 的火舌贴 `data.path` 的两个顶点（口部到本刻真实接触点）画一条窄线，再在 `data.point` 的舌尖加一小簇火；
 *   判定与画面读同一个 trace 接触点，撞墙时画到真实方块格。
 * 运动：拢火向内聚；扫出时火舌沿当前指向舔过、边缘火星向外飞；命中是短促外爆，烧到可燃物才额外窜高。
 * 数：`data.flames`（特攻派生的火焰数）驱动拢火与火舌的粒子量；`data.flare`（烧到可燃物并取走时的火焰数，否则 0）
 *     单独驱动那簇爆燃；`data.ash`（烧毁成功时的焦屑数，否则 0）驱动灰屑；`data.intensity`（本击伤害占比）放大命中爆发。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const IncinerateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 26,
            exit: { stop: 16, drain: 14 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.6, 0.35], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "flames", fallback: 14 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [6, 12], size: [0.16, 0.02],
                    color: 0xF08030, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.7, 0.35], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 22, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 13], size: [0.06, 0.01],
                    color: 0xFFC46A, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        sweep: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "tongue", bind: "path", fit: "none", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    shape: { kind: "polyline" }, rate: { data: "flames", fallback: 14 }, speed: [0.02, 0.08],
                    direction: "outward", spread: 8,
                    lifetime: [5, 12], size: [0.2, 0.02],
                    color: 0xF08030, alpha: [0.85, 0], light: "full", maxParticles: 160
                },
                {
                    name: "lick", bind: "path", fit: "none", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "polyline" }, rate: { data: "flames", fallback: 14 }, speed: [0.05, 0.18],
                    direction: "up", spread: 10,
                    lifetime: [6, 13], size: [0.07, 0.01],
                    color: 0xFFC46A, alpha: [0.85, 0], light: "full", maxParticles: 140
                },
                {
                    name: "tip", bind: "point", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 26, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [5, 11], size: [0.14, 0.02],
                    color: 0xFF9A3C, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        burn: {
            duration: 28,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 12, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [5, 11], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFE0B0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 44
                },
                {
                    name: "spray", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "flames", fallback: 14 } }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.02,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xFFB050, alpha: [0.85, 0], light: "full", maxParticles: 140
                },
                {
                    name: "flare", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "flare", fallback: 0 } }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.1, 0.3], gravity: 0.05, spin: 14,
                    lifetime: [10, 22], size: [0.12, 0.02],
                    color: 0xE06020, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "ash", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "ash", fallback: 0 } }, shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18], spread: 26, gravity: 0.03, spin: 18,
                    lifetime: [12, 24], size: [0.08, 0.01],
                    color: 0x8A8580, alpha: [0.85, 0], light: "world", maxParticles: 48
                },
                {
                    name: "scorch", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [12, 22], size: [0.5, 0.16],
                    color: 0x8A4520, alpha: [0.5, 0], light: "world", maxParticles: 4
                }
            ]
        },
        wall: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "lick", bind: "point", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "flames", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 60 },
                    orient: "direction",
                    direction: [{ data: "direction.0", fallback: 0 }, { data: "direction.1", fallback: 1 }, { data: "direction.2", fallback: 0 }],
                    speed: [0.06, 0.26], spread: 16,
                    lifetime: [5, 12], size: [0.18, 0.02],
                    color: 0xF08030, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "spark", bind: "point", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 8 },
                    shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.3], spread: 30, gravity: 0.02,
                    lifetime: [6, 14], size: [0.07, 0.01],
                    color: 0xFFC46A, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        ward: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "soak", bind: "point", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [6, 14], size: [0.12, 0.02],
                    color: 0xE07A30, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 6, drain: 18 },
            emitters: [
                {
                    name: "dieout", bind: "point", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 14], size: [0.12, 0.02],
                    color: 0xE07A30, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "smoke", bind: "point", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [14, 26], size: [0.16, 0.03],
                    color: 0x6E6258, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_incinerate", 1, IncinerateDefinition);
