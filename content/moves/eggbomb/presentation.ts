/**
 * 炸蛋 / eggbomb 的客户端表现。
 *
 * 一句话：施法者把一枚大蛋举过头顶抡圆，蛋沿一道沉甸甸的弧线砸出去；命中的一刻炸开一圈蛋壳碎片与蛋液，
 *   蛋液在地上摊成一小片发亮的黄斑，存续期内谁踩上去都滑。
 * 色相家族：蛋壳的米白与蛋黄的暖黄（eggbomb_egg／eggshards／softboiled_egg 原色），命中处近白高光。
 * 拍子：起 heave（抡蛋）→ 射 release（脱手）→ 飞 flight（沉甸甸的弧）→ 击 shatter（炸壳）／落 splash（摊蛋液）
 *   → 收 slick（地面黄斑留一段时间）。
 * 范围：`splash` 与 `slick` 的地面圈由 `data.scale`（滑蛋液半径 / 1.6）缩放，玩家一眼知道站哪会踩到滑。
 * 运动：蛋本体由原生实体按 item 外观渲染；粒子补抡手、飞行尾迹、破碎与摊开。散开有随机偏角（原生 75 命中）。
 * 数：`data.shards`（物攻换算的碎壳量）绑定破碎与摊开的碎片数量，`data.scale` 统一缩放整幕，
 *   `data.intensity`（威力 / 90）放大发射量，`data.slick`（存续刻数）决定地面黄斑续多久。
 */
const EggbombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        heave: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 1.5, 0.15], height: 0.75, fit: "body",
                    particle: "world_combat_core:cobblemon/moves/eggbomb_egg",
                    rate: 10, shape: { kind: "sphere", radius: 0.35 }, spriteFrom: "age",
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.3, 0.12], sizeMode: "linear",
                    alpha: [0.85, 0], light: "world", maxParticles: 16
                },
                {
                    name: "tension", bind: "source", offset: [0, 0.2, 0.2], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.09], gravity: 0.04, drag: 0.9,
                    lifetime: [7, 12], size: [0.05, 0.02],
                    color: 0xE8D8A8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        release: {
            duration: 8,
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "fling", bind: "source", offset: [0, 1.4, 0.35], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], spread: 24, spin: 8,
                    lifetime: [5, 10], size: [0.1, 0.03],
                    color: 0xF2E4B8, alpha: [0.8, 0], light: "world", maxParticles: 20
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.35 }, rate: 22,
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.03, drag: 0.94,
                    lifetime: [5, 11], size: [0.06, 0.02],
                    color: 0xE8D8A8, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "wobble", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    trail: { minDistance: 0.5 }, rate: 10, spriteFrom: "age",
                    direction: "outward", speed: [0.0, 0.03], spin: 10,
                    lifetime: [4, 8], size: [0.07, 0.03],
                    color: 0xF6ECD2, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        shatter: {
            duration: 22,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "flash", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [4, 9], size: [0.34, 0.06], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 10
                },
                {
                    name: "shell", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.28], spread: 30, spin: 12,
                    gravity: 0.08, drag: 0.92,
                    lifetime: [8, 15], size: [0.12, 0.04],
                    color: 0xF6ECD2, alpha: [0.95, 0], light: "world", maxParticles: 60
                },
                {
                    name: "yolk", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/moves/softboiled_egg",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.09, drag: 0.9,
                    lifetime: [9, 17], size: [0.16, 0.05],
                    color: 0xF2C14E, alpha: [0.9, 0], light: "world", maxParticles: 48
                }
            ]
        },
        splash: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shell", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    burst: { count: { data: "shards", fallback: 9 }, at: 0 },
                    shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.06, 0.22], spin: 10,
                    gravity: 0.09, drag: 0.9,
                    lifetime: [8, 15], size: [0.1, 0.03],
                    color: 0xF6ECD2, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "spread", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/moves/softboiled_egg",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "circle", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.18, 0.06],
                    color: 0xF2C14E, alpha: [0.85, 0], light: "world", maxParticles: 40
                }
            ]
        },
        slick: {
            duration: 0,
            exit: { stop: 0, drain: 30 },
            emitters: [
                {
                    name: "pool", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/moves/softboiled_egg",
                    rate: 12, shape: { kind: "circle", radius: 1.6 },
                    direction: "outward", speed: [0.0, 0.02], spriteFrom: "age",
                    lifetime: [14, 24], size: [0.24, 0.16], sizeMode: "linear",
                    color: 0xF2C14E, alpha: [0.45, 0.05], light: "world", maxParticles: 60
                },
                {
                    name: "shine", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "circle", radius: 1.5 },
                    direction: "outward", speed: [0.0, 0.02], gravity: 0.01, drag: 0.96,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0xFFF3C4, alpha: [0.5, 0], light: "full", maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_eggbomb", 1, EggbombDefinition);
