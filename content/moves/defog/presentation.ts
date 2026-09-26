/**
 * 清除浓雾 / defog 的客户端表现。
 *
 * 一句话：施法者脚边气流打旋、粉尘贴地聚起，随即一圈灰白的风从脚下向外扫开——风圈扫到哪，那里的
 *   屏障就被抹掉、烟尘被卷走，被扫中的对手身上扬起被剥掉的守势碎屑。
 * 色相家族：灰白与淡青（0xDCE9EC 主体、0xAFC9D0 余韵）＋近白（0xF5FCFE）只做风锋高光；没有第二个色相。
 * 拍子：起（windup 聚风）→ 扫（burst 风圈铺到全半径）→ 散（haze 烟幕被吹散）→ 剥（strip 被扫中者身上）→ 净（clear 收势白环）。
 * 范围：burst／clear 的圆环半径＝`data.scale`×定义半径（scale＝实际清扫半径 ÷ 6），画出的那圈就是判定圈。
 * 运动：风流沿圆环向外推开、贴地翻卷；被扫中者身上的碎屑向外一散即收；门户线沿 `data.direction` 立在目标身上。
 * 数：风丝数量由 `data.motes`（体宽与速度派生）驱动；`data.peeled` 只在真有屏障被剥掉时落屑；
 *   `data.opened` 只在真实降级发生时点亮门户线；`data.cleared` 只在真有东西被清掉时扬起一撮。
 * 参照节：视觉语言第一、二、三、四、七、九节。
 */
const DefogDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 16, shape: { kind: "ring", radius: 0.7, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.12], spin: 16,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xDCE9EC, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.8, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.1], gravity: 0.01,
                    lifetime: [6, 13], size: [0.06, 0.01],
                    color: 0xAFC9D0, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "ring_out", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "motes", fallback: 20 },
                    shape: { kind: "ring", radius: 6, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.22, 0.6], spread: 16, spin: 18,
                    lifetime: [8, 16], size: [0.3, 0.06],
                    color: 0xDCE9EC, alpha: [0.65, 0], light: "full", maxParticles: 460
                },
                {
                    name: "ground_grit", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 20 },
                    shape: { kind: "circle", radius: 6, thickness: 0.9, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.28, 0.7], spread: 10, gravity: 0.014,
                    lifetime: [6, 14], size: [0.07, 0.02],
                    color: 0xAFC9D0, alpha: [0.5, 0], light: "world", maxParticles: 400
                },
                {
                    name: "screen_pull", bind: "point", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: 8, interval: 2 },
                    shape: { kind: "circle", radius: 6, thickness: 0.85, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.42, 0.14],
                    color: 0xF5FCFE, alpha: [0.35, 0], light: "full", maxParticles: 60
                }
            ]
        },
        haze: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "disperse", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.3], spread: 60, gravity: -0.01, drag: 0.9,
                    lifetime: [10, 20], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xAFC9D0, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        strip: {
            duration: 24,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "peel", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "peeled", fallback: 0 } }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xF5FCFE, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "shorn", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 10 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.02, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xAFC9D0, alpha: [0.5, 0], light: "world", maxParticles: 32
                },
                {
                    name: "portal", bind: "target", height: 0.55, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "opened", fallback: 0 } },
                    shape: { kind: "line", length: 0.9 },
                    direction: "shape", speed: [0.02, 0.1], spread: 6,
                    lifetime: [8, 16], size: [0.28, 0.06],
                    color: 0xF5FCFE, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        clear: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "settle_ring", bind: "point", fit: "none", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 6, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [9, 16], size: [0.2, 0.07],
                    color: 0xF5FCFE, alpha: [0.55, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "settle_motes", bind: "point", fit: "none", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "circle", radius: 6, thickness: 0.9, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.02,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0xAFC9D0, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "blown", bind: "point", fit: "none", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "cleared", fallback: 0 } },
                    shape: { kind: "circle", radius: 2.4, thickness: 0.9, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.12, 0.34], spread: 24,
                    lifetime: [8, 16], size: [0.24, 0.05],
                    color: 0xDCE9EC, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_defog", 1, DefogDefinition);
