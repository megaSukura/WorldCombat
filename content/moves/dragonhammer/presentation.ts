/**
 * 龙锤 / dragonhammer 的客户端表现。
 *
 * 一句话：施法者弓身扬起、龙气沿身体向上收拢，随后整个身体自上而下砸在目标点，砸出一圈龙属冲击与碎屑，
 * 目标身上的龙气顺着砸击方向被撞开、趴伏在地（速度大幅下降）。
 * 色相家族：龙紫（0x9A7BE0 / 0xB79AF0 / impact_dragon / energyorb）为主体，近白只做砸中一刻的核心。
 * 拍子：起（rear 弓身聚龙气）→ 砸（impact 落点一圈冲击 + 目标被撞飞、砸趴）→ 收（whiff 砸空）。
 * 范围：这招只作用在贴身一个目标身上，所以每层都绑 `target`（或施法者 `source`），没有地面圈。
 * 运动：龙气起手时向上收拢、砸下时沿落点向外炸开；碎屑带重力散落。
 * 数：`data.dust`（体重与物攻派生）决定冲击碎屑量，`data.scale`（体型派生）控制尺寸，
 *   `data.intensity`（本击威力派生）抬高命中亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DragonhammerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        rear: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.9, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.16], spread: 14,
                    lifetime: [8, 16], size: [0.16, 0.04],
                    color: 0x9A7BE0, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "trail", bind: "source", offset: [0, 0.7, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: 10, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1], spread: 12,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xC9B4F2, alpha: [0.55, 0], light: "full", maxParticles: 40
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "dust", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [6, 12], size: [0.46, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "shock", bind: "target", offset: [0, -0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.35], spread: 6,
                    lifetime: [10, 18], size: [0.6, 1.1], sizeMode: "linear",
                    color: 0x9A7BE0, alpha: [0.7, 0], light: "full", maxParticles: 20
                },
                {
                    name: "debris", bind: "target", offset: [0, -0.3, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.28], spread: 20,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0x8A7A98, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "energy", bind: "source", offset: [0, 0.9, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "down", speed: [0.15, 0.5], spread: 16,
                    lifetime: [8, 14], size: [0.3, 0.05],
                    color: 0xC9B4F2, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "puff", bind: "source", offset: [0, 0.2, 0.3], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.2], spread: 14,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.24, 0.06],
                    color: 0x8A7A98, alpha: [0.4, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.15, 0.3], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "circle", radius: 0.5, thickness: 0.7 },
                    direction: "outward", speed: [0.04, 0.18], spread: 16,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xA89AB8, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragonhammer", 1, DragonhammerDefinition);
