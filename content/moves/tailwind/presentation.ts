/**
 * 顺风 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者脚边的空气先收成一个气旋，再猛地向四周铺开成一片风场，扫过的同伴各拖出一条条风线；
 *   风场以施法者为锚一路转着，风停时整片一起散去。
 *
 * 色相家族：风青（0xBEE9F2）为主体，近白（0xEAF7FA）做高光，灰蓝（0x7FB6C4）做尘与余韵；没有第二个色相。
 * 层次：聚风（起）／气旋爆发与地环（击）／受风者身上的风线（收）／以施法者为锚的持续风场（持续）／散。
 * 起击收：gather（起）→ burst（击）→ catch（接力）→ ride（持续）／streaks（持续）→ fade（收）。
 * 范围：地环绑落点、fit none，半径按 `data.scale`（实际风场半径 / 6）推出，画出来的圈就是风真罩到的范围。
 * 运动：起手风点向内收；爆发时向外炸开、地环一圈推远；持续时大气旋绕施法者慢转，风线贴着受风者向后拖。
 * 数：风点量绑 `data.motes`（速度派生），风线数绑 `data.streaks`（速度派生），尺寸与范围绑 `data.scale`（体型与配置派生）。
 * 持续状态：持续层放在脚边与身周，低密度、慢节奏，玩家仍看得清目标。
 */
const TailwindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather_swirl", bind: "source", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 10, shape: { kind: "sphere", radius: 1.3 },
                    direction: "inward", speed: [0.03, 0.12], drag: 0.9, spin: 10,
                    lifetime: [10, 18], size: [0.3, 0.08],
                    color: 0xEAF7FA, alpha: [0.5, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "burst_gust", bind: "source", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: { data: "motes", fallback: 28 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.06, 0.24], drag: 0.9, spin: 20,
                    lifetime: [10, 20], size: [0.28, 0.06],
                    color: 0xEAF7FA, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 220
                },
                {
                    name: "burst_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: 6 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [14, 22], size: [0.36, 0.14],
                    color: 0xBEE9F2, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "burst_dust", bind: "point", fit: "none", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 6 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [14, 24], size: [0.07, 0.01],
                    color: 0x7FB6C4, alpha: [0.4, 0], light: "world", maxParticles: 48
                }
            ]
        },
        catch: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "catch_streak", bind: "target", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "streaks", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.9, spin: 24,
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0xEAF7FA, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        ride: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "ride_swirl", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 5, shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [16, 28], size: [0.26, 0.08],
                    color: 0xBEE9F2, alpha: [0.28, 0], alphaMode: "sin", light: "full", maxParticles: 26
                },
                {
                    name: "ride_mote", bind: "target", fit: "body", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xEAF7FA, alpha: [0.22, 0], light: "full", maxParticles: 14
                }
            ]
        },
        streaks: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "streak_lines", bind: "target", fit: "body", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 3, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.02, 0.09], drag: 0.94, spin: 20,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x9FD8E8, alpha: [0.3, 0], light: "world", maxParticles: 18
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "fade_gust", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.93,
                    lifetime: [16, 28], size: [0.3, 0.08],
                    color: 0x7FB6C4, alpha: [0.35, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fade_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 6 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.94,
                    lifetime: [16, 26], size: [0.24, 0.06],
                    color: 0x7FB6C4, alpha: [0.3, 0], light: "world", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tailwind", 1, TailwindDefinition);
