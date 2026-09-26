/**
 * 下盘踢 / lowsweep 的客户端表现。
 *
 * 一句话：脚边一沉、压低重心拧腰，随即一道贴地的低弧扫过脚踝——弧面本身的尘光就是被打到的范围，撞中小腿的地方
 * 爆开钝击与脚影，被削到的人腿边尘土一沉。
 * 色相家族：暖土黄（0xE0B060）与米白速度线为主，撞击处暖橙，无饱和色。
 * 拍子：起 pivot（压腿收尘）→ 扫 sweep（低弧成形并划过）→ 击 hit（命中钝击）→ 空 miss（扫空）。
 * 范围：sweep 的多边形面用 `data.path`（与判定同一组顶点）填满，弧线就是被打到的区域。
 * 运动：弧面沿地面低平掠过，速度线沿弧线切线方向扫出；命中是短促外爆加一只下压的脚影。
 * 数：弧面密度与命中尘量绑定 `data.spark`（速度与物攻换算），命中强度绑定 `data.intensity`（本击威力 / 55）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const LowsweepDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        pivot: {
            duration: 8,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "plant", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0x9C8250, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "coil", bind: "source", offset: [0, 0.26, 0], height: 0.26,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 11], size: [0.05, 0.01],
                    color: 0xE0B060, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        sweep: {
            duration: 24,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "crescent", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "spark", fallback: 14 } },
                    shape: { kind: "polygon" },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [7, 13], size: [0.07, 0.01], sizeMode: "index",
                    color: 0xE0B060, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "edge", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 34, shape: { kind: "polyline" },
                    direction: "away", speed: [0.03, 0.12],
                    lifetime: [4, 8], size: [0.18, 0.03],
                    color: 0xF2EAD2, alpha: [0.55, 0], light: "full", maxParticles: 120
                },
                {
                    name: "scuff", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "spark", fallback: 10 } },
                    shape: { kind: "circle", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x9C8250, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "blunt", bind: "point", height: 0.28,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.26],
                    lifetime: [5, 10], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFE0B8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 46
                },
                {
                    name: "foot", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/foot",
                    burst: { count: { data: "spark", fallback: 8 }, at: 1 },
                    shape: { kind: "arc", radius: 0.4, arcDegrees: 150, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 15], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xE8C08A, alpha: [0.85, 0], light: "world", maxParticles: 36
                },
                {
                    name: "grit", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xBFA377, alpha: [0.55, 0], light: "world", maxParticles: 80
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "spark", fallback: 14 } },
                    shape: { kind: "ring", radius: 0.38, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xBFA377, alpha: [0.45, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lowsweep", 1, LowsweepDefinition);
