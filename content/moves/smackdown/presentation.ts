/**
 * 击落 / smackdown 的客户端表现。
 *
 * 一句话：施法者手边卷起一小撮石屑，随即一支系着配重的岩弹脱手飞出、拖着一小截土烟；砸中离地的对手时，
 * 目标脚下炸开一小圈迸射的碎石与尘土，随后贴着地面留下一圈被砸实的灰印；砸中走地的对手只有同样的撞点；
 * 打空则只在落点扬一点尘。
 * 色相家族：岩棕与石灰（earth / large_rock / impact_rock / tinydust）为主体，近白只做每一记撞击的高光。
 * 拍子：起（windup 聚石屑）→ 飞（flight 拖尾）→ 落（hit 撞点、drop 拖落、pin 贴地灰印、miss 落空扬尘）。
 * 范围：drop 的一圈按 `data.scale`（拖落速度 / 0.8）画出目标落点那一小圈；pin 的一圈跟着目标。
 * 运动：flight 绑 projectile 拖尾；hit 碎块带重力四散；drop 尘环从落点向外压平。
 * 数：`data.power`（本击威力）决定 hit 碎块量，`data.intensity` 抬高撞击亮度，`data.pull` 决定拖落力度。
 */
const SmackdownDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.09], spread: 16,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x8A7A62, alpha: [0.55, 0], light: "world", maxParticles: 34
                },
                {
                    name: "grit", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 15], size: [0.05, 0.01],
                    color: 0x6E5A44, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        flight: {
            duration: 120,
            exit: { stop: 40, drain: 20 },
            emitters: [
                {
                    name: "trail", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "sphere", radius: 0.16 },
                    trail: { minDistance: 0.35 }, direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x8A7A62, alpha: [0.45, 0], light: "world", maxParticles: 120
                },
                {
                    name: "chips", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 18, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.02, 0.07], spread: 18,
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x6E5A44, alpha: [0.5, 0], gravity: 0.04, light: "world", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "count", fallback: 48 }, at: 1, interval: 1, repeats: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.3], spread: 22,
                    lifetime: [6, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "rubble", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "count", fallback: 30 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.1, 0.4], spread: 30,
                    gravity: 0.07, drag: 0.94,
                    lifetime: [10, 20], size: [0.16, 0.04],
                    color: 0x9A8A72, alpha: [0.9, 0], light: "world", maxParticles: 70
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        drop: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "slam", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "count", fallback: 12 }, at: 0, interval: 2, repeats: 4 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [8, 14], size: [0.34, 0.1], sizeMode: "index",
                    color: 0x9A8A72, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "crush", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 20, at: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.34], spread: 20,
                    gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0x8A7A62, alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        pin: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stake", bind: "target", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.08], spread: 10,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0x6E5A44, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "scuff", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [9, 15], size: [0.05, 0.01],
                    color: 0x8A7A62, alpha: [0.45, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_smackdown", 1, SmackdownDefinition);
