/**
 * 寄生种子 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者手里聚起一粒种子 → 种子沿自由瞄准方向抛出去、扎进首碰的敌人身上生根 →
 *   此后身上常挂一丛细藤、每一口真实失血都有一颗生命光沿两者的线抽回施法者 → 真回到血才在自己身上亮绿点 →
 *   根枯时散成一撮土。
 *
 * 色相家族：草绿 0x6FBF3F 为主体，深绿 0x2F7A2A 做藤与根，浅黄绿 0xC7F08A 只做抽回的高光，土褐 0x241A10 做余韵。
 * 层次：种子（主体，`generic/grass/seed`）／藤与汁流（细节，沿路径与方向的叶与光点）／土（余韵）。
 * 拍子：gather（聚种 0–16t）→ throw（抛种）→ root（生根 0–28t）→ bound（常驻细藤，随标记存续）→
 *   drain（每口真实失血，生命光沿 `data.direction`/`data.span` 从宿主流向施法者）→ heal（真回血才亮绿点）→ wither（枯萎 0–22t）。
 * 运动：种子沿弹道飞行；drain 的生命光是一条真实方向的线段，从宿主沿 `data.direction` 飞向施法者，
 *   `data.span` 就是两者当刻的实际距离，`data.flowSpeed` 由距离换算——光点真的走完这段线，而不是从中心向外的散点。
 * 数：藤蔓与光点数量绑 `data.vines`（特攻派生）；每口的实抽量由 `data.amount`、实际回量由 `data.healed` 写出，
 *   `data.intensity` 决定这一口的亮度；heal 只在服务端确认回血成功后才播。
 */
const LeechSeedDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "seed", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 2, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.22, 0.14], sizeMode: "index",
                    color: 0x6FBF3F, alpha: [0.9, 0], light: "full", maxParticles: 6
                },
                {
                    name: "motes", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.01], sizeMode: "sin",
                    color: 0xC7F08A, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        throw: {
            duration: 60,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    rate: 26, shape: { kind: "sphere", radius: 0.12 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0x6FBF3F, alpha: [0.75, 0], light: "full", maxParticles: 50
                },
                {
                    name: "streak", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 6, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0x2F7A2A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        root: {
            duration: 28,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "sprout", bind: "target", fit: "body", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "vines", fallback: 8 } }, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.28, 0.12], sizeMode: "index",
                    color: 0x6FBF3F, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "impact", bind: "target", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [7, 13], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xC7F08A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "crawl", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 18, direction: "shape", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.11, 0.02], sizeMode: "index",
                    color: 0x2F7A2A, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        // 常驻：绑定托管标记，随根的自然到期或提前枯萎一起清理；细藤一直扒在受种身体上。
        bound: {
            duration: 0,
            emitters: [
                {
                    name: "cling", bind: "target", fit: "body", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 3, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 28], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0x2F7A2A, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
                {
                    name: "bud", bind: "target", fit: "body", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4, shape: { kind: "ring", radius: 0.28 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [12, 20], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0x6FBF3F, alpha: [0.35, 0], light: "world", maxParticles: 14
                }
            ]
        },
        // 每口真实失血：一条沿真实方向的线段光，从宿主流向施法者，走完整段距离。
        drain: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "vines", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "vines", fallback: 8 } }, direction: "shape", speed: [0.12, 0.3],
                    lifetime: [8, 14], size: [0.18, 0.02], sizeMode: "index",
                    color: 0x2F7A2A, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "sap", bind: "target", fit: "world", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    shape: { kind: "line", length: { data: "span", fallback: 3 } },
                    orient: "direction", direction: "shape",
                    burst: { count: 1 }, speed: { data: "flowSpeed", fallback: 0.25 },
                    lifetime: [10, 14], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0xC7F08A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 4
                },
                {
                    name: "wobble", bind: "target", fit: "body", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x6FBF3F, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        // 只有服务端确认回血成功才播出：施法者身上亮起一撮绿点，数量随实际回量提亮。
        heal: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "glow", bind: "source", fit: "body", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x7CE06A, alpha: [0.9, 0], light: "full", bloom: 0.22, maxParticles: 24
                }
            ]
        },
        // 草免疫／已有活根：种子打在身体上却扎不下去。
        immune: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "reject", bind: "target", fit: "body", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8A7A3A, alpha: [0.7, 0], gravity: 0.03, drag: 0.94, light: "world", maxParticles: 24
                }
            ]
        },
        // 撞到友方：种子停在身体上，没有种植。
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "target", fit: "body", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.02], gravity: 0.02, drag: 0.95,
                    color: 0x9AA07A, alpha: [0.55, 0], light: "world", maxParticles: 18
                }
            ]
        },
        // 撞到方块：种子砸在墙面/地面，只留一点尘。
        splat: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "hit", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.08, 0.02], gravity: 0.03, drag: 0.94,
                    color: 0x6B5A38, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        wither: {
            duration: 22,
            exit: { stop: 7, drain: 15 },
            emitters: [
                {
                    name: "dry", bind: "target", fit: "body", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "down", speed: [0.03, 0.1],
                    lifetime: [14, 24], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8A7A3A, alpha: [0.6, 0], gravity: 0.03, drag: 0.94, light: "world", maxParticles: 30
                },
                {
                    name: "soil", bind: "target", fit: "body", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [16, 26], size: [0.07, 0.02], gravity: 0.02, drag: 0.95,
                    color: 0x241A10, alpha: [0.42, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_leechseed", 1, LeechSeedDefinition);
