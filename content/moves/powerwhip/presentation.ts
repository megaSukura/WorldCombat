/**
 * 强力鞭打 / powerwhip 的客户端表现。
 *
 * 一句话：青藤或触手先自脚边盘起、叶屑向臂弯收拢 → 甩出一道覆盖身前的青绿弧面，弧面填出的那块扇形就是被打到的范围 →
 * 命中处炸开草绿冲击、叶片四散，被扫中的人被推得飞出弧面。
 * 色相家族：草绿（0x6FA83C 主体、0x9BD05A 细节）与米白鞭梢为主；冲击层用草绿钝击色，无第二个色相。
 * 拍子：起 coil（盘藤收叶）→ 扫 sweep（弧面填出并划过）→ 击 hit（命中草绿钝击）→ 空 miss（扫空散叶）。
 * 范围：sweep 的 polygon 面用 `data.path`（与判定同一组顶点）填满，扇形就是被打到的区域；整圈时填出的是一个圆盘。
 * 运动：弧面自施法者向外抽出，鞭梢沿线外扫、叶屑沿离心方向飞出；命中是草绿钝击加一圈外散的叶。
 * 数：弧面密度与飞叶数绑 `data.leaves`（物攻与身高派生），命中强度绑 `data.intensity`（本击威力 / 120），
 *     弧面半径随 `data.reach` 变化——画面里的范围、数量与机制一致。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PowerWhipDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 16, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.11],
                    spin: 6, lifetime: [9, 15], size: [0.16, 0.03],
                    color: 0x6FA83C, alpha: [0.65, 0], light: "world", maxParticles: 60
                },
                {
                    name: "arm", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 12, shape: { kind: "arc", radius: 0.7, arcDegrees: 160, rotation: [0, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08],
                    spin: 10, lifetime: [7, 12], size: [0.1, 0.02],
                    color: 0x9BD05A, alpha: [0.5, 0], light: "full", maxParticles: 46
                }
            ]
        },
        sweep: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "fan", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "leaves", fallback: 22 } },
                    shape: { kind: "polygon" },
                    direction: "up", speed: [0.03, 0.13],
                    spin: 8, lifetime: [8, 15], size: [0.18, 0.03], sizeMode: "index",
                    color: 0x6FA83C, alpha: [0.6, 0], light: "world", maxParticles: 120
                },
                {
                    name: "sheen", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    rate: 30, shape: { kind: "polygon" },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xEAF6C8, alpha: [0.45, 0], light: "full", maxParticles: 90
                },
                {
                    name: "tip", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: 26, shape: { kind: "polyline" },
                    direction: "away", speed: [0.04, 0.16],
                    spin: 12, lifetime: [4, 9], size: [0.16, 0.03],
                    color: 0x9BD05A, alpha: [0.7, 0], light: "full", maxParticles: 100
                },
                {
                    name: "scuff", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 14 },
                    shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x7A6B44, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "blunt", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 13, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.09, 0.28],
                    lifetime: [5, 10], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xE6F7B0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "spray", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf_white",
                    burst: { count: { data: "leaves", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.07, 0.24],
                    spread: 40, spin: 14,
                    lifetime: [7, 14], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xCFE98A, alpha: [0.8, 0], light: "full", maxParticles: 80
                },
                {
                    name: "wake", bind: "target", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0x5C8F34, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "leaves", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.6, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [8, 15], size: [0.14, 0.03],
                    color: 0x6FA83C, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powerwhip", 1, PowerWhipDefinition);
