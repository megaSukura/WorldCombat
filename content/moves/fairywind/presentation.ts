/**
 * 妖精之风 / fairywind 的客户端表现。
 *
 * 一句话：施法者身侧卷起一柱粉色的香风，风打着旋沿瞄准方向扑出去、穿过一个又一个对手，每扫到一个人就在他身上
 *   炸开一圈粉色光尘并把他撩向一侧，风走到尽头散成一圈落地的香粉。
 * 色相家族：玫粉与淡紫（风与香粉），细节层用近白高光；没有第二个色相。
 * 拍子：起 gather（香风打旋聚起 0–12t）→ 发 launch（风柱迸出 0–8t）→ 飞 flight（螺旋光尘随弹体，随弹体存续）
 *   → 击 hit（粉色冲击与光尘 0–22t）→ 散 dissipate（落地香尘环 0–22t）／空 miss。
 * 范围：`data.scale`（风团判定 / 0.3）缩放风团与散开的香尘环，玩家一眼知道风有多宽。
 * 运动：风绑弹体沿直线走，命中后不停、继续穿；每个命中点由服务端触发一圈向外翻的粉色光尘。
 * 数：`data.motes`（特攻换算的香粉量）绑定飞行与散开的光尘数量，`data.hits` 叠加强调，`data.intensity`（威力 / 38）放大整幕。
 */
const FairywindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "spool", bind: "source", offset: [0, 0.85, 0.25], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 24, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16], spin: 12,
                    lifetime: [7, 12], size: [0.28, 0.1], sizeMode: "linear",
                    color: 0xF0A8D0, alpha: [0.6, 0], light: "full", maxParticles: 36
                },
                {
                    name: "fae", bind: "source", offset: [0, 0.85, 0.25], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.12, 0.04],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        launch: {
            duration: 8,
            exit: { stop: 3, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "source", offset: [0, 0.85, 0.35], height: 0, fit: "body", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.28], spread: 24, spin: 16, drag: 0.94,
                    lifetime: [6, 12], size: [0.26, 0.08],
                    color: 0xF0A8D0, alpha: [0.8, 0], light: "full", maxParticles: 26
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    trail: { minDistance: 0.3 }, rate: { data: "motes", fallback: 16 },
                    direction: "outward", speed: [0.0, 0.04], spin: 15, spriteFrom: "age",
                    lifetime: [5, 11], size: [0.34, 0.12], sizeMode: "linear",
                    color: 0xF0A8D0, alpha: [0.7, 0], light: "full", maxParticles: 44
                },
                {
                    name: "dust", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    trail: { minDistance: 0.5 }, rate: 8,
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.14, 0.05],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 22
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "point" },
                    lifetime: [8, 12], size: [0.75, 0.28], sizeMode: "linear",
                    color: 0xF0A8D0, alpha: [0.9, 0], light: "full", maxParticles: 4
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0, repeats: 2, interval: 4 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 16], size: [0.6, 0.18], sizeMode: "linear",
                    color: 0xF0A8D0, alpha: [0.5, 0], light: "full", maxParticles: 6
                },
                {
                    name: "sparkle", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "motes", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.07, 0.3], spread: 34, spin: 12, drag: 0.9,
                    lifetime: [7, 14], size: [0.16, 0.05], sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 48
                }
            ]
        },
        dissipate: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                    burst: { count: 2, at: 0 },
                    shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.0, 0.04], drag: 0.9,
                    lifetime: [12, 20], size: [0.7, 0.25], sizeMode: "linear",
                    color: 0xF0A8D0, alpha: [0.35, 0], light: "world", maxParticles: 8
                },
                {
                    name: "motes", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "motes", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.01, drag: 0.92,
                    lifetime: [10, 18], size: [0.12, 0.04],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "thin", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [8, 14], size: [0.12, 0.04],
                    color: 0xF0A8D0, alpha: [0.5, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fairywind", 1, FairywindDefinition);
