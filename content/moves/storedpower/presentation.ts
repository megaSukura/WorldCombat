/**
 * 辅助力量 / storedpower 的客户端表现。
 *
 * 一句话：施法者身上每项提升亮起一道灵光环、一圈圈向身体收拢 → 灵能新星以身体为圆心炸开、外扩的环
 *   画出的正是判定半径 → 圈里每个人身上炸开灵能冲击、被向外推 → 倾囊时等级化作一圈更亮的光散去。
 * 色相家族：灵能紫（0x8A5BD0 主体 / 0xB87CE8 环与冲击 / 0xE8D0FF 只做细碎高光），尘点近白。
 * 拍子：起 charge（0–10t 收拢）→ 放 nova（炸开）→ 击 hit（命中者）→ 果 spent（倾囊）／收 fade（空放）。
 * 范围：nova 的环绑施法者、按 `data.scale`（释放半径 / 3.2）铺开——环画多大，判定就是多大。
 * 运动：charge 的光点向内收拢；nova 的环与灵光向外扩；hit 绑命中者向外炸；spent 再推一圈更远。
 * 数：charge／nova 的灵光量绑 `data.motes`（提升项数与蓄积等级派生），环数绑 `data.raised`，
 *   hit 的强度绑 `data.intensity`（本爆威力 / 60）。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const StoredPowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "rings", bind: "source", offset: [0, 0.08, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "raised", fallback: 2 },
                    shape: { kind: "ring", radius: 0.55, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.1], spin: 8,
                    lifetime: [8, 14], size: [0.2, 0.03],
                    color: 0xB87CE8, alpha: [0.8, 0], light: "full", maxParticles: 24
                },
                {
                    name: "motes", bind: "source", offset: [0, 0.08, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.62 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0xE8D0FF, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "core", bind: "source", offset: [0, 0.08, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 6, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0x8A5BD0, alpha: [0.7, 0], light: "full", maxParticles: 18
                }
            ]
        },
        nova: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "wave", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/xlring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "torus", radius: 3.2, thickness: 0.22, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: [14, 22], size: [0.55, 1.15], sizeMode: "linear",
                    color: 0xB87CE8, alpha: [0.7, 0], light: "full", maxParticles: 8
                },
                {
                    name: "swirl", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "motes", fallback: 14 },
                    shape: { kind: "sphere", radius: 3.0 },
                    direction: "outward", speed: [0.05, 0.22], spin: 10,
                    lifetime: [9, 16], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xB87CE8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 180
                },
                {
                    name: "spray", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 18 },
                    shape: { kind: "sphere", radius: 3.1 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xE8D0FF, alpha: [0.9, 0], light: "full", maxParticles: 200
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.12, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [7, 13], size: [0.3, 0.04], sizeMode: "index",
                    color: 0xE8D0FF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "shards", bind: "target", offset: [0, 0.2, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "boost", fallback: 0 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.06, 0.24], spin: 12,
                    lifetime: [9, 16], size: [0.09, 0.02],
                    color: 0xB87CE8, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        spent: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "outpulse", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "torus", radius: 3.2, thickness: 0.18, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: [14, 24], size: [0.45, 1.0], sizeMode: "linear",
                    color: 0xE8D0FF, alpha: [0.85, 0], light: "full", maxParticles: 8
                },
                {
                    name: "release", bind: "source", offset: [0, 0.1, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "spent", fallback: 4 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.1, 0.4],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xE8D0FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fizzle", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [9, 16], size: [0.18, 0.03],
                    color: 0x8A5BD0, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_storedpower", 1, StoredPowerDefinition);
