/**
 * 抓 / scratch 的客户端表现。
 *
 * 一句话：爪尖先亮起一点寒光，随后一整排平行爪痕贴着身前扫出去，每一道刮过的地方崩起细屑；
 * 被多道痕同时抓中的目标身上连炸几次白色的抓痕与碎屑，抓空的爪锋只在空气里划出几道浅弧。
 * 色相家族：象牙白（0xFFF8E8）作主体、暖骨色（0xD8C7A8）作余韵，中性尘屑收尾；饱和色只出现在爪尖寒光的小面积。
 * 拍子：起 charge（爪尖聚光）→ 击 rake（一排爪痕扫出）与 hit（每道痕的命中）→ 收 scrape／whiff。
 * 范围：rake 的每一道用 `data.path`（与服务端 trace 同一组端点）画成一条痕，玩家一眼看出身前这一弧会被扫到。
 * 运动：每一道痕沿 `data.direction` 从施法者朝外扫出、逐道偏转；命中在目标身上向外炸开、碎屑带重力落下。
 * 数：每道痕的粒子量绑 `data.edge`、命中爆点绑 `data.sparks`（物攻换算），爪痕道数绑 `data.lines`（速度换算）。
 */
const ScratchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 10,
            exit: { stop: 6, drain: 8 },
            emitters: [
                {
                    name: "glint", bind: "source", offset: [0, 0.42, 0.18], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.14, 0.04],
                    color: 0xFFFDF2, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 18
                },
                {
                    name: "brace", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xE4DCC6, alpha: [0.5, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 26
                }
            ]
        },
        rake: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "cut", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    shape: { kind: "polyline" }, burst: { count: { data: "edge", fallback: 4 } },
                    direction: "shape", orient: "direction", speed: [0.08, 0.22], spread: 10,
                    lifetime: [5, 9], size: [0.30, 0.05], sizeMode: "index",
                    color: 0xFFF8E8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "gust", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" }, burst: { count: 3 },
                    direction: "shape", orient: "direction", speed: [0.12, 0.3],
                    lifetime: [4, 8], size: [0.22, 0.06], sizeMode: "index",
                    color: 0xD8C7A8, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "mark", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "sparks", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.06, 0.2], spread: 20,
                    lifetime: [5, 9], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "flecks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/scratch_yellow",
                    burst: { count: { data: "sparks", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [5, 10], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFE9B0, alpha: [0.8, 0], light: "world", maxParticles: 40
                },
                {
                    name: "powder", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xC9BFA8, alpha: [0.55, 0], gravity: 0.05, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        scrape: {
            duration: 12,
            exit: { stop: 5, drain: 8 },
            emitters: [
                {
                    name: "chips", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "shape", speed: [0.05, 0.16], spread: 18,
                    lifetime: [5, 9], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xE0D8C4, alpha: [0.9, 0], light: "world", maxParticles: 20
                },
                {
                    name: "grit", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xC9BFA8, alpha: [0.5, 0], gravity: 0.06, light: "world", maxParticles: 24
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.32], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: { data: "lines", fallback: 3 }, interval: 2, repeats: 2 },
                    shape: { kind: "cone", radius: 0.5, angleDegrees: 34 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [5, 10], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xE8E0CC, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_scratch", 1, ScratchDefinition);
