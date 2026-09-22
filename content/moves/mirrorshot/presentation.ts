/**
 * 镜光射击 / mirrorshot 的客户端表现。
 *
 * 一句话：施法者的身体先像镜子一样亮起来、把光收到口边一点，随后一道细长的白蓝光矛沿准线射出去，
 *   命中处炸开一片刺目的星点；散射式下光在目标身上反出一小片扇形，溅到身后的人身上。
 * 色相家族：近白（0xFFFFFF）为主，冷蓝（0xCFE8FF）与钢灰（0x9FB4C8）为衬；彩虹星点只做强调层的小面积。
 * 拍子：起 polish（磨亮聚光）→ 射 flash（光矛）→ 击 dazzle（炸开星点）／ 折 refract ／ 空 miss → 收 linger／clear。
 * 范围：flash 用 `data.path`（射击的起点到落点）画出一条线；refract 用 `data.stages` 与固定扇形铺在目标身后。
 * 运动：光矛沿 `data.path` 直线射出、几乎瞬到；命中处星点向外炸开，残光在目标眼位慢慢暗下去。
 * 数：`data.glints`（特攻＋等级换算的光点数量）绑定各处发射量，`data.intensity`（光矛威力 / 65）放大整幕，
 *   `data.stages` 让掉命中那一下更亮，`data.scale` 让光柱按粗细变化。
 */

const MirrorshotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        polish: {
            duration: 16,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "sheen", bind: "source", offset: [0, 0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0xCFE8FF, alpha: [0.8, 0], light: "full", maxParticles: 44
                },
                {
                    name: "focus", bind: "source", offset: [0, 0.5, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.12, 0.03],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 36
                }
            ]
        },
        flash: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "lance", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    rate: { data: "glints", fallback: 16 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [6, 11], size: [0.34, 0.1], sizeMode: "sin",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "sheen", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/smallbeam",
                    rate: { data: "glints", fallback: 16 },
                    direction: "up", speed: [0.0, 0.03],
                    lifetime: [7, 12], size: [0.16, 0.04],
                    color: 0xCFE8FF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "sparks", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "glints", fallback: 16 },
                    direction: "up", speed: [0.01, 0.05], spread: 20,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xEAF4FF, alpha: [0.8, 0], light: "full", maxParticles: 120
                }
            ]
        },
        dazzle: {
            duration: 22,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "bloom", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "glints", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "stars", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "glints", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    drag: 0.94,
                    lifetime: [9, 16], size: [0.12, 0.03],
                    color: 0xCFE8FF, alpha: [0.85, 0], light: "full", maxParticles: 110
                }
            ]
        },
        refract: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "splash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "glints", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18], spread: 30,
                    drag: 0.93,
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0xEAF4FF, alpha: [0.8, 0], light: "full", maxParticles: 50
                }
            ]
        },
        linger: {
            duration: 0,
            emitters: [
                {
                    name: "glare", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.07, 0.02],
                    color: 0xCFE8FF, alpha: [0.45, 0], light: "full", maxParticles: 20
                }
            ]
        },
        clear: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "blink", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.14], spread: 26,
                    drag: 0.92,
                    lifetime: [7, 12], size: [0.07, 0.02],
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", maxParticles: 26
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "glints", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.16], spread: 34,
                    drag: 0.92,
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mirrorshot", 1, MirrorshotDefinition);
