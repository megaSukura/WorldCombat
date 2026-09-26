/**
 * 秘剑・千重涛 / ceaselessedge 的客户端表现。
 *
 * 一句话：壳刃抽出的刹那刃身浮起珠光 → 一刀斜掠朝瞄准方向切过 → 刀锋落点的贝壳碎片插成一圈，层数越斩越多、圈越亮；
 *   贴地目标真踏进来/跨过边界时那一处崩起碎片（tread），留在圈里只轻轻刮一下（graze）。
 * 色相家族：珠贝白 0xEAF6F2 与青贝光 0x9FE8DC 为主，深螺壳绿 0x2E4A46 只压在刃痕与圈底作轮廓；没有第二个色相。
 * 拍子：起（windup 聚珠光）→ 斩（slash 斜掠刃痕）→ 留（lay 碎片插开、按层数亮起同心层）→
 *   驻（hum 低鸣／tread 踏中／graze 轻刮）→ 收。
 * 范围：lay 与 hum 绑 `point`、`fit:"none"`，用 `data.radius` 画圈、`data.layerRadius` 画当前层数的那一道圈；
 *   slash 用 `data.path` 画那道斜痕。
 * 运动：起手珠光向内收；斩击沿刃痕从一角拉到对角、碎片向外崩开插地；踩中时碎片向上翻起再落下，轻刮只带一层薄屑。
 * 数：`data.shards`（物攻派生）决定碎片密度、`data.layers`（锋利层数）决定同心层亮点数、`data.gleam`（层数派生亮度）抬亮整圈，
 *   `data.scale`（半径/参考 2.2）控制尺寸，`data.fresh` 让踏入的第一刀比轻刮明显更重。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const CeaselessedgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "shell_glint", bind: "source", offset: [0, 0.55, 0.34], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 14, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.1], spin: 20,
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0x9FE8DC, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "edge_mist", bind: "source", offset: [0, 0.55, 0.36], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/white",
                    rate: 8, shape: { kind: "line", length: 0.7, rotation: [0, 0, 90] },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [7, 13], size: [0.24, 0.04],
                    color: 0xEAF6F2, alpha: [0.6, 0], light: "full", maxParticles: 18
                }
            ]
        },
        slash: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "edge", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: 46, direction: "shape", speed: [0.04, 0.16], spread: 10,
                    lifetime: [5, 11], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xEAF6F2, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "shred", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 30, direction: "shape", speed: [0.05, 0.2], spread: 14, spin: 18,
                    lifetime: [6, 12], size: [0.24, 0.03],
                    color: 0x9FE8DC, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        lay: {
            duration: 32,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "open_ring", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 34 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.22, 0.5],
                    color: 0xEAF6F2, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "layer_ring", bind: "point", offset: [0, 0.14, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "layers", fallback: 1 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "layerRadius", fallback: 2.2 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0x9FE8DC, alpha: [{ data: "gleam", fallback: 0.55 }, 0], light: "full", maxParticles: 24
                },
                {
                    name: "splinters", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    burst: { count: { data: "shards", fallback: 22 }, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.04, 0.18], spread: 14, spin: 30,
                    lifetime: [10, 20], size: [0.18, 0.04],
                    color: 0xCFE8E0, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "settle", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 30 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0x9FE8DC, alpha: [0.45, 0], maxParticles: 70
                }
            ]
        },
        hum: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 12, shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.004, 0.03],
                    lifetime: [14, 24], size: [0.16, 0.38],
                    color: 0xCFE8E0, alpha: [0.26, 0], maxParticles: 50
                },
                {
                    name: "layer", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: { data: "layers", fallback: 1 }, shape: { kind: "ring", radius: { data: "layerRadius", fallback: 2.2 } },
                    direction: "up", speed: [0.003, 0.02],
                    lifetime: [14, 24], size: [0.14, 0.34],
                    color: 0x9FE8DC, alpha: [{ data: "gleam", fallback: 0.4 }, 0], light: "full", maxParticles: 40
                },
                {
                    name: "shells", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    rate: { data: "shards", fallback: 22 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.004, 0.03], spread: 18, spin: 14,
                    lifetime: [14, 26], size: [0.16, 0.34],
                    color: 0xEAF6F2, alpha: [0.32, 0], light: "full", maxParticles: 110
                },
                {
                    name: "glint", bind: "point", offset: [0, 0.14, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "layers", fallback: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.002, 0.02],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x9FE8DC, alpha: [{ data: "gleam", fallback: 0.45 }, 0], light: "full", maxParticles: 30
                }
            ]
        },
        tread: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "kick", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "shards", fallback: 14 }, interval: 3, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.08, 0.24], spread: 18,
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xEAF6F2, alpha: [1, 0], maxParticles: 40
                },
                {
                    name: "flip", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    burst: { count: { data: "shards", fallback: 10 } },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.2], spin: 34,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0xCFE8E0, alpha: [0.85, 0], maxParticles: 50
                }
            ]
        },
        // 留在圈里的轻刮：只有一层薄屑贴着脚边，不亮出踏中那记脚伤。
        graze: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shave", bind: "target", height: 0.18,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: { data: "shards", fallback: 6 }, at: 1 },
                    shape: { kind: "ring", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], spin: 20,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xCFE8E0, alpha: [0.5, 0], maxParticles: 24
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "vital", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.32], spin: 24,
                    lifetime: [5, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 40
                },
                {
                    name: "shells", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.26], spin: 30,
                    lifetime: [7, 14], size: [0.14, 0.03],
                    color: 0x9FE8DC, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "spill", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    burst: { count: { data: "shards", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.04, spin: 24,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8FAAA4, alpha: [0.5, 0], maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ceaselessedge", 1, CeaselessedgeDefinition);
