/**
 * 愤怒门牙 / superfang 的客户端表现。
 *
 * 一句话：门牙并拢、在施法者与目标之间牵起一条量线 → 沿直线扑出、脚边扬尘 → 咬中的一刻骨白牙影炸开、
 * 目标脚下收拢一圈金环并崩出一层与"被削去的血量"同量的金屑 → 咬住一小会儿再松口。
 * 色相家族：淡金（0xE8DCA0）与骨白（0xF4EEDC）＋中性尘；饱和金只出现在咬中峰值与量线的小面积。
 * 拍子：起 windup（口边聚光）→ 量 measure（那条量线）→ 扑 pounce → 咬 bite（峰值）／ miss → 削 sever（收口强调）。
 * 范围：measure 的 path 就是施法者到目标的真实连线；bite／sever 绑命中目标，画出的就是这一口咬中的位置与大小。
 * 运动：量线由近及远扫过；sever 的金环从外向内收拢、金屑向外崩开，读作"生命被削去一层"。
 * 数：`data.morsels`（咬出伤害派生）决定咬中迸溅量，`data.shards`（实际削去量派生）决定 sever 的崩屑量，
 * `data.intensity`（伤害 / 18）抬高亮度；`data.gap`（量线读数 = 目标当前生命）随载荷送入，供调试读取。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SuperfangDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "fang_gather", bind: "source", offset: [0, 0.48, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 11], size: [0.07, 0.02],
                    color: 0xE8DCA0, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 34
                }
            ]
        },
        measure: {
            duration: 22,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "gauge_line", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "shape", speed: [0.02, 0.08], spread: 6,
                    lifetime: [6, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xE8DCA0, alpha: [0.5, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "gauge_tick", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/flat",
                    rate: 10, shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 10], size: [0.12, 0.03],
                    color: 0xF4EEDC, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        pounce: {
            duration: 26,
            exit: { stop: 18, drain: 12 },
            emitters: [
                {
                    name: "pounce_dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 28, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xD8CCA8, alpha: [0.5, 0], light: "world", maxParticles: 130
                },
                {
                    name: "pounce_gleam", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 22, shape: { kind: "box", size: [0.3, 0.26, 0.3] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [3, 7], size: [0.15, 0.04],
                    color: 0xF0E4B8, alpha: [0.4, 0], light: "full", maxParticles: 110
                }
            ]
        },
        bite: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "fang_frames", bind: "target", height: 0.48,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: 5, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.15],
                    lifetime: [6, 10], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF4EEDC, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 22
                },
                {
                    name: "bite_spark", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "morsels", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [5, 10], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xE8DCA0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                }
            ]
        },
        sever: {
            duration: 28,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "sever_ring", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/flat",
                    burst: { count: 22, at: 0 },
                    shape: { kind: "ring", radius: 0.62, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.06, 0.22],
                    lifetime: [8, 14], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xE8DCA0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "sever_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "shards", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.06, 0.24],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [7, 14], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xF4EEDC, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xD8CCA8, alpha: [0.5, 0], light: "world", maxParticles: 56
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_superfang", 1, SuperfangDefinition);
