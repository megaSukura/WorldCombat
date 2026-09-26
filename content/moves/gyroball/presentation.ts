/**
 * 陀螺球 / gyroball 的客户端表现。
 *
 * 一句话：一枚钢陀螺在脚边越转越亮，钢屑向里收成轮缘，随后贴着地面朝对手滚过去、拖出一道掠地尘缘；
 * 撞上的一刻整颗球爆开一圈钢屑与火花，陀螺转得越重爆得越密（`load` 越大球越大）。
 * 色相家族：冷钢灰与近银（energyorb 0xB8C2CC／impact_steel／tinydust 0x9AA2AC），近白高光（0xFFFFFF）只给命中那一下。
 * 拍子：起（charge 聚屑成轮）→ 滚（roll 掠地）→ 击（hit 崩钢）／空（whiff 空转收势）。
 * 范围：roll 的 `path` 是与服务端 WorldGeometry 同一组四个顶点的走廊，画面铺出的就是会被扫到的那块地。
 * 运动：charge 的屑向里收成轮缘；roll 的钢球沿 `data.direction` 由近及远滚；hit 的屑向外炸开带重力。
 * 数：charge 与 roll 共用同一个 `data.scale`（由 `load` 速度差派生），陀螺体积与粒子大小一致；
 *   roll 的尘量绑定 `data.grains`，hit 的崩屑量绑定 `data.grains`、亮度绑定 `data.intensity`。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const GyroballDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "wind_ring", bind: "source", offset: [0, 0.12, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 12, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.14], spin: 10,
                    lifetime: [6, 12], size: { data: "scale", fallback: 0.16 },
                    color: 0xB8C2CC, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "filings", bind: "source", offset: [0, 0.08, 0], height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "cylinder", radius: 0.55, length: 0.12 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [5, 11], size: { data: "scale", fallback: 0.06 },
                    color: 0x9AA2AC, alpha: [0.5, 0], light: "world", maxParticles: 48
                },
                {
                    name: "rim", bind: "source", offset: [0, 0.16, 0], height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    rate: 14, shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.02, 0.09], spin: 18,
                    lifetime: [5, 10], size: { data: "scale", fallback: 0.2 },
                    color: 0xDCE4EC, alpha: [0.45, 0], light: "full", maxParticles: 36
                }
            ]
        },
        roll: {
            duration: 46,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "swept", bind: "path", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" }, rate: { data: "grains", fallback: 14 }, direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.03, drag: 0.93,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0x9AA2AC, alpha: [0.4, 0], light: "world", maxParticles: 60
                },
                {
                    name: "shell", bind: "source", offset: [0, 0.2, 0], height: 0.25, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 26, shape: { kind: "sphere", radius: 0.22 }, direction: "outward", speed: [0.02, 0.1], spin: 22,
                    lifetime: [5, 10], size: { data: "scale", fallback: 1 },
                    color: 0xB8C2CC, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "speed_lines", bind: "source", offset: [0, 0.24, 0], height: 0.25, orient: "direction", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    shape: { kind: "cylinder", radius: 0.3, length: 0.7 }, rate: 18, direction: "shape", speed: [0.05, 0.2],
                    lifetime: [4, 8], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xE8EDF2, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 48
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "burst_steel", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "grains", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 }, direction: "outward", speed: [0.08, 0.28], spread: 20,
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "sparks", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 }, direction: "outward", speed: [0.1, 0.36], spread: 26,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 16], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xE8EDF2, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "grains", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.04, 0.18], gravity: 0.06, drag: 0.9,
                    lifetime: [10, 20], size: [0.06, 0.02],
                    color: 0x8A929C, alpha: [0.55, 0], light: "world", maxParticles: 56
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "grind_out", bind: "point", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] }, direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x8A929C, alpha: [0.45, 0], light: "world", maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gyroball", 1, GyroballDefinition);
