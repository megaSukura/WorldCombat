/**
 * 单纯光束 / simplebeam 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者面前聚起一束旋转的念头光，光束沿视线一路打到对象头上，命中处炸开两道环表示「后续变化 ×2」，
 *   之后身上一直悬着一圈单纯光环；只有真正有一次能力等级被放大落地时才闪一下。扩散档在目标处再荡开一圈扫到附近的人。
 *
 * 色相家族：念波紫（0xB774E8 主体／0x8A5CFF 暗部）与近白（0xF4E6FF 光束核心）撑起全部层次。
 * 层次：聚（起手，念头内收）→ 发（光束沿视线、光环推进）→ 落（双环＋闪点）→ 环（贴身标记）→ 闪（实际等级变化）
 *   → 扩散／清／空。
 * 起击收：charge（聚）→ beam（发）→ settle（落，内环）→ spread（落，外环反向）→ aura（环，绑定托管效果）
 *   → surge（实际变化闪光）→ scatter／clear。
 * 范围：beam 的光束长度直接绑 `data.length`（施法者到目标的实际距离），方向绑 `data.direction`；
 *   settle 的炸环半径绑 `data.beam`，spread 的扫描圈半径绑 `data.fan`（实际扩散半径）。
 * 运动：光束沿视线一条直线亮起，命中处双环一正一反炸开后收拢，光环周期轻转，散去时念波缓缓飘散。
 * 数：光环数读 `data.rings`（特攻派生）、实际变化强度读 `data.amount`、扩散摊薄由 `data.shared` 读出扫到几人，
 *   尺寸随 `data.scale`。
 */
const SimplebeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "spiral", bind: "source", offset: [0, 0.2, 0.3], height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 16, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [8, 16], size: [0.18, 0.04], sizeMode: "sin",
                    color: 0xB774E8, alpha: [0.8, 0], light: "full", maxParticles: 34
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.25, 0.3], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xF4E6FF, alpha: [0.9, 0], light: "full", maxParticles: 22
                }
            ]
        },
        beam: {
            duration: 34,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "ray", bind: "point", offset: [0, 0.85, 0], fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    rate: { data: "rings", fallback: 8 },
                    shape: { kind: "line", length: { data: "length", fallback: 9 } },
                    direction: "shape", speed: [0.0, 0.06], spread: 6,
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0xB774E8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "rings", bind: "path", offset: [0, 0.85, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    shape: { kind: "polyline" },
                    rate: { data: "rings", fallback: 8 }, direction: "shape", speed: [0.05, 0.16], spread: 10,
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0x8A5CFF, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "sparks", bind: "path", offset: [0, 0.85, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: { data: "rings", fallback: 8 }, direction: "shape", speed: [0.02, 0.1], spread: 24,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0xF4E6FF, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        settle: {
            duration: 30,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "ring_inner", bind: "point", offset: [0, 0.75, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "beam", fallback: 0.9 } },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 18], size: [0.26, 0.7], sizeMode: "index",
                    color: 0xB774E8, alpha: [0.75, 0], light: "full", maxParticles: 8
                },
                {
                    name: "ring_outer", bind: "point", offset: [0, 0.78, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1, at: 4 },
                    shape: { kind: "ring", radius: { data: "beam", fallback: 0.9 } },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [12, 20], size: [0.3, 0.8], sizeMode: "index",
                    color: 0xF4E6FF, alpha: [0.7, 0], light: "full", maxParticles: 8
                },
                {
                    name: "impact", bind: "point", offset: [0, 0.8, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: { data: "beam", fallback: 0.9 } },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: [8, 14], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xF4E6FF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 10
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "rings", fallback: 8 } },
                    shape: { kind: "sphere", radius: { data: "beam", fallback: 0.9 } },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xF4E6FF, alpha: [0.9, 0], light: "full", maxParticles: 70
                }
            ]
        },
        spread: {
            duration: 24,
            exit: { stop: 11, drain: 14 },
            emitters: [
                {
                    name: "wash", bind: "point", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "fan", fallback: 0.34 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.2, 0.5], sizeMode: "index",
                    color: 0x8A5CFF, alpha: [0.65, 0], light: "full", maxParticles: 8
                },
                {
                    name: "glints", bind: "point", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xE8D0FF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        aura: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "crown_inner", bind: "target", offset: [0, 0.7, 0], fit: "body", orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 1, shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "shape", speed: [0.02, 0.06], spin: 8,
                    lifetime: [16, 24], size: [0.12, 0.26], sizeMode: "index",
                    color: 0xB774E8, alpha: [0.5, 0], light: "full", maxParticles: 12
                },
                {
                    name: "crown_outer", bind: "target", offset: [0, 0.7, 0], fit: "body", orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 1, shape: { kind: "ring", radius: 0.56, rotation: [-90, 0, 0] },
                    direction: "shape", speed: [0.02, 0.06], spin: -8,
                    lifetime: [16, 24], size: [0.1, 0.22], sizeMode: "index",
                    color: 0xF4E6FF, alpha: [0.45, 0], light: "full", maxParticles: 12
                },
                {
                    name: "mote", bind: "target", offset: [0, 0.8, 0], fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "rings", fallback: 5 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.04], gravity: -0.002,
                    lifetime: [14, 22], size: [0.07, 0.01], alphaMode: "sin",
                    color: 0xF4E6FF, alpha: [0.4, 0], light: "full", maxParticles: 20
                }
            ]
        },
        surge: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "surge_ring", bind: "target", offset: [0, 0.75, 0], fit: "body", orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.9 } },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [8, 14], size: [0.2, 0.6], sizeMode: "index",
                    color: 0xF4E6FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "surge_spark", bind: "target", offset: [0, 0.75, 0], fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "amount", fallback: 2 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [8, 16], size: [0.09, 0.01],
                    color: 0xF4E6FF, alpha: [1, 0], light: "full", maxParticles: 24
                }
            ]
        },
        scatter: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "loose", bind: "path", offset: [0, 0.85, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    shape: { kind: "polyline" },
                    rate: { data: "rings", fallback: 6 }, direction: "shape", speed: [0.02, 0.1], spread: 26,
                    lifetime: [8, 15], size: [0.12, 0.03], alphaMode: "linear",
                    color: 0xB79CD8, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fade_glint", bind: "path", offset: [0, 0.85, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: 8, direction: "shape", speed: [0.01, 0.05], spread: 30,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0xE8D0FF, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        clear: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "drift", bind: "point", offset: [0, 0.9, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 8 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "away", speed: [0.02, 0.07],
                    lifetime: [14, 22], size: [0.12, 0.02],
                    color: 0xB774E8, alpha: [0.55, 0], light: "full", maxParticles: 22
                },
                {
                    name: "fade", bind: "point", offset: [0, 0.9, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF4E6FF, alpha: [0.6, 0], light: "full", maxParticles: 22
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dust", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xB79CD8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_simplebeam", 1, SimplebeamDefinition);
