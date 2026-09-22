/**
 * 龙之怒 / dragonrage 的客户端表现。
 *
 * 一句话：怒火从身上窜成一层赤红的怒气，在胸前收成一颗炽热的龙息弹；砸中对手时炸开一团赤光与钝击，
 * 被撞退的人身上还冒着余烬；怒爆式则在落点整圈炸开。
 * 色相家族：赤红（0xE0563A）与暖金（0xFFB24D）为主，钝击命中用原型 impact_dragon；余烬偏暗红。
 * 拍子：起（rage 聚怒）→ 击（launch 脱手、impact 命中／erupt 炸开）→ 收（fade 余烬散去）。
 * 范围：erupt 的贴地冲击环半径读 `data.scale`（爆发半径 / 1.8）；impact 绑目标，命中亮度读 `data.intensity`。
 * 运动：怒气从脚边向上卷、汇进胸前的弹体；弹体沿瞄准方向直飞；炸开时向外抛、余烬上浮。
 * 数：`data.motes`（体重与等级换算的怒焰量）绑定各处爆发数量与持续发射率，`data.intensity`（motes / 24）抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DragonrageDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        rage: {
            duration: { data: "windup", fallback: 11 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "kindle", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    rate: 18, shape: { kind: "ring", radius: 0.6, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.05, 0.2],
                    lifetime: [9, 16], size: [0.2, 0.05],
                    color: 0xE0563A, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "seethe", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 10, shape: { kind: "sphere", radius: 0.36 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [7, 14], size: [0.1, 0.03], sizeMode: "sin",
                    color: 0xFFB24D, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        launch: {
            duration: 20,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "core", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFD9A8, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 60
                },
                {
                    name: "blast_dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [9, 17], size: [0.07, 0.02],
                    color: 0xC98B5A, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 13, drain: 18 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 11], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFE6C2, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 50
                },
                {
                    name: "wrath", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.46 },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [8, 16], size: [0.14, 0.04],
                    color: 0xE0563A, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "ember", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "hemisphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [12, 22], size: [0.07, 0.02],
                    color: 0xFFB24D, alpha: [0.7, 0], light: "full", maxParticles: 110
                }
            ]
        },
        erupt: {
            duration: 32,
            exit: { stop: 15, drain: 22 },
            emitters: [
                {
                    name: "shock", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 18], size: [0.5, 1.4],
                    color: 0xE0563A, alpha: [0.55, 0], light: "world", maxParticles: 20
                },
                {
                    name: "fireball", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.07, 0.3],
                    lifetime: [7, 13], size: [0.42, 0.07], sizeMode: "index",
                    color: 0xFFE0B0, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 90
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [16, 28], size: [0.44, 0.12],
                    color: 0xA86A50, alpha: [0.34, 0], light: "world", maxParticles: 120
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "afterloss", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.13],
                    gravity: 0.02, drag: 0.94,
                    lifetime: [10, 20], size: [0.06, 0.02],
                    color: 0xB08068, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragonrage", 1, DragonrageDefinition);
