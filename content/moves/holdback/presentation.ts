/**
 * 手下留情 / holdback 的客户端表现。
 *
 * 一句话：沉身把一记重扫抡到最大，再收着力道从一排人身上擦过去——扇面扫到哪，谁只被削血而不倒。
 * 色相家族：暖白与浅木色（softswipe／slash）＋中性尘（tinydust）。
 * 拍子：起（windup 抡力）→ 扫（sweep 扇形铺开、strike 轻轻擦过）→ 留手（spare 每个目标的短收刃星）→ 空扫（miss）。
 * 范围：sweep 用 `data.path`（与服务端 WorldGeometry.sector 同一组扇形顶点）填出扇面；服务端已按同一个**总张角**
 *   生成顶点，扇面画到哪、判定就扫到哪，不再有画面被放宽或收窄的错觉。
 * 运动：扇面粒子从扇心向弧边扫出，擦过目标处只散开一小圈暖白，不炸杀伤爆裂。
 * 数：`data.dust`（物攻换算的扬尘量）绑定扇面密度与擦过扬尘，`data.hits`（实际扫中数）绑定弧边亮点，
 *   `data.intensity`（威力 / 50）放大整幕，`data.scale` 让沉腰式比快扫更大。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const HoldbackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 9,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.85, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xB9A98A, alpha: [0.5, 0], light: "world", maxParticles: 36
                },
                {
                    name: "heft", bind: "source", offset: [0, 0.9, 0.1], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "line", length: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xF0E6D2, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        sweep: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fan_fill", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polygon" }, rate: { data: "dust", fallback: 16 }, direction: "shape", speed: [0.03, 0.12],
                    lifetime: [7, 14], size: [0.3, 0.06],
                    color: 0xF2E8D6, alpha: [0.28, 0], light: "full", maxParticles: 140
                },
                {
                    name: "fan_arc", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: 30, direction: "shape", speed: [0.05, 0.16], spread: 8,
                    lifetime: [5, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "fan_dust", bind: "path", offset: [0, 0.16, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" }, rate: 18, direction: "shape", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.92, lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x9A8A6A, alpha: [0.35, 0], light: "world", maxParticles: 90
                }
            ]
        },
        strike: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "touch_brush", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: { data: "dust", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12], spread: 14,
                    lifetime: [6, 12], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xF6EFE0, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "touch_dust", bind: "target", offset: [0, 0.25, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.13], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0x9A8A6A, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        },
        spare: {
            duration: 22,
            exit: { stop: 9, drain: 13 },
            emitters: [
                {
                    name: "hold_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "sparks", fallback: 2 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.4, 0.1],
                    color: 0xFFF6E4, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 16
                },
                {
                    name: "hold_ring", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.3, 0.05],
                    color: 0xE6D9BE, alpha: [0.45, 0], light: "world", maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 14,
            exit: { stop: 4, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.3, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0xA6A8AC, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_holdback", 1, HoldbackDefinition);
