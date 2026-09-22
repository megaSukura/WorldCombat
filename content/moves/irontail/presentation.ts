/**
 * 铁尾 / irontail 的客户端表现。
 *
 * 一句话：尾巴抡起时钢光沿着将要砸落的线亮起、落点圈在地上打转，随后尾尖砸下，落点炸开一圈钢蓝色冲击与碎石，
 * 砸凹时目标身上再崩一层钢屑。
 * 色相家族：钢蓝与冷灰（impact_steel／spike 原色、smoke 中性）＋一处近白高光（glowingsparkle）。
 * 拍子：起（charge 抬尾与预告线）→ 击（slam 重砸）→ 收（dent 凹陷；miss 一地碎屑）。
 * 范围：charge 与 slam 都用 path 画出服务端锁定的同一条线，落点圈用同一个 impactRadius 缩放的环；圈多大、
 * 线多长，画面就是那块地。
 * 运动：钢光沿预告线向下聚，砸下后碎石朝外飞、环贴地扩散、烟尘慢升。
 * 数：`data.notes`（重砸威力换算）绑定砸击与碎屑数量，`data.scale`（落点半径换算）绑定圆环与烟尘尺度，
 * `data.stages`（砸凹等级）绑定凹陷崩屑的数量。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const IrontailDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 14 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "aim_line", bind: "path", offset: [0, 0.85, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" },
                    rate: 24, direction: "shape", speed: [0.03, 0.12], spread: 6,
                    lifetime: [6, 12], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xBFD4E4, alpha: [0.35, 0], light: "full", maxParticles: 48
                },
                {
                    name: "aim_mark", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 8, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.01, 0.03],
                    lifetime: [10, 18], size: [0.3, { data: "scale", fallback: 1 }], sizeMode: "linear",
                    color: 0x8FA8B8, alpha: [0.4, 0], light: "full", maxParticles: 24
                },
                {
                    name: "lift", bind: "source", offset: [0, 1.0, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: 16, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0x9FB0C0, alpha: [0.55, 0], light: "full", maxParticles: 30
                }
            ]
        },
        slam: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "edge", bind: "path", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" },
                    burst: { count: 26, at: 0 },
                    direction: "shape", speed: [0.08, 0.26], spread: 10,
                    lifetime: [5, 10], size: [0.34, 0.08], sizeMode: "index",
                    color: 0xD8E6F0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "crush", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "notes", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.3], spread: 20,
                    lifetime: [7, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0x9FB0C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "shock", bind: "point", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 3, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [12, 20], size: [0.5, { data: "scale", fallback: 1 }], sizeMode: "linear",
                    color: 0x8FA8B8, alpha: [0.5, 0], light: "full", maxParticles: 30
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.08, 0.24], spread: 24,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0x77808A, alpha: [0.75, 0], light: "world", maxParticles: 60
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [16, 28], size: [0.4, 0.14],
                    color: 0x8A8F94, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        dent: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "dent_burst", bind: "target", offset: [0, 0.7, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "stages", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.22], spread: 22,
                    lifetime: [8, 15], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xD8E6F0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "dent_shard", bind: "target", offset: [0, 0.55, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "stages", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2],
                    gravity: 0.08, drag: 0.9,
                    lifetime: [12, 20], size: [0.14, 0.03],
                    color: 0x8FA8B8, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "ground_poof", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x9A8E78, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_irontail", 1, IrontailDefinition);
