/**
 * 烧尽 / incinerate 的客户端表现。
 *
 * 一句话：施法者口前拢起火苗、向内卷成扇面，随后一整片扇形火焰朝前铺开；扇内每个被点到的敌人身上炸开
 * 火团与飞散的火星，若它手里有可燃物，火苗顺着那件东西窜高一截、腾起一枚焦黑的小块。
 * 色相家族：火橙（flame / ember / impact_fire）为唯一主色，烟（smoke）作衬，近白（smallsparkle）只在击点。
 * 拍子：起（gather 拢火）→ 扫（sweep 铺扇）→ 击（burn 命中／爆燃）→ 空（fizzle 散火）。
 * 范围：sweep 的火焰贴 `data.path` 的扇面顶点铺满，画出的就是判定覆盖的那块扇形；顶点与判定同源。
 * 运动：拢火时火苗向内聚；扫出时整片火朝上舔起、边缘火星向外飞；命中是短促外爆，烧到可燃物时额外窜高一簇。
 * 数：`data.flames`（特攻派生的火焰数）驱动拢火与扇面的粒子量；`data.flare`（烧到可燃物时的火焰数，否则 0）
 *     单独驱动那簇爆燃；`data.intensity`（本击伤害占比）放大命中爆发。
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
            duration: 28,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "sheet", bind: "path", fit: "none", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    shape: { kind: "polygon" }, rate: { data: "flames", fallback: 14 }, speed: [0.01, 0.05],
                    direction: "up", spread: 6,
                    lifetime: [8, 16], size: [0.22, 0.03],
                    color: 0xF08030, alpha: [0.7, 0], light: "full", maxParticles: 220
                },
                {
                    name: "billow", bind: "path", fit: "none", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "polygon" }, rate: { data: "flames", fallback: 14 }, speed: [0.06, 0.2],
                    direction: "outward", gravity: 0.01,
                    lifetime: [8, 18], size: [0.07, 0.01],
                    color: 0xFFD08A, alpha: [0.85, 0], light: "full", maxParticles: 240
                },
                {
                    name: "wisp", bind: "source", offset: [0, 0.5, 0.6], height: 0.3, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 30, shape: { kind: "box", size: [0.5, 0.3, 0.2] },
                    direction: "away", speed: [0.12, 0.34],
                    lifetime: [6, 13], size: [0.14, 0.02],
                    color: 0xFF9A3C, alpha: [0.7, 0], light: "full", maxParticles: 120
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
                    name: "scorch", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [12, 22], size: [0.5, 0.16],
                    color: 0x8A4520, alpha: [0.5, 0], light: "world", maxParticles: 4
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
