/**
 * 黏黏网 / stickyweb 的客户端表现。
 *
 * 一句话：口边先拢起一缕黏丝，随后一团丝被抛出去、落地摊成几张交叉黏线，线就是真正的判定带；有目标踩到
 * 某条线时，那处丝缠向脚边并留下一段拖丝，网孔保持透明可辨。
 * 色相家族：丝白偏米（0xF2EAC0）为主、虫绿（0xA8C46A）只出现在丝屑与踩中高光的小面积上。
 * 拍子：起（windup 拢丝）→ 抛（throw 抛出 / spread 落地散开）→ 黏（snare 踩中 / strand 拖丝）→ 收（随效果结束淡出）。
 * 范围：spread 是 `bind:"point"`、`fit:"none"`，只做一次中心爆开，不画实心圆盘；网线由独立 scene 按真实线段绘制。
 * 数：`data.strands`（特攻派生）决定丝屑密度，`data.stages`（减速级数）决定踩中时丝的缠绕量，`data.scale` 控制尺寸。
 */
const StickyWebDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "silk", bind: "source", offset: [0, 0.5, 0.3], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 14, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.09], spin: 14,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xF2EAC0, alpha: [0.7, 0], maxParticles: 40
                }
            ]
        },
        throw: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wad", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 22, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.02, 0.07], spread: 18, spin: 22,
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0xF2EAC0, alpha: [0.85, 0], maxParticles: 50
                },
                {
                    name: "wisps", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 2, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0, 0.02],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xA8C46A, alpha: [0.45, 0], maxParticles: 40
                }
            ]
        },
        spread: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "puff", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "strands", fallback: 18 } },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.03, 0.1], spin: 12,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0xF2EAC0, alpha: [0.65, 0], maxParticles: 90
                },
                {
                    name: "dew", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xFFFFFF, alpha: [0.4, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "loose", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], spin: 10,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xF2EAC0, alpha: [0.5, 0], maxParticles: 20
                }
            ]
        },
        snare: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "bind", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 2, interval: 3, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.06, 0.18],
                    lifetime: [8, 16], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF2EAC0, alpha: [0.9, 0], maxParticles: 40
                },
                {
                    name: "coils", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "strands", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xA8C46A, alpha: [0.8, 0], maxParticles: 50
                }
            ]
        },
        strand: {
            emitters: [
                {
                    name: "tug", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 5, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.01, 0.05], spin: 6,
                    lifetime: [10, 18], size: [0.09, 0.25],
                    color: 0xF2EAC0, alpha: [0.32, 0], maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stickyweb", 1, StickyWebDefinition);

// 真实网线：按服务端裁剪后的线段顶点逐条画线，线就是判定带，网孔保持透明；绑定在 field 效果上，随它存续/清理。
WorldCombatClient.scene("world_combat:move_stickyweb_web", 1, function (frame) {
    const entry: CombatSceneEntry<{ segments: number[][]; radius: number; threads: number; band: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const segments = entry.data.segments || [];
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        frame.line(segment[0], segment[1], segment[2], segment[3], segment[4], segment[5], 0xCCF2EAC0);
    }
});
