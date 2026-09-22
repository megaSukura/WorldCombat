/**
 * 喋喋不休 / chatter 的客户端表现。
 *
 * 一句话：鸟把一串尖锐的颤音压到身前张开的扇面上 → 扇面里泛起一层乱窜的音符与风纹，一下接一下 →
 *   被叫到的人头顶炸开一团晕眩鸟与问号，之后一直有鸟在头顶打转。
 * 色相家族：飞行系的淡蓝（0xA9C7E8）打底，混乱的紫（0x8A7CE8 / 0xEDE9FF）只出现在击点与晕眩层——
 *   一个效果两家色：蓝是声音本身，紫是脑子乱掉的结果。
 * 拍子：起 gather（聚颤音）→ 叫 screech（每一声一张扇面，多声叠出密度）→ 击 scramble（头顶炸开）→ 收 linger（鸟绕头）。
 * 范围：screech 用与判定同一组 `data.path` 顶点填出扇面，玩家一眼看出站在哪块扇形里会被叫到。
 * 运动：声纹从施法者口边沿 `data.direction` 向扇面外冲；喂进去的音符与风纹朝同方向散开。
 * 数：每一声的发射量绑定 `data.screech`（音数，特攻与等级换算），`data.index`／`data.bursts` 让玩家数得出第几声。
 */
const ChatterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 11 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_voice", bind: "source", offset: [0, 0.5, 0], height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [7, 13], size: [0.09, 0.02],
                    color: 0xA9C7E8, alpha: [0.8, 0], light: "full", maxParticles: 34
                },
                {
                    name: "gather_tremor", bind: "source", offset: [0, 0.5, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 8, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0x8A7CE8, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        screech: {
            duration: 20,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "screech_face", bind: "path", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    shape: { kind: "polygon" },
                    rate: 70, direction: "up", speed: [0.06, 0.2], spread: 26,
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0xA9C7E8, alpha: [0.4, 0], light: "world", maxParticles: 160
                },
                {
                    name: "screech_notes", bind: "path", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    shape: { kind: "polygon" },
                    burst: { count: { data: "screech", fallback: 8 }, at: 0 },
                    rate: 12, direction: "outward", speed: [0.1, 0.3], spread: 34,
                    lifetime: [8, 14], size: [0.13, 0.03],
                    color: 0xEDE9FF, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "screech_lines", bind: "path", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polygon" },
                    burst: { count: 14, at: 0 },
                    direction: "outward", speed: [0.16, 0.44], spread: 30,
                    lifetime: [5, 10], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xC9DCF2, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "screech_ring", bind: "point", fit: "none", offset: [0, 0.5, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.24, 0.6],
                    color: 0x8A7CE8, alpha: [0.5, 0], light: "full", maxParticles: 6
                }
            ]
        },
        scramble: {
            duration: 36,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "scramble_birds", bind: "target", offset: [0, 0.35, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: { data: "screech", fallback: 8 }, at: 0 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.02, 0.08], spin: 6,
                    lifetime: [14, 24], size: [0.12, 0.03],
                    color: 0x8A7CE8, alpha: [0.9, 0], light: "full", maxParticles: 30
                },
                {
                    name: "scramble_marks", bind: "target", offset: [0, 0.3, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/question",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [14, 22], size: [0.12, 0.02],
                    color: 0xEDE9FF, alpha: [0.75, 0], light: "full", maxParticles: 12
                },
                {
                    name: "scramble_ring", bind: "target", offset: [0, 0.6, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.26, 0.6],
                    color: 0x8A7CE8, alpha: [0.5, 0], light: "full", maxParticles: 4
                }
            ]
        },
        fumble: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fumble_burst", bind: "target", offset: [0, 0.5, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x8A7CE8, alpha: [0.9, 0], light: "full", maxParticles: 20
                }
            ]
        },
        linger: {
            duration: { data: "tick", fallback: 60 },
            exit: { drain: 20 },
            emitters: [
                {
                    name: "linger_birds", bind: "target", offset: [0, 0.45, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 2, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.03], spin: 4,
                    lifetime: [16, 26], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0x8A7CE8, alpha: [0.45, 0], light: "full", maxParticles: 10
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_chatter", 1, ChatterDefinition);
