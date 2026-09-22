/**
 * 燃尽 / burnup 的客户端表现。
 *
 * 一句话：施法者全身的火先向内收拢、体表透出白亮，然后朝身前喷出一道白焰锥面，正对的人被烧穿；
 *   喷完火熄了，只剩一层暗红余烬贴着自己慢慢散。
 * 色相家族：白热一族（0xFFF1D6 焰心 / 0xFFB347 焰体 / 0xD9611E 暗红余烬，烟近黑 0x2A2118）——
 *   第二色相（暗红）只用在燃尽后的「已经烧空」这一段。
 * 拍子：起 kindle（0–8t 收火泛白）→ 击 burst（锥面白焰冲出）→ 烧 scorch／侧焰 splash → 尽 spent（余烬暗淡）。
 * 范围：burst 的锥面用与判定同一个几何（`data.half` 半角、`data.reach` 长度、`orient:direction`），
 *   扫到哪块区域就是画面里那片白焰——玩家一眼看出站在正前方会吃满。
 * 运动：白焰沿 `data.direction` 向前张开；前沿以 `data.speed` 冲出；命中点余焰向外翻卷、落地成灰。
 * 数：锥面每层的发射量绑定 `data.ember`（特攻与等级换算），命中强度绑定 `data.intensity`（实际伤害换算），
 *   几何尺度绑定 `data.scale`（射程换算）。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const BurnupDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kindle: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 26, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [8, 15], size: [0.18, 0.03], sizeMode: "sin",
                    color: 0xFFB347, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "white_core", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0xFFF1D6, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 50
                }
            ]
        },
        burst: {
            duration: 18,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "cone_core", bind: "source", offset: [0, 0.45, 0], height: 0.4, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "ember", fallback: 24 }, at: 0 },
                    shape: { kind: "cone_volume", radius: 0.45, angleDegrees: { data: "half", fallback: 31 }, length: { data: "reach", fallback: 6.8 } },
                    direction: "shape", speed: [0.2, 0.7],
                    lifetime: [7, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFF1D6, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 260
                },
                {
                    name: "cone_body", bind: "source", offset: [0, 0.4, 0], height: 0.35, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 90,
                    shape: { kind: "cone_volume", radius: 0.45, angleDegrees: { data: "half", fallback: 31 }, length: { data: "reach", fallback: 6.8 } },
                    direction: "shape", speed: [0.1, 0.4],
                    lifetime: [10, 18], size: [0.4, 0.12],
                    color: 0xFFB347, alpha: [0.55, 0], light: "full", maxParticles: 360
                },
                {
                    name: "cone_ash", bind: "source", offset: [0, 0.35, 0], height: 0.3, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 34,
                    shape: { kind: "cone_volume", radius: 0.45, angleDegrees: { data: "half", fallback: 31 }, length: { data: "reach", fallback: 6.8 } },
                    direction: "shape", speed: [0.04, 0.2], gravity: 0.02, drag: 0.93,
                    lifetime: [14, 26], size: [0.4, 0.16],
                    color: 0x2A2118, alpha: [0.4, 0], light: "world", maxParticles: 160
                }
            ]
        },
        scorch: {
            duration: 26,
            exit: { stop: 11, drain: 20 },
            emitters: [
                {
                    name: "sear", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 26, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.14, 0.46],
                    lifetime: [7, 14], size: [0.28, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 100
                },
                {
                    name: "sear_flame", bind: "target", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 40, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.05, 0.24],
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xFFB347, alpha: [0.9, 0], gravity: 0.03, drag: 0.9, light: "full", maxParticles: 140
                }
            ]
        },
        splash: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "wash", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.24, 0.04], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "wash_ember", bind: "target", offset: [0, 0.25, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 20, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.03, drag: 0.91,
                    lifetime: [9, 18], size: [0.08, 0.02],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", maxParticles: 70
                }
            ]
        },
        spent: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "dying_embers", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.07],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xD9611E, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "cold_ash", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.94,
                    lifetime: [16, 28], size: [0.3, 0.12],
                    color: 0x2A2118, alpha: [0.35, 0], light: "world", maxParticles: 50
                }
            ]
        },
        reignite: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "spark_back", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_burnup", 1, BurnupDefinition);
