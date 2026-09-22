/**
 * 鼠数儿 / populationbomb 的客户端表现。
 *
 * 一句话：施法者脚边先扬起一圈尘土、细小身影向它聚拢；随后伙伴们一只接一只从目标四周扑过去，
 *   每只拖一条土色细线，扑中的地方炸开一小团尘土与切割白痕；一只扑空，这一串就散了。
 * 色相家族：土棕（tinydust / 0xC9B78A）与近白（小亮点的切割痕）；饱和只在命中白痕的小面积。
 * 拍子：集 gather（聚拢）→ 扑 rush（一只接一只）→ 击 hit（尘土外爆）／ 空 whiff → 散 scatter。
 * 范围：rush 的伙伴本体是追踪投射物外观（小身影），队伍从 `data.ring` 决定的多远扑来；命中点就是落点。
 * 运动：伙伴从目标四周向内扑（发射器绑投射物本体 `bind: "projectile"`），命中向外爆尘，扑空时速度线掠过。
 * 数：`data.count`（每只的尘土点数 / 已扑只数）驱动聚拢与命中的粒子量；`data.total`（连段上限）决定集结
 *   层密度；`data.motes`（物攻派生）单独驱动命中尘土量。画面里的数量和机制一致。
 */
const PopulationbombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "call", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "count", fallback: 14 }, shape: { kind: "ring", radius: 1.2 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xC9B78A, alpha: [0.5, 0], light: "world", maxParticles: 70
                },
                {
                    name: "signals", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: { data: "total", fallback: 6 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xE8DCC0, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        rush: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    trail: { minDistance: 0.22 },
                    rate: 40, shape: { kind: "sphere", radius: 0.1 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [5, 9], size: [0.16, 0.03],
                    color: 0xC9B78A, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "kicks", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 },
                    rate: 18, shape: { kind: "sphere", radius: 0.08 },
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.05, drag: 0.94,
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "dust", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.2], spread: 22,
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF0E8D0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "crumbs", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.06, drag: 0.9,
                    lifetime: [8, 15], size: [0.06, 0.02], sizeMode: "index",
                    color: 0xC9B78A, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "past", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [7, 13], size: [0.13, 0.03],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        scatter: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "disperse", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 6 }, at: 0 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [9, 16], size: [0.06, 0.02],
                    color: 0xC9B78A, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_populationbomb", 1, PopulationbombDefinition);
