/**
 * 垃圾射击 / gunkshot 的客户端表现。
 *
 * 一句话：施法者把一大团脏垃圾压进身体、炮口聚起碎屑，轰的一声直线射出去；炮弹拖着垃圾点飞，
 *   撞上就炸开一大蓬碎屑、把目标顶得往后滑，撞空就在地面砸出一摊垃圾。
 * 色相家族：污泥绿与深绿灰（ooze / mudsplash / mudbubble）为主体，白亮只在炮口与命中强调的那一下。
 * 拍子：起（load 压弹聚屑）→ 轰（blast 炮口爆屑、flight 拖尾）→ 中（hit 炸开 / whiff 落地）。
 * 范围：hit 的炸开按 `data.scale`（弹体判定派生）画出；whiff 的落点在弹道尽头。
 * 运动：炮弹沿服务端算好的直线飞（projectile 绑定尾迹），碎屑受重力向外迸、落地弹跳。
 * 数：`data.chunks`（物攻派生）决定炮口、弹道与命中的碎屑数量，`data.intensity`（威力派生）决定命中的亮度与尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const GunkshotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        load: {
            duration: 20,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "compress", bind: "source", offset: [0, 0.55, 0.4], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: { data: "chunks", fallback: 18 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1], spread: 26,
                    lifetime: [8, 15], size: [0.18, 0.05],
                    color: 0x6E8C3A, alpha: [0.8, 0], light: "world", maxParticles: 36
                },
                {
                    name: "crumbs", bind: "source", offset: [0, 0.5, 0.38], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    rate: 10, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.12], spread: 30,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x5E7A30, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        blast: {
            duration: 16,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "muzzle", bind: "source", offset: [0, 0.5, 0.5], height: 0.5,
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "cone", radius: 0.5, angleDegrees: 26 },
                    direction: "shape", speed: [0.1, 0.34], spread: 16,
                    lifetime: [8, 16], size: [0.34, 0.06], sizeMode: "index",
                    color: 0x9AA08C, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "debris", bind: "source", offset: [0, 0.5, 0.5], height: 0.5,
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "chunks", fallback: 18 }, at: 1 },
                    shape: { kind: "cone", radius: 0.45, angleDegrees: 30 },
                    direction: "shape", speed: [0.12, 0.4], spread: 22,
                    gravity: 0.09, drag: 0.9,
                    lifetime: [8, 18], size: [0.12, 0.02],
                    color: 0x6E8C3A, alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        flight: {
            duration: 60,
            exit: { stop: 52, drain: 14 },
            emitters: [
                {
                    name: "wake", bind: "projectile", trail: { minDistance: 0.28 },
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: { data: "chunks", fallback: 18 },
                    direction: "away", speed: [0.02, 0.08], spread: 18,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0x6E8C3A, alpha: [0.6, 0], light: "world", maxParticles: 44
                },
                {
                    name: "dust", bind: "projectile", trail: { minDistance: 0.32 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, direction: "away", speed: [0.02, 0.06], spread: 24,
                    lifetime: [5, 10], size: [0.06, 0.01],
                    color: 0x9AA08C, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        hit: {
            duration: 28,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 16
                },
                {
                    name: "shrapnel", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "chunks", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.34], spread: 22,
                    gravity: 0.1, drag: 0.9,
                    lifetime: [10, 22], size: [0.14, 0.02],
                    color: 0x6E8C3A, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "goo", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: { data: "chunks", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.2], spread: 24,
                    gravity: 0.08, drag: 0.9,
                    lifetime: [12, 24], size: [0.16, 0.03],
                    color: 0x5E7A30, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        whiff: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "splat", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "chunks", fallback: 18 }, at: 1 },
                    shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.06, 0.24], spread: 20,
                    gravity: 0.1, drag: 0.9,
                    lifetime: [10, 20], size: [0.14, 0.02],
                    color: 0x6E8C3A, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "puff", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.1],
                    drag: 0.9,
                    lifetime: [12, 22], size: [0.3, 0.05],
                    color: 0x9AA08C, alpha: [0.45, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gunkshot", 1, GunkshotDefinition);
