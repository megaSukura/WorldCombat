/**
 * 扑击 / bodypress 的客户端表现。
 *
 * 一句话：压低重心、架住肩甲站定，脚下掀起一圈土；随后身板向前短踏，**一道宽肩横边**贴着身前真实扫过——
 * 扫到谁就在谁身上压出一记压缩土屑，最后站定扬尘。它不再画球状爆点，也不留持续顶推的碾痕。
 * 色相家族：格斗暖橙与土棕（impact_fighting / earth / tinydust）为主，灰烟只在压下时作薄雾，没有第二种色相。
 * 拍子：起（brace 架式）→ 压（press 逐刻当前肩面）→ 触（impact 每个触体各一记压缩）→ 收（settle 站定 / miss 压空）。
 * 范围：press 的 `data.path` 每刻只有当前肩面前后两端组成的四边面，与服务端 `WorldGeometry.bodyLane` 判定读同一组端点——
 *   肩面扫到哪就压到哪；impact 绑命中点，随被压目标一起移动。
 * 运动：press 的土屑沿当前肩面由内向外被推起、贴地铺开；impact 是向内收的钝压，不是向外炸的球。
 * 数：`data.hits`（本趟实际触体数）决定肩面亮度与触点密度，`data.clods`（顶推距离换算）决定压起与站定的土块数，
 *   `data.scale` 放大肩面范围，`data.intensity`（总威力 / 100）抬高密度与亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BodypressDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 12,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "plant", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 14], size: [0.06, 0.02],
                    color: 0xC7A97B, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "guard", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.18, 0.04], sizeMode: "sin",
                    color: 0xE9B071, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        // 逐刻当前肩面：一条横边（polyline）压过地面，下方土屑被肩面推起。
        press: {
            duration: 14,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "shoulder", bind: "path", offset: [0, 0.18, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "intensity", fallback: 1 },
                    direction: "shape", speed: [0.04, 0.14], spread: 8,
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE9B071, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "band", bind: "path", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: { data: "clods", fallback: 8 }, direction: "shape", speed: [0.03, 0.14],
                    gravity: 0.05, drag: 0.93, lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xBFA377, alpha: [0.55, 0], light: "world", maxParticles: 120
                },
                {
                    name: "heave", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.28, 0.08],
                    color: 0xB99A66, alpha: [0.24, 0], light: "world", maxParticles: 40
                }
            ]
        },
        // 每个被压到的触体各一记：向内收的压缩土屑，没有球状爆点。
        impact: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "compress", bind: "target", offset: [0, 0.28, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "clods", fallback: 6 } }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.8, 0], light: "world", maxParticles: 40
                },
                {
                    name: "settle_grit", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "clods", fallback: 6 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    gravity: 0.05, drag: 0.94, lifetime: [8, 14], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        settle: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "stand_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "clods", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xC7A97B, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "push_nothing", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xBFA377, alpha: [0.45, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bodypress", 1, BodypressDefinition);
