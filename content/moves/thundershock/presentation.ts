/**
 * 电击 / thundershock 的客户端表现。
 *
 * 一句话：施法者嘴边一闪，一条短促的折线电弧瞬间扎到近处的人身上，在它身上缠一小簇电花；
 *   若对方早已麻痹，缠得更密更亮——一眼看出这一刺比平时更狠。
 * 色相家族：电黄（0xFFF04A）与近白（0xEAFBFF）为主，浅青绿（0xC8F0A0）只做地面环的细节。
 * 拍子：起（charge 极短攒电）→ 击（snap 瞬间电弧、jab 缠身）→ 收（blocked 引走 / whiff 打空）。
 * 范围：snap 绑在 `data.path` 上，顶点就是判定用的那条近直线——画出来的线就是电刺真正走的那条。
 * 运动：电弧沿近直线瞬间炸开，命中点向四周溅开；没有飞行过程，这正是「贴身快刺」的读法。
 * 数：`data.arcs`（由特攻派生）绑定电弧条数，`data.sparks`（由威力派生，已麻目标再乘 1.6）绑定缠身火花数，
 *   `data.intensity`（已麻更高）抬高亮度与速度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ThunderShockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 3 },
            exit: { stop: 2, drain: 8 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.4, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [3, 6], size: [0.09, 0.02],
                    color: 0xFFF04A, alpha: [0.7, 0], light: "full", maxParticles: 16
                }
            ]
        },
        snap: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "core", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 5 }, at: 1 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: { data: "intensity", fallback: 0.9 },
                    lifetime: [3, 7], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "spark", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 70, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.03, 0.14],
                    lifetime: [3, 8], size: [0.07, 0.01],
                    color: 0xFFF04A, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "detail", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "arcs", fallback: 4 }, interval: 2, repeats: 2 },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.03, 0.14], spread: 40,
                    lifetime: [4, 9], size: [0.06, 0.01],
                    color: 0xC8F0A0, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        jab: {
            duration: 24,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: { data: "intensity", fallback: 0.2 },
                    lifetime: [5, 10], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "cling", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "sparks", fallback: 10 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: { data: "intensity", fallback: 0.16 },
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xFFF04A, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "arcs", fallback: 5 } },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [9, 16], size: [0.2, 0.08],
                    color: 0xC8F0A0, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        blocked: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "shunt", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 5 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xEAFBFF, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "point", offset: [0, 0.3, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFF04A, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thundershock", 1, ThunderShockDefinition);
