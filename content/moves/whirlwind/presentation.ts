/**
 * 吹飞 / whirlwind 的客户端表现。
 *
 * 一句话：施法者身前聚起打着旋的气流，随即一道竖立的淡青白风幕贴着地面向前推出去；风幕的推进端沿每条风线
 *   按墙起伏——被墙挡住的一段停在原地、向两侧散尘，开口处风丝继续向前；被扫到的敌人被托起、挂着风尘沿风向滑出。
 * 色相家族：淡青白（0xCFE8EC 主体、0xA9CBD4 余韵）＋近白（0xF2FCFF）只做风锋高光；没有第二个色相。
 * 拍子：起（windup 聚风）→ 推（gust 风幕每拍更新到实际风面）→ 结果（swept 逐目标）→ 空（miss 落空）。
 * 范围：gust 的风幕用 `data.path`（两条竖边连成的起伏带）以 polygon 填充，画出来的就是当拍风面；
 *   每条风线的推进端由服务端按真实方块给出，墙后自然缺一段。
 * 运动：风幕沿 `data.direction` 每拍向前推进；风尘从风幕向外、向上翻卷，被吹者沿风向滑走。
 * 数：风尘数量由 `data.motes`（速度派生）驱动；风幕半径随 `data.scale`（风道半径 / 1.7）伸缩。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const WhirlwindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "swirl", bind: "source", offset: [0, 0.35, 0.6], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], spin: 16,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0xCFE8EC, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.05, 0.4], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: 0.6, thickness: 0 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xA9CBD4, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        gust: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "curtain", bind: "path", fit: "none", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "polygon" },
                    direction: "shape", speed: [0.12, 0.5], spread: 24, spin: 18,
                    lifetime: [8, 16], size: [0.3, 0.08],
                    color: 0xCFE8EC, alpha: [0.6, 0], light: "full", maxParticles: 420
                },
                {
                    name: "edge", bind: "path", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.04, 0.16],
                    lifetime: [6, 13], size: [0.34, 0.1],
                    color: 0xF2FCFF, alpha: [0.5, 0], light: "full", maxParticles: 120
                },
                {
                    name: "ground", bind: "point", fit: "none", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "circle", radius: 1.7, thickness: 0 },
                    direction: "outward", speed: [0.18, 0.55], spread: 16, gravity: 0.015,
                    lifetime: [6, 13], size: [0.08, 0.02],
                    color: 0xA9CBD4, alpha: [0.5, 0], light: "world", maxParticles: 380
                }
            ]
        },
        swept: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "lift", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 6 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 28,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xCFE8EC, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "streak", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 5 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.2, 0.02],
                    color: 0xF2FCFF, alpha: [0.7, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "circle", radius: 0.8, thickness: 0 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.02,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8FA8AE, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_whirlwind", 1, WhirlwindDefinition);
