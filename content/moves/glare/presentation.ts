/**
 * 大蛇瞪眼 / Glare 的客户端表现。
 *
 * 一句话：施法者昂起身体，腹部的花纹在身前张开成一片越铺越大的扇形光幕，扇形里每个被它盯住的人
 *   身上亮起一圈麻花电花，然后光幕收掉。
 * 色相家族：紫罗兰（0xB48CE8）与深紫（0x8A5CFF）撑起扇形与波纹，苍白高光（0xE0D0FF）做边缘；
 *   麻痹电黄（0xF2E24A）只出现在被镇住的人身上——那是共享麻痹身份的颜色，也是玩家读「谁被麻了」的记号。
 * 拍子：起（windup，昂首鼓纹）→ 击（sweep 扇形铺开 / caught 中招者缠电）→ 收（avert 空转消散）。
 * 范围：sweep 的发射器绑在 `data.path` 上并用 polygon 填满，顶点与判定用的 `WorldGeometry.polygon` 是同一组——
 *   画出来的那片扇形就是真正判定的那块区域；`data.reach`/`data.angle` 供 UI 提示读数。
 * 运动：花纹从施法者一侧沿扇形向外推进；`flux` 越大推进越密，`data.sweep` 决定层与层之间的间隔。
 * 数：服务端把 `rings`（花纹层数）与 `intensity`（麻痹越久越亮）交给发射器，画出的层数与亮度与机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const GlareDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "rear_up", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0xB48CE8, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "pattern_glow", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 12, shape: { kind: "cylinder", radius: 0.3, length: 0.7 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xE0D0FF, alpha: [0.7, 0], light: "full", maxParticles: 34
                }
            ]
        },
        sweep: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "fan_fill", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: { data: "flux", fallback: 54 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0xB48CE8, alpha: [0.55, 0], light: "world", maxParticles: 180
                },
                {
                    name: "fan_rim", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "rings", fallback: 4 }, interval: { data: "sweep", fallback: 3 }, repeats: 4 },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: { data: "intensity", fallback: 0.2 },
                    lifetime: [8, 15], size: [0.22, 0.05], sizeMode: "index",
                    color: 0x8A5CFF, alpha: [0.85, 0], light: "full", bloom: 0.4
                },
                {
                    name: "fan_motes", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "flux", fallback: 30 }, trail: { minDistance: 0.18 },
                    shape: { kind: "polyline" },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0xE0D0FF, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        caught: {
            duration: 26,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "caught_ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: { data: "rings", fallback: 4 }, interval: 2, repeats: 3 },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x8A5CFF, alpha: [0.9, 0], light: "full", bloom: 0.4
                },
                {
                    name: "caught_spark", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "rings", fallback: 4 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: { data: "intensity", fallback: 0.14 },
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xF2E24A, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        avert: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "avert_fade", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x8A6FB8, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_glare", 1, GlareDefinition);
