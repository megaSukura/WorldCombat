/**
 * 疯狂伏特 / wildcharge 的客户端表现。
 *
 * 一句话：电流从全身收拢、越跑越亮，整个人笔直冲出去；电流沿真实身体一路走到接触侧——干燥目标在接触点炸开一圈，
 * 湿透目标则沿着躯体表面爬散、被必然灌入麻痹；撞完站在原地短放电收势。湿透的施法者一开冲，脚下就先漏出一小段弧。
 * 色相家族：电黄（0xF2D03A）与冷白（0xEAF6FF），电弧的蓝（0x5AC8F0）用在湿身漏电与传导。
 * 拍子：起 windup（收拢电流）→ 冲 charge（带电直线冲刺，leak 为湿身起冲漏电）→ impact（干燥命中）／conduct（湿身命中）→ settle（原地短放电收势）／ discharge（冲空或墙前泄放）。
 * 范围：charge 的冲刺线沿 `data.path` 两顶点铺成一条电弧带；impact／conduct 的 conductor 也走 `data.path`，画的就是身体到接触侧那一段。
 * 运动：速度线沿 `data.direction` 掠过；命中后电弧与火花从接触点散开；湿目标的电流沿躯体表面爬行。
 * 数：`data.spark` 决定冲线、泄放与漏电的火花密度，`data.hits`（威力派生）决定命中迸发数，
 * `data.conducted`（1 表示这次真的灌入麻痹）决定接触点核心的蓄能电弧，`data.soaked`（1 表示自己湿透）决定起冲与收势的漏电，
 * `data.blocked`（1 表示撞墙）决定墙前是否补一圈贴面电弧。
 */
const WildchargeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.7, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [7, 12], size: [0.16, 0.03],
                    color: 0xF2D03A, alpha: [0.75, 0], light: "full", maxParticles: 40
                },
                {
                    name: "ground", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 6, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0x5AC8F0, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
                {
                    // overload 打开时多一圈外张的蓄能电弧，预告这一趟更猛。
                    name: "surge", bind: "source", offset: [0, 0.85, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "overload", fallback: 0 }, repeats: 6, interval: 2 },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [6, 10], size: [0.14, 0.03],
                    color: 0xEAF6FF, alpha: [0.8, 0], light: "full", maxParticles: 24
                },
                {
                    // soaked 打开时脚边提前漏电，对应起冲的漏电成本。
                    name: "drip", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "soaked", fallback: 0 }, repeats: 12, interval: 1 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 10], size: [0.07, 0.02],
                    color: 0x5AC8F0, alpha: [0.6, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 26
                }
            ]
        },
        charge: {
            duration: 42,
            exit: { stop: 26, drain: 14 },
            emitters: [
                {
                    name: "track", bind: "path", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" },
                    rate: { data: "spark", fallback: 20 }, speed: [0.03, 0.12], spread: 24,
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.6, 0], light: "full", maxParticles: 220
                },
                {
                    name: "arc", bind: "source", offset: [0, 0.5, 0], height: 0.45, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 40, shape: { kind: "box", size: [0.34, 0.3, 0.34] },
                    direction: "shape", speed: [0.03, 0.12], trail: { minDistance: 0.22 },
                    lifetime: [5, 9], size: [0.18, 0.05],
                    color: 0xF2D03A, alpha: [0.8, 0], light: "full", maxParticles: 240
                },
                {
                    name: "rush", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 28, shape: { kind: "box", size: [0.3, 0.24, 0.3] },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.26 },
                    lifetime: [5, 8], size: [0.16, 0.05],
                    color: 0xEAF6FF, alpha: [0.6, 0], light: "full", maxParticles: 160
                },
                {
                    // 湿身起冲时脚下持续漏电。
                    name: "leak", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "soaked", fallback: 0 }, repeats: 24, interval: 1 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.03, drag: 0.9,
                    lifetime: [6, 10], size: [0.07, 0.02],
                    color: 0x5AC8F0, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        leak: {
            duration: 20,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "spark", fallback: 14 } },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.05, drag: 0.88,
                    lifetime: [7, 12], size: [0.12, 0.03],
                    color: 0x5AC8F0, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "ground", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [9, 15], size: [0.3, 0.06],
                    color: 0xF2D03A, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    // 电流沿真实身体走到接触侧：路径两端是施法者与接触点。
                    name: "conductor", bind: "path", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" },
                    rate: { data: "spark", fallback: 18 }, speed: [0.02, 0.08], spread: 14,
                    lifetime: [5, 9], size: [0.13, 0.03], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "arc", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "hits", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.3], spread: 16,
                    lifetime: [7, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xF2D03A, alpha: [1, 0], light: "full", bloom: 0.6
                },
                {
                    name: "sparks", bind: "target", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 12 },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.1, 0.28], spin: 14,
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0x5AC8F0, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    // conducted=1 才多一圈蓄能核心，表示这次麻痹真的灌进去了。
                    name: "conduction", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "conducted", fallback: 0 }, repeats: 10, interval: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.22, 0.03],
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        conduct: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "conductor", bind: "path", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" },
                    rate: { data: "spark", fallback: 18 }, speed: [0.02, 0.08], spread: 14,
                    lifetime: [5, 9], size: [0.13, 0.03], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    // 湿目标：电流贴着躯体表面扩散，而不是在接触点炸成一颗球。
                    name: "spread", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "hits", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.46 },
                    direction: "outward", speed: [0.04, 0.14], spin: 10,
                    lifetime: [10, 18], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xF2D03A, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "crawl", bind: "target", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "spark", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.48 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [12, 20], size: [0.12, 0.03],
                    color: 0x5AC8F0, alpha: [0.8, 0], light: "full", maxParticles: 80
                },
                {
                    name: "conduction", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "conducted", fallback: 0 }, repeats: 14, interval: 1 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 16], size: [0.2, 0.03],
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        settle: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "vent", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 10 },
                    shape: { kind: "hemisphere", radius: 0.46, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.06, 0.22], spread: 20,
                    lifetime: [7, 12], size: [0.3, 0.05],
                    color: 0xF2D03A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "ground", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "spark", fallback: 16 } },
                    shape: { kind: "ring", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.03, drag: 0.9,
                    lifetime: [9, 15], size: [0.08, 0.02],
                    color: 0x5AC8F0, alpha: [0.6, 0], light: "world", maxParticles: 50
                },
                {
                    name: "drip", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "soaked", fallback: 0 }, repeats: 8, interval: 1 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.04, drag: 0.88,
                    lifetime: [7, 11], size: [0.07, 0.02],
                    color: 0x5AC8F0, alpha: [0.55, 0], light: "world", maxParticles: 26
                }
            ]
        },
        discharge: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "vent", bind: "point", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "spark", fallback: 18 } },
                    shape: { kind: "hemisphere", radius: 0.5, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.08, 0.3], spread: 18,
                    lifetime: [8, 14], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF2D03A, alpha: [0.95, 0], light: "full", bloom: 0.4
                },
                {
                    name: "crackle", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 16], size: [0.34, 0.07],
                    color: 0xEAF6FF, alpha: [0.6, 0], light: "world"
                },
                {
                    // blocked=1：撞墙时在墙面补一圈贴面电弧。
                    name: "wall", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "blocked", fallback: 0 }, repeats: 6, interval: 2 },
                    shape: { kind: "box", size: [0.5, 0.4, 0.5] },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [6, 10], size: [0.16, 0.04],
                    color: 0x5AC8F0, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        wake: {
            duration: 8,
            emitters: [
                {
                    name: "static", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: { data: "motes", fallback: 8 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [6, 10], size: [0.07, 0.02],
                    color: 0xF2D03A, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wildcharge", 1, WildchargeDefinition);
