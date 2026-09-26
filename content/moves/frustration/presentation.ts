/**
 * 迁怒 / frustration 的客户端表现。
 *
 * 一句话：暗色的怨气在身前攥成一簇刺团，随后贴着目标一爪接一爪地抓出去，每爪左右交替甩出一道短促的暗色抓痕与白芯，
 * 只有最后一爪明确把目标抛开（fling 沿抓击方向炸开一线），收势时余恨从身上散开。
 * 色相家族：暗紫栗（obscuringsmoke、impact_dark、slash 染暗）为主，抓痕芯是近白（impact_normal），
 * 速度线用灰紫；没有暖色。
 * 拍子：起（coil 聚恨）→ 行（rush 扑近）→ 击（rake 每爪一下、swipe 抓空）→ 抛（fling 最后一爪抛开）→ 收（spite 余恨 / miss 扑空）。
 * 范围：rake 绑施法者身前、按 `data.side` 左右交替画出每一爪真正抓到的小块；抓空的 swipe 在同一位置留一道更弱的白痕。
 * 运动：刺团从四面收进来；抓痕沿朝目标的方向甩出、很快收住；最后一爪沿顶开方向炸开一线；余恨向四周散开。
 * 数：`data.side`（左右交替）错开每一爪的落点，`data.index`（第几爪）让每爪比上一爪稍亮，`data.last` 标出末爪，
 * `data.moved`（真实推开距离）决定 fling 抛出线的长度，`data.sparks` 决定碎屑量，`data.intensity` 抬高亮度与密度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FrustrationDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 8,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "spite_gather", bind: "source", offset: [0, 0.65, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.16, 0.04],
                    color: 0x5A3149, alpha: [0.5, 0], light: "world", maxParticles: 50
                },
                {
                    name: "claw_sparks", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    burst: { count: { data: "rakes", fallback: 2 }, interval: 3, repeats: 2 },
                    shape: { kind: "box", size: [0.5, 0.4, 0.5] },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xC9A6BC, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        rush: {
            duration: 44,
            exit: { stop: 30, drain: 14 },
            emitters: [
                {
                    name: "rush_smoke", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 24, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [7, 14], size: [0.12, 0.03],
                    color: 0x4B2939, alpha: [0.45, 0], light: "world", maxParticles: 120
                },
                {
                    name: "rush_lines", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 28, shape: { kind: "box", size: [0.3, 0.45, 0.3] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [3, 7], size: [0.14, 0.04],
                    color: 0xB79AB0, alpha: [0.4, 0], light: "full", maxParticles: 120
                }
            ]
        },
        rake: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "claw_cut", bind: "source", offset: [{ data: "sideX", fallback: 0 }, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "box", size: [0.3, 0.5, 0.3], rotation: [0, 0, { data: "tilt", fallback: 0 }] },
                    direction: "outward", speed: [0.1, 0.3], spin: 140,
                    lifetime: [4, 9], size: [0.3, 0.06], sizeMode: "index",
                    color: 0x7A3B5A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "claw_core", bind: "source", offset: [{ data: "sideX", fallback: 0 }, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xF0E6EC, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 30
                },
                {
                    name: "claw_specks", bind: "source", offset: [{ data: "sideX", fallback: 0 }, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.02, drag: 0.92,
                    lifetime: [7, 14], size: [0.06, 0.02],
                    color: 0x8E6E82, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        swipe: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "whiff", bind: "source", offset: [{ data: "sideX", fallback: 0 }, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/white",
                    burst: { count: 8 },
                    shape: { kind: "box", size: [0.28, 0.4, 0.28], rotation: [0, 0, { data: "tilt", fallback: 0 }] },
                    direction: "outward", speed: [0.06, 0.18], spin: 120,
                    lifetime: [4, 8], size: [0.12, 0.02],
                    color: 0xD8CBD4, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fling: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fling_cut", bind: "point", fit: "none", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 2, at: 0 },
                    shape: { kind: "line", length: { data: "moved", fallback: 0.5 } },
                    orient: "direction", direction: "shape", speed: [0.2, 0.55], spin: 120,
                    lifetime: [4, 9], size: [0.32, 0.06], sizeMode: "index",
                    color: 0x8A4766, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 16
                },
                {
                    name: "fling_spite", bind: "point", fit: "none", offset: [0, 0.42, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 12 } },
                    shape: { kind: "line", length: { data: "moved", fallback: 0.5 } },
                    orient: "direction", direction: "shape", speed: [0.1, 0.3],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x8E6E82, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        spite: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "spite_out", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "embers", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.16],
                    drag: 0.94,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x5A3149, alpha: [0.55, 0], light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "overrun", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.03, drag: 0.93,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xA98CA0, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_frustration", 1, FrustrationDefinition);
