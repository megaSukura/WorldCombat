/**
 * 音速拳 / machpunch 的客户端表现。
 *
 * 一句话：拳锋在身前收拢成一记拳影，随后拳尖细闪先到、真实接触点只亮一小点；成功命中后极短一拍，
 *   在同一接触点炸开一道向前推开的压缩空气小环与一记直拳的光影，环与拳影都向外一翻就散；
 *   伤害被拒时同一接触点只收拢一圈黯淡的格挡微光，不报伤害；挥空时拳程终点只有一道没打中人的空环迅速消散。
 * 色相家族：暖琥珀（0xFFF0D0 / 0xF2A65A）做拳影，近白的冷蓝白（0xEAF2FF）只做音爆环，格挡用中性灰（0xC6CED9），没有第二组饱和色。
 * 拍子：起 chamber（收拳聚力）→ 触 contact（拳尖细闪）→ 爆 boom（延后 1–2 刻的小冲环 + 拳影）／挡 blocked（格挡微光）→ 收 whiff（空环消散）。
 * 范围：boom／blocked／contact 都绑真实接触点（`data.point`），目标倒下或移开也停在打中的位置；whiff 绑射线真实终点（墙则停在墙面）。
 * 运动：起手是向内收拢的拳影，命中是横向推开的一圈短音爆与被拳风带飞的小碎点，挥空是一圈向内塌掉的空气。
 * 数：boom 的碎点数量绑定 `data.count`（拳威力换算），音爆环碎点与 blocked 的格挡光点绑定 `data.ring`（速度换算），
 *   环的尺度绑定 `data.boom`（速度换算），亮度绑定 `data.intensity`（拳威力 / 60）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const MachpunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        chamber: {
            duration: { data: "windup", fallback: 1 },
            exit: { stop: 1, drain: 6 },
            emitters: [
                {
                    name: "fist", bind: "source", offset: [0, 0.45, 0.35], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    rate: 8, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.42, 0.14], sizeMode: "index",
                    color: 0xFFD9A0, alpha: [0.55, 0], light: "full", maxParticles: 18
                },
                {
                    name: "compress", bind: "source", offset: [0, 0.45, 0.3], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [4, 8], size: [0.16, 0.03],
                    color: 0xEAF2FF, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        contact: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "tip", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere", radius: 0.1 },
                    direction: "shape", speed: [0.05, 0.18], spread: 18,
                    lifetime: [3, 6], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xFFF0D0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 10
                }
            ]
        },
        boom: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "shock", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "boom", fallback: 0.7 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [5, 10], size: [0.45, 1.3],
                    color: 0xEAF2FF, alpha: [0.85, 0], light: "full", bloom: 0.22, maxParticles: 4
                },
                {
                    name: "fist", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.12 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [5, 10], size: [0.6, 0.85], sizeMode: "index",
                    color: 0xFFF0D0, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 4
                },
                {
                    name: "driven", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "count", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "boom", fallback: 0.7 } },
                    direction: "outward", speed: [0.08, 0.28], spread: 22,
                    lifetime: [5, 10], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xFFE9BC, alpha: [0.8, 0], light: "full", maxParticles: 48
                }
            ]
        },
        blocked: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "guard", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "boom", fallback: 0.7 } },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [5, 10], size: [0.4, 0.9],
                    color: 0xC6CED9, alpha: [0.55, 0], light: "world", maxParticles: 4
                },
                {
                    name: "spark", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "ring", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "inward", speed: [0.05, 0.16], spread: 26,
                    lifetime: [4, 8], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xC6CED9, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "empty", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "boom", fallback: 0.7 } },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [5, 10], size: [0.45, 0.1],
                    color: 0xEAF2FF, alpha: [0.5, 0], light: "full", maxParticles: 4
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_machpunch", 1, MachpunchDefinition);
