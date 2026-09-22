/**
 * 缝影 / spiritshackle 的客户端表现。
 *
 * 一句话：一支暗影箭射中目标，它脚下的影子被几道紫黑缝线扣在地面一点上；影子还在挣扎，缝线一绷就断。
 * 色相家族：紫黑与暗影（impact_dark／smoke 偏色）＋一处低饱和紫的高光（impact_ghost／glowingsparkle）。
 * 拍子：起（windup 抽影）→ 射（shot 黑箭拖尾）→ 缝（seam 影池与缝线持续）→ 松（snap 绷断 / release 松开）。
 * 范围：seam 的影池 `circle` 发射器半径（作者值 0.9 格）按 `data.scale = 实际影池半径 / 0.9` 缩放，覆盖目标脚下的锚点。
 * 运动：黑箭沿直线飞行并拖一条暗烟；缝线从地面锚点连到目标，随目标每帧移动而被拉长。
 * 数：`data.threads`（物攻换算的缝线量）绑定缝线密度与地面缝点的数量，`data.intensity`（威力 / 76）放大命中与崩断。
 * 参照节：视觉语言第一、二、三、四、五、六、七、九节。
 */
const SpiritshackleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "draw_shadow", bind: "source", offset: [0, 0.9, 0.15], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 16, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.16, 0.04],
                    color: 0x3A2E5A, alpha: [0.55, 0], light: "world", maxParticles: 42
                },
                {
                    name: "draw_spark", bind: "source", offset: [0, 0.95, 0.18], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "line", length: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0x8A6AD0, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 20
                }
            ]
        },
        shot: {
            duration: 0,
            exit: { stop: 0, drain: 16 },
            emitters: [
                {
                    name: "arrow_trail", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    trail: { minDistance: 0.24 },
                    rate: 30, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.01, 0.06], drag: 0.9,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0x2E2440, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        seam: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "shadow_pool", bind: "point", offset: [0, 0.04, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "circle", radius: 0.9 },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [22, 40], size: [0.32, 0.08], sizeMode: "sin",
                    color: 0x2A2140, alpha: [0.4, 0.12], alphaMode: "sin",
                    light: "world", maxParticles: 46
                },
                {
                    name: "tether", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    shape: { kind: "polyline" },
                    rate: { data: "threads", fallback: 10 }, direction: "shape", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.2, 0.04],
                    color: 0x4A3A78, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "stitch", bind: "path", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "polyline" },
                    rate: { data: "threads", fallback: 10 }, direction: "shape", speed: [0.01, 0.05],
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xA98AE0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "anchor_pulse", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 4, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [26, 44], size: [0.4, 0.1], sizeMode: "sin",
                    color: 0x6A4A9A, alpha: [0.35, 0.05], alphaMode: "sin",
                    light: "world", maxParticles: 14
                }
            ]
        },
        snap: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "snap_burst", bind: "point", offset: [0, 0.3, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "threads", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.28], spread: 26,
                    lifetime: [7, 14], size: [0.26, 0.05], sizeMode: "index",
                    color: 0x8A6AD0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "snap_smoke", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.02, drag: 0.9,
                    lifetime: [14, 24], size: [0.3, 0.08],
                    color: 0x2A2140, alpha: [0.35, 0], light: "world", maxParticles: 26
                }
            ]
        },
        release: {
            duration: 20,
            exit: { stop: 9, drain: 13 },
            emitters: [
                {
                    name: "fade_pool", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "circle", radius: 0.9 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.34, 0.06],
                    color: 0x2A2140, alpha: [0.4, 0], light: "world", maxParticles: 34
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "void_puff", bind: "point", offset: [0, 0.3, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.22, 0.05], sizeMode: "index",
                    color: 0x6A5A9A, alpha: [0.7, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spiritshackle", 1, SpiritshackleDefinition);
