/**
 * 啄钻 / drillpeck 的客户端表现。
 *
 * 一句话：原地转起来、翅与气流拧成一圈上升的螺旋，随后一条钻轴贴着身前捅出去，尖喙一口接一口咬进目标、
 * 每咬一口崩起一圈羽毛与碎屑；对离地的目标，螺旋从下方往上卷得更亮。
 * 色相家族：天青（0x9FD6FF）作主体、钢灰（0xB8C6D8）作余韵、亮白（0xE8F6FF）作强调；中性尘屑收尾。
 * 拍子：起 spin（旋起螺旋）→ 击 bore（钻轴捅出）与 bite（每一口）→ 收 dive（对空更亮）或 drift（目标脱离）／whiff。
 * 范围：bore 的钻轴用 `data.path`（与服务端 lane 同一条轴）画成一条窄带，玩家一眼看出只有这条轴上会被钻到。
 * 运动：螺旋绕轴自转并沿 `data.direction` 前推，每一口的碎屑从目标身上向外崩开、带重力落下。
 * 数：钻轴粒子量绑 `data.shavings`（物攻换算），口数脉冲绑 `data.bites`（速度与配置换算），空中命中另起更亮的幕。
 */
const DrillpeckDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        spin: {
            duration: 16,
            exit: { stop: 7, drain: 10 },
            emitters: [
                {
                    name: "whirl", bind: "source", offset: [0, 0.5, 0.12], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    rate: 10, shape: { kind: "cylinder", radius: 0.4, length: 0.8 },
                    direction: "inward", speed: [0.03, 0.1], spin: 20,
                    lifetime: [5, 10], size: [0.22, 0.05],
                    color: 0xBFE4F6, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "wind", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 6, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.18, 0.04],
                    color: 0xE8F6FF, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        bore: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "drill", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/drill",
                    shape: { kind: "polyline" }, burst: { count: { data: "shavings", fallback: 10 } },
                    direction: "shape", orient: "direction", speed: [0.06, 0.2], spread: 12, spin: 16,
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xE8F6FF, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "gust", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: { data: "bites", fallback: 3 }, interval: 2 },
                    direction: "shape", orient: "direction", speed: [0.12, 0.32],
                    lifetime: [5, 9], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x9FD6FF, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        bite: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "peck", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.06, 0.2], spread: 22,
                    lifetime: [5, 9], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.35
                },
                {
                    name: "feathers", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    burst: { count: { data: "shavings", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18], spread: 26,
                    lifetime: [6, 12], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xBFE4F6, alpha: [0.8, 0], gravity: 0.04, light: "world", maxParticles: 40
                }
            ]
        },
        dive: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "rise", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 12, interval: 2, repeats: 2 },
                    shape: { kind: "cylinder", radius: 0.24, length: 0.9 },
                    direction: "up", speed: [0.1, 0.28],
                    lifetime: [6, 12], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xE8F6FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 36
                },
                {
                    name: "spiral", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.22], spin: 18,
                    lifetime: [6, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x9FD6FF, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        drift: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "loose", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [6, 11], size: [0.18, 0.04], sizeMode: "index",
                    color: 0x9FD6FF, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.4], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: 14, interval: 2, repeats: 2 },
                    shape: { kind: "cone", radius: 0.4, angleDegrees: 22 },
                    direction: "outward", speed: [0.1, 0.26], spin: 12,
                    lifetime: [6, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xBFE4F6, alpha: [0.45, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_drillpeck", 1, DrillpeckDefinition);
