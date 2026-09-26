/**
 * 地狱翻滚 / submission 的客户端表现。
 *
 * 一句话：压低身形沿短线扑上去，张开双臂抓住目标的一刻在它身上炸开一圈抓取环，随即拧身把两者一起砸进地面，
 * 落点掀起成片的土石与冲击环；抓空只是脚下一圈扑空的尘土。
 * 色相家族：土褐（0xB07A50）与暗赭（0x8A6B4A），尘土的米黄（0xD8C7A8）铺底，格斗的暗红（0xC0563C）只在砸落核心一点。
 * 拍子：起 windup（压低探身）→ 扑 lunge（短线扑抓）→ 抓 grab（抓住的一拍）→ 摔 slam（砸落峰值）／空 whiff（扑空）。
 * 范围：lunge 的扑抓线沿 `data.path` 两顶点铺开，画的就是扑抓距离；slam 的冲击环绑住落点，画的就是砸中的位置。
 * 运动：速度线沿 `data.direction` 掠过；抓取环在目标身上收合；砸落后土石沿背离落点的方向退去。
 * 数：`data.hits`（摔击威力派生）决定砸落迸发的碎屑数，`data.dust`（体重与物攻派生）决定扑抓线与落点的扬尘密度，
 * `data.seconds`（压制时长）决定倒地那圈余尘持续多久，`data.scale`（抓取半径 / 0.55）放大抓取环。
 */
const SubmissionDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "brace", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1], spread: 12,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x8A6B4A, alpha: [0.5, 0], gravity: 0.03, drag: 0.93, light: "world", maxParticles: 26
                },
                {
                    name: "reach", bind: "source", offset: [0, 0.7, 0], height: 0.5, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 6, shape: { kind: "line", length: 0.6, rotation: [90, 0, 0] },
                    direction: "shape", speed: [0.02, 0.07],
                    lifetime: [7, 12], size: [0.1, 0.03],
                    color: 0xB07A50, alpha: [0.55, 0], light: "world", maxParticles: 16
                }
            ]
        },
        lunge: {
            duration: 34,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "track", bind: "path", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    shape: { kind: "polyline" },
                    rate: { data: "dust", fallback: 16 }, speed: [0.02, 0.09], spread: 20,
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8A6B4A, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 180
                },
                {
                    name: "burst", bind: "source", offset: [0, 0.35, 0], height: 0.35, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "box", size: [0.3, 0.22, 0.3] },
                    direction: "shape", speed: [0.02, 0.09], trail: { minDistance: 0.26 },
                    lifetime: [5, 8], size: [0.15, 0.04],
                    color: 0xD8C7A8, alpha: [0.65, 0], light: "full", maxParticles: 140
                }
            ]
        },
        grab: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    // 成功抓住的双体连线：两端就是施法者与目标。
                    name: "thread", bind: "path", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    shape: { kind: "polyline" },
                    rate: 14, speed: [0.01, 0.05],
                    lifetime: [6, 10], size: [0.08, 0.02],
                    color: 0xB07A50, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "clasp", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.08, 0.22], spin: 8,
                    lifetime: [8, 14], size: [0.34, 0.06],
                    color: 0xB07A50, alpha: [0.9, 0], light: "world", maxParticles: 30
                },
                {
                    name: "clinch", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.46 },
                    direction: "inward", speed: [0.08, 0.22],
                    lifetime: [10, 16], size: [0.3, 0.07],
                    color: 0xD8C7A8, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        slam: {
            duration: 34,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "crush", bind: "target", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "hits", fallback: 18 } },
                    shape: { kind: "hemisphere", radius: 0.5, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.08, 0.3], spread: 18,
                    lifetime: [8, 14], size: [0.38, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "debris", bind: "target", offset: [0, 0.25, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.48 },
                    direction: "outward", speed: [0.1, 0.3], spin: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [12, 22], size: [0.2, 0.05],
                    color: 0x8A6B4A, alpha: [0.8, 0], light: "world", maxParticles: 50
                },
                {
                    name: "tremor", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.66 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.46, 1.1], sizeMode: "sin",
                    color: 0xB07A50, alpha: [0.45, 0], light: "world"
                },
                {
                    name: "pindust", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, { data: "pin", fallback: 20 }], size: [0.07, 0.02],
                    color: 0xD8C7A8, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 44
                }
            ]
        },
        clash: {
            duration: 30,
            exit: { stop: 15, drain: 18 },
            emitters: [
                {
                    // 推不动的目标：只有接触处的角力压缩，没有抡出去的碎屑与地动。
                    name: "press", bind: "target", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "hits", fallback: 12 } },
                    shape: { kind: "hemisphere", radius: 0.5, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.06, 0.2], spread: 16,
                    lifetime: [8, 14], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "compress", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.44 },
                    direction: "inward", speed: [0.06, 0.18],
                    lifetime: [10, 16], size: [0.28, 0.06],
                    color: 0xB07A50, alpha: [0.6, 0], light: "world"
                },
                {
                    name: "grit", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "dust", fallback: 8 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [9, 15], size: [0.06, 0.02],
                    color: 0xD8C7A8, alpha: [0.45, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 24,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "empty", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 16 } },
                    shape: { kind: "ring", radius: 0.46 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8A6B4A, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 70
                }
            ]
        },
        wake: {
            duration: 8,
            emitters: [
                {
                    name: "scuff", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [6, 10], size: [0.06, 0.02],
                    color: 0xD8C7A8, alpha: [0.45, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_submission", 1, SubmissionDefinition);
