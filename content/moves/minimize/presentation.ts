/**
 * 变小 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者蜷成一团，冷蓝的尘与光被吸进身体、地环一圈圈收拢，身体显得很小；
 *   缩着时只留几点贴身的微光；被打空时一道白线闪过，被大体型踩中时地面炸起一圈沉尘，回形时冷光重新铺开。
 *
 * 色相家族：冷蓝灰（0x9FB8D8）为主体，近白（0xE8F2FF）做缩身与闪避的线，深蓝灰（0x5A6E8C）做尘与余韵；没有第二个色相。
 * 层次：收身（起）／吸拢的光、收缩的地环与尘（击）／贴身的微光（收）／回形与踩踏（末／事件）。
 * 起击收：curl（蜷缩）→ tiny（缩小）→ hold（维持）→ dodge／trample（事件）→ fade（回形）。
 * 范围：地环绑脚点、fit none，半径按 `data.scale`（实际收缩尺度 / 0.6）收拢，画出来的圈就是身体缩到的范围。
 * 运动：光与尘由外向内被吸进身体；地环向内收；维持时微光极慢上浮；闪避是一道向外掠过的白线，踩踏是向下的沉尘。
 * 数：尘量绑 `data.motes`（速度派生），收缩拍数绑 `data.pulses`（等级派生），尺寸与范围绑 `data.scale`（体型派生）。
 * 持续状态：维持期低密度、贴身，玩家仍看得清目标。
 */
const MinimizeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        curl: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "curl_mote", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 1.1 },
                    direction: "inward", speed: [0.06, 0.18], drag: 0.9, spin: 16,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xE8F2FF, alpha: [0.55, 0], light: "full", bloom: 0.3, maxParticles: 44
                },
                {
                    name: "curl_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2, interval: 4 }, shape: { kind: "ring", radius: 1.0 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.4, 0.7], sizeMode: "index",
                    color: 0x9FB8D8, alpha: [0.5, 0], light: "world", maxParticles: 12
                }
            ]
        },
        tiny: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "tiny_orb", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/orbshrink_white",
                    burst: { count: { data: "motes", fallback: 16 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.2 },
                    direction: "inward", speed: [0.06, 0.2], drag: 0.88, spin: 12,
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0xE8F2FF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 160
                },
                {
                    name: "tiny_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "pulses", fallback: 2 }, interval: 5 },
                    shape: { kind: "ring", radius: 1.1 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [14, 22], size: [0.5, 0.85], sizeMode: "index",
                    color: 0x9FB8D8, alpha: [0.55, 0], light: "world", maxParticles: 24
                },
                {
                    name: "tiny_dust", bind: "source", fit: "none", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.09], drag: 0.9,
                    lifetime: [14, 22], size: [0.05, 0.01],
                    color: 0x5A6E8C, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hold: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "hold_glint", bind: "source", fit: "none", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.006, 0.018],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xE8F2FF, alpha: [0.26, 0], light: "world", maxParticles: 10
                }
            ]
        },
        dodge: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dodge_line", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.14, 0.34], drag: 0.85,
                    lifetime: [6, 12], size: [0.4, 0.15],
                    color: 0xE8F2FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 20
                },
                {
                    name: "dodge_puff", bind: "source", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [10, 16], size: [0.3, 0.55],
                    color: 0x9FB8D8, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        },
        trample: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "trample_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.02, drag: 0.88,
                    lifetime: [12, 22], size: [0.35, 0.7], sizeMode: "index",
                    color: 0x5A6E8C, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "fade_orb", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9, spin: 10,
                    lifetime: [12, 20], size: [0.08, 0.16],
                    color: 0x9FB8D8, alpha: [0.45, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_minimize", 1, MinimizeDefinition);
