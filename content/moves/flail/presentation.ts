/**
 * 抓狂 / flail 的客户端表现。
 *
 * 一句话：人一沉身，身前那片扇形被一串越来越急的乱拳扫过，每一下在同一片扇面里崩出尘屑；
 * 血越少，那片扇面上的红雾越浓、扫出的动作也越密。
 * 色相家族：暖骨白与沙棕（tinydust / speedlines / impact_normal）为主体，唯一的饱和色是缺血红
 * （fire/ember 的暖橙红，只在 fan_rage 与 hit 的 rage 层小面积出现），它正好是「还剩多少血」的读数。
 * 拍子：起（windup 沉身）→ 乱（swing 扇面一下一下地扫、hit 命中崩屑）→ 收（swing 的 miss 形态空摆）。
 * 范围：swing 用与服务端 WorldGeometry.sector 同一组 `data.path` 顶点填成扇形，扇面多大多开画面就是那块。
 * 运动：尘点沿扇面从里向外甩，速度线贴扇面边缘沿朝向拉直；每一下都在同一扇形上再扫一次。
 * 数：扇面密度绑定 `data.sparks`（物攻与缺失血量派生），缺血红雾密度绑定 `data.rage`（缺失血量派生），
 *   命中亮度绑定 `data.intensity`（单发威力派生）——画面里的数与机制里的数一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FlailDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "reach", fallback: 5 },
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.08, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.44 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.06, 0.02],
                    color: 0xD8C39A, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "rage_seed", bind: "source", offset: [0, 0.35, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "moves", fallback: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xE8704A, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 20
                }
            ]
        },
        swing: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "fan_dust", bind: "path", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: { data: "sparks", fallback: 12 }, direction: "outward", speed: [0.04, 0.18], spread: 26,
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xD8C39A, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "fan_edge", bind: "path", fit: "none", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" },
                    rate: { data: "sparks", fallback: 12 }, direction: "outward", speed: [0.08, 0.28], spread: 18,
                    lifetime: [3, 7], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xF2E6CE, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "fan_rage", bind: "path", fit: "none", offset: [0, 0.32, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "polygon" },
                    rate: { data: "rage", fallback: 0 }, direction: "outward", speed: [0.06, 0.22], spread: 22,
                    lifetime: [4, 9], size: [0.07, 0.01],
                    color: 0xE8704A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "knuckle", bind: "target", offset: [0, 0.1, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.07, 0.24], spread: 22,
                    lifetime: [5, 10], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFF3DC, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "grit", bind: "target", offset: [0, 0.2, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.15], gravity: 0.05, drag: 0.9,
                    lifetime: [9, 16], size: [0.06, 0.02],
                    color: 0xCFA46E, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "rage_spatter", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "rage", fallback: 2 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 24,
                    lifetime: [5, 10], size: [0.07, 0.01],
                    color: 0xE8704A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flail", 1, FlailDefinition);
