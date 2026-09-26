/**
 * 骨头回力镖 / bonemerang 的客户端表现。
 *
 * 一句话：拔骨时手里拢起一圈骨白硬光，掷出后骨头本体（`minecraft:bone` 外观）飞出、拖一条旋绕的骨白光带；
 *   掠过目标的一瞬在它身上炸开骨屑，骨头折返、再掠一次，最后拖着光带落回手里。
 * 色相家族：骨白（0xEAE0C8 / 0xF4EEDC）与土棕（0x8A7A62）；饱和只在骨屑尖端一点。
 * 拍子：起 draw（聚光）→ 掷 throw（离手）→ 去 out ／ 回 back（两道弧线）→ 击 strike（骨屑外爆）→ 回 catch ／ 落 drop。
 * 范围：throw 用 `data.path` 画出从手到折返点的直边；strike 的骨屑量随 `data.count`，命中点就是骨头所在处。
 * 运动：骨头沿去／回两道弧线走（发射器绑骨头本体 `bind: "source"`，随它每刻移动），掠过向外爆骨屑，
 *   折返后光带收进手里。
 * 数：`data.count`（物攻派生的骨屑点数）驱动旋转尘与命中骨屑量；`data.hits`（已命中段数 0–2）决定回程光带
 *   是否更亮；`data.scale`（骨头判定 / 0.7）放大骨屑与光带。
 */
const BonemerangDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "grip", bind: "source", offset: [0.35, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 16, shape: { kind: "arc", radius: 0.45, arcDegrees: 150 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xEAE0C8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "stance", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0x8A7A62, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        },
        throw: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" }, burst: { count: 10, at: 0 },
                    direction: "shape", speed: [0.04, 0.16], spread: 8,
                    lifetime: [5, 10], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "release", bind: "source", offset: [0.4, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "count", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.06, 0.22], spread: 24,
                    lifetime: [8, 15], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [0.85, 0], light: "world", maxParticles: 40
                }
            ]
        },
        out: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "band", bind: "path", fit: "world", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    trail: { minDistance: 0.28 },
                    rate: 60, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [6, 10], size: [0.2, 0.04],
                    color: 0xEAE0C8, alpha: [0.6, 0], light: "full", maxParticles: 80
                },
                {
                    name: "grit", bind: "path", fit: "world", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.24 },
                    rate: { data: "count", fallback: 18 }, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.04, drag: 0.94,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x8A7A62, alpha: [0.45, 0], light: "world", maxParticles: 90
                }
            ]
        },
        back: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "band", bind: "path", fit: "world", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    trail: { minDistance: 0.26 },
                    rate: 66, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [6, 10], size: [0.2, 0.04],
                    color: 0xA8CCD8, alpha: [0.65, 0], light: "full", maxParticles: 90
                },
                {
                    name: "grit", bind: "path", fit: "world", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    trail: { minDistance: 0.3 },
                    rate: 24, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xEAE0C8, alpha: [0.6, 0], light: "full", maxParticles: 50
                }
            ]
        },
        strike: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "bonebreak", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "count", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.28], spread: 24, gravity: 0.05, drag: 0.92,
                    lifetime: [9, 16], size: [0.13, 0.02], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "shock", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spread: 20,
                    lifetime: [6, 11], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF0E6C8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        catch: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "return", bind: "source", offset: [0.3, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 12, at: 0 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [7, 13], size: [0.12, 0.02],
                    color: 0xA8CCD8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        drop: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fall", bind: "source", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.06, drag: 0.92,
                    lifetime: [8, 15], size: [0.06, 0.02],
                    color: 0x8A7A62, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bonemerang", 1, BonemerangDefinition);
