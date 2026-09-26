/**
 * 疯狂植物 / frenzyplant 的客户端表现。
 *
 * 一句话：施法者把生长灌进选定的那片地，地面先裂开一圈土纹，随后巨木根须自落点竖着窜起、朝人群抽下；
 * 被缠住的目标脚下留着按地的根，根须褪去后那片地短暂覆上苔藓与生根土。
 * 色相家族：草绿与苔绿（sprout／leaf／impact_grass 原色、razorleaf 亮帧）＋土褐（earth／tinydust）作尘。
 * 拍子：起（windup 土纹）→ 窜（erupt 根须竖上升起）→ 击（slam 抽打、snare 缠足）→ 收（leaves 留痕、spent 起、recharge 维持力竭）。
 * 范围：erupt／slam／leaves 绑落点、fit none，环半径按 `data.scale`（实际爆发半径 / 2.4）铺开——画出的那块地就是判定覆盖的范围。
 * 运动：根须自地面竖直窜起、顶端向外抽下；被缠住的目标脚边根须收紧；留痕层贴地缓慢起伏。
 * 数：`data.count`（根须威力换算）决定 erupt 的根须数量，`data.notes`（本击威力）决定 slam 的碎屑量，
 * `data.rise`（窜起高度）决定根须竖多高，`data.seconds`（力竭秒数）决定余烬维持密度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FrenzyplantDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        root_hint:{emitters:[{name:"root_entry",bind:"point",fit:"world",particle:"world_combat_core:cobblemon/generic/tinydust",rate:12,
            shape:{kind:"circle",radius:.3,thickness:.9},direction:"up",speed:[.005,.02],lifetime:[4,8],size:[.07,.02],color:0x806244,alpha:[.45,0]}]},
        arm: { emitters: [{ name: "actual_path", bind: "path", fit: "world", particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
            rate: 32, shape: { kind: "polyline" }, speed: [0,.006], lifetime: [4,8], size: [.22,.12], color: 0x628743, alpha: [.7,.15], light: "world", maxParticles: 42 }] },
        windup: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "crack_ring", bind: "point", fit: "none", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 26, shape: { kind: "ring", radius: 2.4 },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0x6E5A3C, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "seed_hint", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 12, shape: { kind: "ring", radius: 2.4 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x9FCB5A, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        erupt: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "roots_up", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "count", fallback: 90 }, at: 0 },
                    shape: { kind: "circle", radius: 2.4, thickness: 1 },
                    direction: "up", speed: [0.14, 0.34],
                    lifetime: [8, 16], size: [0.34, 0.08], sizeMode: "index",
                    color: 0x8FC24E, alpha: [0.9, 0], light: "full", maxParticles: 300
                },
                {
                    name: "trunk_line", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: 60, shape: { kind: "line", length: { data: "rise", fallback: 4 } },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [6, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xBCE07A, alpha: [0.75, 0], light: "full", maxParticles: 240
                },
                {
                    name: "soil_burst", bind: "point", fit: "none", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 40, shape: { kind: "ring", radius: 2.4 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x6E5A3C, alpha: [0.55, 0], light: "world", maxParticles: 200
                }
            ]
        },
        slam: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "slam_core", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [7, 13], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xA8D060, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "slam_leaf", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "notes", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0x7FB04A, alpha: [0.8, 0], light: "world", maxParticles: 120
                }
            ]
        },
        snare: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "root_grip", bind: "target", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 16, at: 0, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.16, 0.04],
                    color: 0x6FA23E, alpha: [0.7, 0], light: "world", maxParticles: 70
                }
            ]
        },
        leaves: {
            duration: 44,
            exit: { stop: 20, drain: 24 },
            emitters: [
                {
                    name: "moss_glow", bind: "point", fit: "none", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "circle", radius: 2.4, thickness: 0.8 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [14, 24], size: [0.06, 0.02],
                    color: 0x6FA23E, alpha: [0.3, 0], light: "world", maxParticles: 60
                },
                {
                    name: "root_scar", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "circle", radius: 2.4, thickness: 0.6 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [16, 26], size: [0.05, 0.02],
                    color: 0x5A4A32, alpha: [0.28, 0], light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "empty_ring", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x8A7A5A, alpha: [0.35, 0], light: "world", maxParticles: 50
                }
            ]
        },
        spent: {
            duration: 32,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "fall_leaves", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "count", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0x7FB04A, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "settle_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.03, 0.11],
                    lifetime: [10, 16], size: [0.28, 0.09],
                    color: 0x9ABC6A, alpha: [0.4, 0], light: "world"
                }
            ]
        },
        recharge: {
            duration: 60,
            exit: { stop: 40, drain: 20 },
            emitters: [
                {
                    name: "root_haze", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 4, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 26], size: [0.05, 0.02],
                    color: 0x6FA23E, alpha: [0.28, 0], light: "world", maxParticles: 20
                },
                {
                    name: "strain_dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [14, 22], size: [0.05, 0.02],
                    color: 0x8A7A5A, alpha: [0.26, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_frenzyplant", 1, FrenzyplantDefinition);
