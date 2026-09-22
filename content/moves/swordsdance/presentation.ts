/**
 * 剑舞 / swordsdance 的客户端表现。
 *
 * 一句话：脚边先聚起一圈冷光 → 舞者在对手身侧一步一斩地压上，每一斩甩出一圈飞旋的刀与四散刃光 →
 * 定锋的一刻，地面按刃风半径荡开一整圈白环，金色只在收势那一下出现。
 * 色相家族：冷钢白 0xDCE8FF 为刃光主体，青灰 0x9FB6D8 作脚下与余韵，金色 0xFFE9A8 只落在定锋的强调层。
 * 拍子：起（draw 0–14t）→ 斩（cut 每斩 0–22t）→ 定（settle 0–28t）→ 收（fade）。
 * 范围：settle 的地环绑脚点、fit none，半径按 `data.scale`（实际刃风半径 / 1.4）推出，画出的圈就是刃风扫到的范围。
 * 运动：draw 冷光向脚边聚拢；cut 刀沿外扩的环飞出、刃光向外侧扫；settle 白环向外一推到底。
 * 数：每斩的刀数绑 `data.chips`（刃光总数 / 斩数，由物攻派生），定锋的刃光总数绑 `data.sharpen`（物攻派生）；
 *   斩数绑 `data.cuts`、当前第几斩绑 `data.index`，越强的个体画面里的刃光越密。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const SwordsDanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 14, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [9, 15], size: [0.32, 0.08],
                    color: 0xDCE8FF, alpha: [0.5, 0], light: "full", maxParticles: 36
                },
                {
                    name: "steel_motes", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.07, 0.02], sizeMode: "sin",
                    color: 0x9FB6D8, alpha: [0.65, 0], light: "full", maxParticles: 44
                }
            ]
        },
        cut: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blades", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/moves/swordsdance_swords",
                    burst: { count: { data: "chips", fallback: 8 }, at: 1 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.12, 0.32],
                    lifetime: [10, 17], size: [0.4, 0.12], sizeMode: "index",
                    color: 0xDCE8FF, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 130
                },
                {
                    name: "whet_sparks", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "chips", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.03, drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xC8DAFF, alpha: [0.9, 0], light: "full", maxParticles: 140
                },
                {
                    name: "sweep", bind: "source", offset: [0, 0.12, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 6 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.1, 0.24],
                    lifetime: [6, 10], size: [0.26, 0.05],
                    color: 0xE8F0FF, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        settle: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "edge_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 1.4 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [14, 22], size: [0.55, 1.1], sizeMode: "index",
                    color: 0xE8F0FF, alpha: [0.8, 0], light: "full", maxParticles: 12
                },
                {
                    name: "edge_gold", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "sharpen", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.08, 0.28],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFE9A8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 200
                },
                {
                    name: "settle_dust", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 40 },
                    shape: { kind: "circle", radius: 1.4, thickness: 0.85 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x9FB6D8, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_sparks", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "down", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0x9FB6D8, alpha: [0.55, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_swordsdance", 1, SwordsDanceDefinition);
