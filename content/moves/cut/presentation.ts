/**
 * 居合斩 / cut 的客户端表现。
 *
 * 一句话：镰刃贴地抬起后，一趟暖白的弧风贴着地面扫出，弧里亮起一片刃光，命中的敌人身上溅出细屑，
 * 顺手割掉的草叶从地面翻起散开。
 * 色相家族：暖白刃光（swipe／cut／impact_normal）＋草绿（smallleaf／leaf）＋中性尘（tinydust）。原色为主，
 * 只给草叶一点偏绿。
 * 拍子：起（windup 聚刃）→ 斩（sweep 弧面扫过、strike 命中崩屑）→ 收（shear 草叶翻起）。
 * 范围：sweep 用 `data.path`（与服务端 WorldGeometry.sector 同一片扇形）铺成多边形，弧面盖到哪就是打到哪；
 *   弧的半径与张角直接读机制的 sweep／arc。
 * 运动：弧风的粒子沿扇形由刃根向外推、带一点切向散开；命中火花在命中点向外爆；草叶从地面翻起带重力落回。
 * 数：`data.notes`（物攻换算的崩屑量）绑定弧面与命中火花的量，`data.hits` 让命中被强调，割草每次一格发一条
 *   `shear` 载荷、每格 `data.blades` 片叶子。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const CutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "edge_gather", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.5, thickness: 0.7 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xEFE2C6, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 26
                }
            ]
        },
        sweep: {
            duration: 22,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "arc_fill", bind: "path", offset: [0, 0.18, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" },
                    rate: { data: "notes", fallback: 18 }, direction: "shape", speed: [0.02, 0.1],
                    lifetime: [7, 14], size: [0.3, 0.06],
                    color: 0xF0E4CC, alpha: [0.28, 0], light: "full", maxParticles: 120
                },
                {
                    name: "arc_edge", bind: "path", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: 30, direction: "shape", speed: [0.05, 0.16], spread: 10,
                    lifetime: [5, 10], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xFBF2DC, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 110
                },
                {
                    name: "arc_dust", bind: "path", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: 22, direction: "shape", speed: [0.03, 0.12], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.05, 0.02],
                    color: 0xB9AE92, alpha: [0.32, 0], light: "world", maxParticles: 60
                }
            ]
        },
        strike: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "hit_burst", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "notes", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.2], spread: 22,
                    lifetime: [7, 14], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF2E6CC, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 56
                },
                {
                    name: "hit_dust", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x9A8E74, alpha: [0.4, 0], light: "world", maxParticles: 36
                }
            ]
        },
        shear: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "leaf_lift", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "blades", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.05, 0.18], spin: 12,
                    gravity: 0.06, drag: 0.94,
                    lifetime: [14, 24], size: [0.12, 0.03], sizeMode: "index", roll: 180,
                    color: 0x93C05A, alpha: [0.95, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x9A927E, alpha: [0.32, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_cut", 1, CutDefinition);
