/**
 * 黑色目光 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：术者的双眼凹成两点更深的黑，一道拉扯般的黑色目光沿直线咬住目标；目标脚下摊开一圈漆黑的印记，
 *   几道黑光在术者与目标之间绷紧、微微颤动，直到目光绷断或松开。
 *
 * 色相家族：深黑紫（0x2A2140／0x4A3A78）为主，冷白（0xD8D2E8）只点在两只眼睛的小面积高光上。没有第二个色相。
 * 层次：起势（起手，眼窝聚黑）→ 锁定（一道黑光咬住＋目标脚下黑印＋眼点高光）→ 持守（视线绷紧颤动、黑印脉动）
 *   → 绷断（黑光碎开）／松开（慢慢淡去）／被挡（散点）。层数 3–5 层，各层贴图与运动性格拉开。
 * 范围：目标脚下的 `gaze_mark` 圆环半径按 `data.scale = 目光压强 / 参考 9.0` 缩放，玩家一眼看出目光锁在哪片地面。
 * 运动：黑光沿 `data.path`（术者→目标）绷成一条微微抖动的大弧；绷断时沿同一条线碎开。
 * 数：`data.strands`（特攻换算的目光道数）绑定 `lash` 的每拍发射量，`data.intensity` 再整体缩放。
 * 参照节：视觉语言第一、二、三、四、五、六、七、九节。
 */
const MeanlookDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "eye_gather", bind: "source", height: 0.82, offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 14, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [9, 16], size: [0.14, 0.03],
                    color: 0x2A2140, alpha: [0.55, 0], light: "world", maxParticles: 34
                },
                {
                    name: "eye_glint", bind: "source", height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [7, 12], size: [0.06, 0.01],
                    color: 0xD8D2E8, alpha: [0.6, 0], light: "full", maxParticles: 12
                }
            ]
        },
        lock: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "gaze_beam", bind: "path", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    rate: 60, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [7, 13], size: [0.2, 0.03],
                    color: 0x2A2140, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 130
                },
                {
                    name: "lash", bind: "path", offset: [0, 0.82, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "strands", fallback: 4 }, repeats: 8, interval: 3 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.02, 0.09],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xD8D2E8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "mark", bind: "target", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.4, 0.08], sizeMode: "index",
                    color: 0x4A3A78, alpha: [0.8, 0], light: "world", maxParticles: 30
                },
                {
                    name: "bite", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 24 }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.26, 0.06], sizeMode: "index",
                    color: 0x2A2140, alpha: [0.7, 0], light: "world", maxParticles: 44
                }
            ]
        },
        hold: {
            duration: 0,
            exit: { stop: 0, drain: 24 },
            emitters: [
                {
                    name: "hold_beam", bind: "path", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 26, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.005, 0.03],
                    lifetime: [8, 15], size: [0.16, 0.04],
                    color: 0x2A2140, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 70
                },
                {
                    name: "hold_shiver", bind: "path", offset: [0, 0.84, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.06, 0.01], sizeMode: "sin",
                    color: 0xD8D2E8, alpha: [0.5, 0], alphaMode: "sin", light: "full", maxParticles: 30
                },
                {
                    name: "hold_mark", bind: "target", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [24, 40], size: [0.34, 0.1], sizeMode: "sin",
                    color: 0x4A3A78, alpha: [0.35, 0.05], alphaMode: "sin", light: "world", maxParticles: 14
                }
            ]
        },
        snap: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "snap_burst", bind: "path", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "strands", fallback: 4 }, repeats: 4, interval: 1 },
                    shape: { kind: "polyline" }, direction: "outward", speed: [0.08, 0.26], spread: 30,
                    lifetime: [8, 15], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x4A3A78, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "snap_puff", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [14, 24], size: [0.3, 0.07],
                    color: 0x2A2140, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        release: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "release_fade", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [16, 26], size: [0.16, 0.03],
                    color: 0x2A2140, alpha: [0.45, 0], light: "world", maxParticles: 28
                }
            ]
        },
        blocked: {
            duration: 18,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "blocked_scatter", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.09], drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0x2A2140, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        fizzle: {
            duration: 14,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "fizzle_wisp", bind: "point", offset: [0, 0.8, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x2A2140, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_meanlook", 1, MeanlookDefinition);
