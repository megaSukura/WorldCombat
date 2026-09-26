/**
 * 百万吨重拳 / megapunch 的客户端表现。
 *
 * 一句话：拳头收在腰间攥亮，随后一整条厚拳轮廓沿实际拳路瞬间推出——拳路就是服务端判定用的那条三维窄管
 * （`data.path` 给出起点与实墙/满程终点），冲击环沿同一条带向前推远；被正中的目标身上炸开一记钝击、
 * 随即拖着尘屑沿同一条线被轰飞；撞到实墙就在墙面磕出尘屑。
 * 色相家族：暖白（0xFFF2DA）与沙金（0xC9B37A），中性尘灰作余韵；饱和色只出现在拳面核心的小面积。
 * 拍子：起 charge（收拳蓄势）→ 击 thrust（拳路推出）与 hit（命中钝击）→ 收 launch（被轰飞）、
 *   wall（砸墙）与 whiff（破风）。
 * 范围：thrust 的拳路用 `data.path`（与判定同一组顶点）沿窄管排布，不再是填满地面的地毯；玩家一眼看出站在这条带里会挨打。
 * 运动：拳粒与冲击环都沿 `data.direction` 从施法者朝目标方向推出。
 * 数：拳路粒子量绑 `data.flows`，冲击环数绑 `data.rings`（物攻换算），命中强度绑 `data.intensity`。
 */
const MegapunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.26, 0.06],
                    color: 0xFFF2DA, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 22
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xC9B37A, alpha: [0.5, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        thrust: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fist", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    shape: { kind: "polyline" }, burst: { count: { data: "flows", fallback: 90 } },
                    direction: "shape", orient: "direction", speed: [0.18, 0.42], spread: 8,
                    lifetime: [4, 8], size: [0.5, 0.09], sizeMode: "index",
                    color: 0xFFF2DA, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 160
                },
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: 24 },
                    direction: "shape", orient: "direction", speed: [0.14, 0.34], spread: 6,
                    lifetime: [4, 8], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xC9B37A, alpha: [0.7, 0], light: "world", maxParticles: 50
                },
                {
                    name: "rings", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    shape: { kind: "polyline" }, burst: { count: { data: "rings", fallback: 4 }, interval: 2 },
                    direction: "shape", orient: "direction", speed: [0.2, 0.46],
                    lifetime: [5, 10], size: [0.32, 0.08], sizeMode: "index",
                    color: 0xFFF2DA, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        wall: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dust", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spread: 30,
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xB9A98C, alpha: [0.7, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 40
                },
                {
                    name: "crack", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 6, interval: 2 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xC9B37A, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "smack", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.22], spread: 22,
                    lifetime: [6, 11], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [5, 9], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xC9B37A, alpha: [0.8, 0], light: "world", maxParticles: 40
                }
            ]
        },
        launch: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "trail", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [7, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xC9B37A, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "puff", bind: "target", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0xB9A98C, alpha: [0.5, 0], gravity: 0.03, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.4], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 16, interval: 2, repeats: 2 },
                    shape: { kind: "cone", radius: 0.55, angleDegrees: 30 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [6, 11], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xC9B37A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_megapunch", 1, MegapunchDefinition);
