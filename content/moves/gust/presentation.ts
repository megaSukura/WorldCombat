/**
 * 起风 / gust 的客户端表现。
 *
 * 一句话：施法者振翅时翅尖聚起一环气旋，随后一团压缩的风弹「呼」地沿直线扑向目标——风弹一路拖着螺旋的
 *   气团，命中的一刻在目标身上炸成一圈向外翻的风环，把它推着走。
 * 色相家族：浅青与近白（gust／small_gust／swirlingwind／largering 的原色偏青），强调点用纯白。
 * 拍子：起 gather（聚气）→ 射 release（弹出）→ 飞 flight（螺旋气团）→ 击 burst（翻卷风环）／散 dissipate。
 * 范围：`burst` 的地面环半径由 `data.scale`（风团判定 / 0.55）缩放，玩家一眼知道这一圈会被风兜住。
 * 运动：风弹沿直线走并小幅转向目标；命中后一圈风环贴地向外翻卷，`push` 速度线沿 `data.direction`（风实际吹到的方向）
 *   拉出方向感；只有真的把离地目标吹动时（`data.lift` 非零）才补上托气流。
 * 数：`data.motes`（特攻换算的风团量）绑定飞行与爆开的气团数量，`data.lift`（离地且真的被吹动才非零）绑定上托气流，
 *   `data.scale`（风团判定 / 0.55）缩放地面风环，`data.intensity`（威力 / 34）放大整幕。
 */
const GustDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "spin_in", bind: "source", offset: [0, 0.8, 0.3], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 26, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.16], spin: 10,
                    lifetime: [7, 13], size: [0.3, 0.1], sizeMode: "linear",
                    color: 0xDCE9F0, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "chip", bind: "source", offset: [0, 0.8, 0.3], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.12, 0.04],
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", maxParticles: 26
                }
            ]
        },
        release: {
            duration: 8,
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "squeeze", bind: "source", offset: [0, 0.85, 0.35], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 22, drag: 0.92,
                    lifetime: [6, 11], size: [0.14, 0.05],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    trail: { minDistance: 0.28 }, rate: { data: "motes", fallback: 14 },
                    direction: "outward", speed: [0.0, 0.04], spin: 9, spriteFrom: "age",
                    lifetime: [4, 9], size: [0.34, 0.12], sizeMode: "linear",
                    color: 0xDCE9F0, alpha: [0.75, 0], light: "full", maxParticles: 46
                },
                {
                    name: "spiral", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    trail: { minDistance: 0.4 }, rate: 12,
                    direction: "outward", speed: [0.01, 0.06], spin: 14,
                    lifetime: [5, 11], size: [0.24, 0.08],
                    color: 0xEDF6FA, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        burst: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1, at: 0, repeats: 2, interval: 4 },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 16], size: [0.7, 0.2], sizeMode: "linear",
                    color: 0xDCE9F0, alpha: [0.5, 0], light: "full", maxParticles: 6
                },
                {
                    name: "burst_core", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    burst: { count: { data: "motes", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.26], spread: 30, spin: 12, spriteFrom: "age",
                    lifetime: [6, 13], size: [0.3, 0.1], sizeMode: "linear",
                    color: 0xEDF6FA, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "push", bind: "point", fit: "none", offset: [0, 0.35, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "line", length: 0.5 },
                    direction: "shape", speed: [0.08, 0.3], spread: 16,
                    lifetime: [5, 10], size: [0.2, 0.06],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 24
                },
                {
                    name: "float", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "lift", fallback: 0 }, at: 2, interval: 3, repeats: 4 },
                    shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.04, 0.14], gravity: 0.01, drag: 0.95,
                    lifetime: [10, 18], size: [0.1, 0.03],
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        dissipate: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "thinner", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: { data: "motes", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.12], spread: 30,
                    lifetime: [7, 13], size: [0.16, 0.05],
                    color: 0xDCE9F0, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gust", 1, GustDefinition);
