/**
 * 拍落 / knockoff 的客户端表现。
 *
 * 一句话：施法者把手臂高高抬起、脚下掀起一圈碎屑，随后压上去一记重拍，在接触点炸开一团骨白冲击；
 * 若对方手里有物，那件道具沿拍击方向翻滚飞出、落地扬尘。
 * 色相家族：暗紫（smoke / impact_dark）为体，骨白（impact_normal / tinydust）作重击的强调，没有饱和色。
 * 拍子：起（raise 抬臂）→ 击（smash 重拍）→ 落（knock 道具翻滚落地）／空（miss 收势）。
 * 范围：smash 绑命中点，画出的就是被拍中的位置；knock 的定向尘沿拍击方向铺开，读得出道具往哪飞。
 * 运动：抬臂时碎屑被从地面带起，重拍是短促外爆，道具沿一条低弧翻滚远落。
 * 数：`data.motes`（体重派生的碎屑数）驱动抬臂与命中的粒子量；`data.intensity`（本击伤害占比）放大爆发；`data.scatter` 传入掉落距离供定向尘铺开。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const KnockoffDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 24,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "heave", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.04, 0.16], gravity: 0.04, drag: 0.94,
                    lifetime: [8, 16], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x6E5A48, alpha: [0.6, 0], light: "world", maxParticles: 80
                },
                {
                    name: "lift", bind: "source", offset: [0, 0.9, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 24, shape: { kind: "box", size: [0.3, 0.6, 0.3] },
                    direction: "up", speed: [0.06, 0.18],
                    lifetime: [4, 9], size: [0.16, 0.03],
                    color: 0xE8E0D2, alpha: [0.5, 0], light: "full", maxParticles: 80
                }
            ]
        },
        smash: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [5, 11], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xFFF4E0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "darkburst", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xB9A6C8, alpha: [0.9, 0], light: "world", maxParticles: 50
                },
                {
                    name: "spall", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.28], gravity: 0.04, drag: 0.93,
                    lifetime: [8, 16], size: [0.07, 0.015],
                    color: 0xC9BBA8, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "shock", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [8, 16], size: [0.5, 0.2],
                    color: 0xE9DDF4, alpha: [0.6, 0], light: "world", maxParticles: 4
                }
            ]
        },
        knock: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "toss", bind: "target", height: 0.4, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.06, drag: 0.94,
                    lifetime: [8, 16], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "streak", bind: "target", height: 0.4, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 3 }, shape: { kind: "line", length: { data: "scatter", fallback: 1.6 } },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.12, 0.02],
                    color: 0xEADDC0, alpha: [0.4, 0], light: "full", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "overrun", bind: "point", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.04,
                    lifetime: [6, 13], size: [0.06, 0.01],
                    color: 0xA8927A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_knockoff", 1, KnockoffDefinition);
