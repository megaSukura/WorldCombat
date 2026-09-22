/**
 * 树叶 / leafage 的客户端表现。
 *
 * 一句话：施法者抖身撒出一把嫩叶，叶子沿瞄准方向张成一个小扇面、各走一条短弧飞出，最先扎中的那一片在目标身上
 *   炸成一蓬碎叶，其余的叶子旋落在地、积起一小撮绿屑。
 * 色相家族：嫩绿与草绿（叶的原色），落地屑用偏白的浅绿做余韵；强调点用近白。
 * 拍子：起 gather（抖叶聚拢 0–12t）→ 掷 toss（扇面迸出 0–8t）→ 飞 flight（叶随弹体弧飞，随弹体存续）
 *   → 击 hit（碎叶爆开 0–20t）／落 land（叶落地积屑 0–26t）／空 miss。
 * 范围：`data.scale`（单片判定 / 0.22）缩放叶的尺寸与落地屑量；扇面张角与叶数由 `data.spread`／`data.leaves` 读出。
 * 运动：每片叶跟随自己的弹体（`flight` 绑 `projectile`）走小弧；命中点与落点由服务端各自触发一蓬碎叶。
 * 数：`data.leaves`（速度换算的叶数）绑定起手聚拢、掷出与命中碎叶的数量，`data.intensity`（威力 / 32）放大整幕。
 */
const LeafageDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "pull_in", bind: "source", offset: [0, 0.75, 0.2], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 22, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16], spin: 8,
                    lifetime: [6, 11], size: [0.22, 0.06], sizeMode: "linear",
                    color: 0x9BD25A, alpha: [0.7, 0], light: "world", maxParticles: 34
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.7, 0.15], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 10, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.1], spin: 12,
                    lifetime: [7, 12], size: [0.16, 0.05],
                    color: 0xC6E89A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        toss: {
            duration: 8,
            exit: { stop: 3, drain: 12 },
            emitters: [
                {
                    name: "spray", bind: "source", offset: [0, 0.8, 0.35], height: 0, fit: "body", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "leaves", fallback: 6 }, at: 0 },
                    shape: { kind: "cone", radius: 0.35, angleDegrees: 22 },
                    direction: "outward", speed: [0.18, 0.5], spread: 20, spin: 10, drag: 0.98,
                    lifetime: [6, 12], size: [0.24, 0.08], sizeMode: "linear",
                    color: 0x9BD25A, alpha: [0.85, 0], light: "world", maxParticles: 30
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { stop: 0, drain: 12 },
            emitters: [
                {
                    name: "leaf", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    trail: { minDistance: 0.35 }, rate: 9, spriteFrom: "age",
                    direction: "outward", speed: [0.0, 0.03], spin: 14,
                    lifetime: [5, 10], size: [0.22, 0.08], sizeMode: "linear",
                    color: 0x9BD25A, alpha: [0.8, 0], light: "world", maxParticles: 24
                },
                {
                    name: "spark", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    trail: { minDistance: 0.55 }, rate: 5,
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.07, 0.02],
                    color: 0xE8FFC8, alpha: [0.6, 0], light: "full", maxParticles: 14
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shred", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "point" },
                    lifetime: [8, 12], size: [0.7, 0.25], sizeMode: "linear",
                    color: 0x9BD25A, alpha: [0.9, 0], light: "world", maxParticles: 4
                },
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "leaves", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.08, 0.28], spread: 32, spin: 16, drag: 0.92,
                    lifetime: [6, 13], size: [0.22, 0.08], sizeMode: "linear",
                    color: 0xC6E89A, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "chips", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "leaves", fallback: 5 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.32], spread: 40, gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.12, 0.04],
                    color: 0xE8FFC8, alpha: [0.7, 0], light: "world", maxParticles: 36
                }
            ]
        },
        land: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "leaves", fallback: 3 }, at: 0 },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.88, spin: 6,
                    lifetime: [10, 20], size: [0.12, 0.03], sizeMode: "linear",
                    color: 0x9BD25A, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "drift", bind: "source", fit: "body", offset: [0, 0.8, 0.3],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "leaves", fallback: 4 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.03, spin: 8,
                    lifetime: [10, 18], size: [0.16, 0.05],
                    color: 0xC6E89A, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_leafage", 1, LeafageDefinition);
