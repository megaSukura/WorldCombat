/**
 * 骨头回力镖 / bonemerang 的客户端表现。
 *
 * 一句话：拔骨时手里拢起一圈骨白硬光，掷出后骨头本体（`minecraft:bone` 外观）飞出、拖一条旋绕的骨白光带；
 *   掠过目标的一瞬在它身上炸开骨屑，骨头折返、再掠一次，最后拖着光带落回手里；撞墙则当场碎成骨屑。
 * 色相家族：骨白（0xEAE0C8 / 0xF4EEDC）与土棕（0x8A7A62）；饱和只在骨屑尖端一点。
 * 拍子：起 draw（聚光）→ 去 out ／ 回 back（两道横扫）→ 击 strike（骨屑外爆）→ 回 catch ／ 落 drop ／ 碎 break。
 * 范围：out/back 的尾迹直接绑真实骨体实体（`data.target`，即 `bone.ref()`），随它每刻的质心拖出；
 *   strike 的骨屑量随 `data.count`，命中点就是骨头所在处。
 * 运动：骨头沿去／回两道真实折线飞（发射器绑骨体，随它移动），掠过向外爆骨屑，折返后光带收进手里；
 *   撞墙的碎屑落在实际接触点（`bind: "point"`）。
 * 数：`data.count`（物攻派生的骨屑点数）驱动旋转尘、尾迹密度与命中骨屑量；`data.hits`（已命中段数 0–2）决定回程光带
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
        out: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "band", bind: "target", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    trail: { minDistance: 0.22 },
                    rate: 60, shape: { kind: "sphere", radius: 0.05 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [6, 10], size: [0.2, 0.04],
                    color: 0xEAE0C8, alpha: [0.6, 0], light: "full", maxParticles: 80
                },
                {
                    name: "grit", bind: "target", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.2 },
                    rate: { data: "count", fallback: 18 }, shape: { kind: "sphere", radius: 0.04 },
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
                    name: "band", bind: "target", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    trail: { minDistance: 0.2 },
                    rate: 66, shape: { kind: "sphere", radius: 0.05 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [6, 10], size: [0.2, 0.04],
                    color: 0xA8CCD8, alpha: [0.65, 0], light: "full", maxParticles: 90
                },
                {
                    name: "grit", bind: "target", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    trail: { minDistance: 0.24 },
                    rate: { data: "count", fallback: 24 }, shape: { kind: "sphere", radius: 0.04 },
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
        break: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shatter", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "count", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.26], spread: 24, gravity: 0.06, drag: 0.9,
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [0.85, 0], light: "world", maxParticles: 40
                },
                {
                    name: "puff", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 }, shape: { kind: "ring", radius: 0.2, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [7, 13], size: [0.06, 0.01],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        drop: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fall", bind: "point",
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
