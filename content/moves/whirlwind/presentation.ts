/**
 * 吹飞 / whirlwind 的客户端表现。
 *
 * 一句话：施法者身前聚起打着旋的气流，随即一道淡青白的风墙贴着地面向前推出去，卷着风尘与草屑一路扫到风道尽头；
 *   被扫到的敌人被托起、挂着风尘沿风向滑出。
 * 色相家族：淡青白（0xCFE8EC 主体、0xA9CBD4 余韵）＋近白（0xF2FCFF）只做风锋高光；没有第二个色相。
 * 拍子：起（windup 聚风）→ 出（launch 风锋离身）→ 推（gust 风墙每刻向前，位置持续更新）→ 结果（rout 逐目标）→ 持续（flee 被吹者身上的余风）→ 空（miss 落空）。
 * 范围：gust 的圆盘半径＝风道半宽（`data.scale`＝实际半宽 / 1.7，圆盘定义在 1.7 格上），圆盘扫过的那条带子就是判定覆盖；
 *   站到这条带子外面，画面里就碰不到你。
 * 运动：风墙沿 `data.direction` 每刻向前推进一格左右；风尘从圆盘向外、向上翻卷，被吹者沿风向滑走。
 * 数：风尘数量由 `data.motes`（速度派生）驱动；命中人数由 `data.hits` 只体现在结束一拍。
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
        launch: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "front_flash", bind: "point", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12 }, shape: { kind: "circle", radius: 1.2, thickness: 0 },
                    direction: "outward", speed: [0.1, 0.4], spread: 20,
                    lifetime: [6, 12], size: [0.1, 0.01],
                    color: 0xF2FCFF, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        gust: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "wall", bind: "point", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "circle", radius: 1.7, thickness: 0 },
                    direction: "outward", speed: [0.12, 0.5], spread: 24, spin: 18,
                    lifetime: [8, 16], size: [0.32, 0.08],
                    color: 0xCFE8EC, alpha: [0.6, 0], light: "full", maxParticles: 420
                },
                {
                    name: "grit", bind: "point", fit: "none", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "circle", radius: 1.5, thickness: 0 },
                    direction: "outward", speed: [0.18, 0.55], spread: 16, gravity: 0.015,
                    lifetime: [6, 13], size: [0.08, 0.02],
                    color: 0xA9CBD4, alpha: [0.5, 0], light: "world", maxParticles: 380
                },
                {
                    name: "screen", bind: "point", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: 6, interval: 3 }, shape: { kind: "circle", radius: 1.7, thickness: 0.7 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.4, 0.14],
                    color: 0xE4F4F6, alpha: [0.35, 0], light: "full", maxParticles: 40
                }
            ]
        },
        rout: {
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
        flee: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "tail", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.01,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xA9CBD4, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 24
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
