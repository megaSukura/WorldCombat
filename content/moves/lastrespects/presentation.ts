/**
 * 扫墓 / lastrespects 的客户端表现。
 *
 * 一句话：施法者低头默立、脚下的地面裂开冷色鬼火 → 一道鬼火线连着施法者与对手、随两者移动 →
 *   走到跟前把这一扫落下：鬼火沿路升起、在落点上炸开一圈幽绿冲击 → 空扫时鬼火在终点散成一片。
 * 色相家族：幽绿鬼火（0x6BC8B0 / 0x9FE8D0 主体），暗靛（0x2E2440）作地缝与烟，白青 0xE8FFF6 只做细碎高光。
 * 拍子：起 kneel（0–10t 地缝升起鬼火）→ 行 march（鬼火线随行）→ 击 sweep／strike（沿路扫开／落点重扫）→ 收 miss。
 * 范围：sweep 用与判定同一组走廊顶点铺开（`data.path` 的四角），走廊画多宽，判定就是多宽。
 * 运动：march 的鬼火沿施法者到目标的连线随行；strike 从落点向外炸；鬼火整体向上飘、慢慢褪色。
 * 数：kneel／march／strike 的鬼火量绑 `data.ghosts`（倒下伙伴数派生，倒得越多越密），
 *   strike 的强度绑 `data.intensity`（本扫威力 / 60）。倒下的伙伴数 `data.fallen` 直接就是画面里的鬼影数。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const LastRespectsDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kneel: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "grave_wisps", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "ghosts", fallback: 3 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.02, 0.08], spin: 6,
                    lifetime: [12, 20], size: [0.2, 0.03],
                    color: 0x9FE8D0, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "grave_seam", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 10, shape: { kind: "ring", radius: 0.55, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0x2E2440, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        march: {
            duration: 60,
            exit: { stop: 42, drain: 12 },
            emitters: [
                {
                    name: "wisp_line", bind: "path", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "ghosts", fallback: 3 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.01, 0.05], spin: 6,
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0x9FE8D0, alpha: [0.75, 0], light: "full", maxParticles: 90
                },
                {
                    name: "grave_dust", bind: "path", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 24, shape: { kind: "polyline" },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xA8B8B8, alpha: [0.4, 0], light: "world", maxParticles: 90
                }
            ]
        },
        sweep: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "lane", bind: "path", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "ghosts", fallback: 3 },
                    shape: { kind: "polygon" }, direction: "up", speed: [0.02, 0.08], spin: 6,
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0x9FE8D0, alpha: [0.7, 0], light: "full", maxParticles: 140
                },
                {
                    name: "lane_edge", bind: "path", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 10, shape: { kind: "polyline", closed: true },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.24, 0.5], sizeMode: "linear",
                    color: 0x6BC8B0, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        strike: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 5, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [7, 13], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xE8FFF6, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "wisp_burst", bind: "target", offset: [0, 0.24, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "ghosts", fallback: 4 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.24], spin: 8,
                    lifetime: [10, 18], size: [0.16, 0.02],
                    color: 0x9FE8D0, alpha: [0.9, 0], light: "full", maxParticles: 90
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [9, 16], size: [0.18, 0.03],
                    color: 0x6BC8B0, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lastrespects", 1, LastRespectsDefinition);
