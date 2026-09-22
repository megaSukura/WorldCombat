/**
 * 龙爪 / dragonclaw 的客户端表现。
 *
 * 一句话：举爪蓄势时两条臂线上聚起紫晶色的龙气，随后一整片扇形沿臂势铺开、两道巨爪痕交叉划过，
 * 被扫中的目标身上炸开龙系冲击、护甲处再裂开一记撕甲标记。
 * 色相家族：紫晶（0x7A5CFF）作主体、淡紫（0xB79CFF）作细节、近白（0xE8E0FF）作强调；深底（0x3A2C7A）作余韵。
 * 拍子：起 raise（聚气）→ 扫 sweep（扇面铺开）与 claw（交叉爪痕）→ 击 strike（命中冲击）／ rend（撕甲）／空 miss。
 * 范围：sweep 的扇面用 `data.path`（与服务端 WorldGeometry.sector 同一组顶点）填成整片扇形，玩家一眼看出站哪会被扫到。
 * 运动：扇面沿 `data.direction` 一次铺开，两道爪痕依各自的 polyline 交叉划过；命中冲击从目标向外爆。
 * 数：扇面与爪痕的量绑 `data.marks`（物攻换算），张角绑 `data.spread`，命中强度绑 `data.intensity`（本击威力 / 78）；
 *     `data.cross` 决定是否再补第二道交叉爪痕，`data.stages` 决定撕甲标记的层数。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DragonclawDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "arm", bind: "source", offset: [0, 0.8, 0.25], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 16, shape: { kind: "line", length: 0.8 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [5, 11], size: [0.14, 0.03],
                    color: 0x7A5CFF, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "aura", bind: "source", offset: [0, 0.75, 0.1], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 6, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 15], size: [0.18, 0.04],
                    color: 0xB79CFF, alpha: [0.4, 0], light: "full", maxParticles: 24
                }
            ]
        },
        sweep: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "fan", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polygon" }, rate: { data: "marks", fallback: 16 },
                    direction: "shape", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x7A5CFF, alpha: [0.35, 0], light: "full", maxParticles: 120
                },
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true }, rate: 30,
                    direction: "shape", speed: [0.06, 0.18], spread: 10,
                    lifetime: [5, 9], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xE8E0FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 90
                }
            ]
        },
        claw: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "trail", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" }, rate: 48,
                    direction: "shape", speed: [0.05, 0.16], spread: 6,
                    lifetime: [4, 9], size: [0.4, 0.08], sizeMode: "index",
                    color: 0xB79CFF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 90
                }
            ]
        },
        strike: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: 12, at: 0 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.07, 0.24], spread: 24,
                    lifetime: [5, 10], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45
                },
                {
                    name: "scratches", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    burst: { count: { data: "marks", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xB79CFF, alpha: [0.85, 0], light: "world", maxParticles: 50
                }
            ]
        },
        rend: {
            duration: 22,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "crack", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "stages", fallback: 1 }, interval: 2, repeats: { data: "stages", fallback: 1 } },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [7, 13], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xE8E0FF, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "shed", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x3A2C7A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.7, 0.5], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: { data: "marks", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.5, angleDegrees: 26 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [5, 10], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x7A5CFF, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragonclaw", 1, DragonclawDefinition);
