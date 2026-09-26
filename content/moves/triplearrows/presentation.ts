/**
 * 三连箭 / triplearrows 的客户端表现。
 *
 * 一句话：压低身子后一记低扫腿只扫过脚前短区，紧接着三支箭同时离弦、各拖细亮弧线，命中处炸开钝白冲击（只被这一脚踢开护架的目标叠一层暴击星）。
 * 色相家族：箭羽的黄绿与近白（spike／glowingsparkle_yellow／impact_normal 原色）＋一处格斗暖橙（impact_fighting／foot）。
 * 拍子：起（windup 拉弦）→ 击（kick 低扫、volley 三箭齐发、hit 命中）→ 收（guard 护架缺口 / flinch 被压住）。
 * 范围：`volley` 的箭本体用物品外观（minecraft:arrow）飞行，`hit` 的炸开尺度随 `data.intensity`；`kick` 的腿弧用
 *   `data.path`（出脚真实起点→接触点/脚尖尽头）画成 polyline，长度就是这一脚真正够到的短区；玩家能数出画面里同时有几条箭线（`data.arrows`）以及散得多开（`data.spread`）。
 * 运动：低扫沿真实腿线短促扫过，三箭同时沿各自方向直线离弦、笔直飞行，命中向四周炸开，暴击在命中点留下星闪。
 * 数：`data.arrows`（箭数）绑定齐射的箭线条数，`data.stages`（踢开级数）绑定护架缺口崩出的火花量，
 *   `data.crit`（只有被这一脚踢中的目标才为 1）点亮命中处的暴击层，`data.intensity`（单支箭威力 / 32）放大整幕。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const TriplearrowsDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "nock_glow", bind: "source", offset: [0.4, 0.7, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 18, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 12], size: [0.09, 0.02],
                    color: 0xE8E8A0, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 30
                },
                {
                    name: "stance_dust", bind: "source", offset: [0, 0.12, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0x9A8A6A, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        },
        kick: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "sweep", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/foot",
                    rate: 40, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.03, 0.12], spread: 16,
                    lifetime: [7, 13], size: [0.3, 0.07], sizeMode: "index",
                    color: 0xE8C8A0, alpha: [0.85, 0], light: "full", maxParticles: 24
                },
                {
                    name: "sweep_hit", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.18], spread: 22,
                    lifetime: [6, 12], size: [0.3, 0.08], sizeMode: "index",
                    color: 0xF0C89A, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        guard: {
            duration: 22,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "guard_break", bind: "target", offset: [0, 0.7, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "stages", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.3, 0.07], sizeMode: "index",
                    color: 0xF0E8C0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        volley: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "arrow_trail", bind: "projectile", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    trail: { minDistance: 0.3 },
                    rate: 40, shape: { kind: "sphere", radius: 0.1 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [6, 10], size: [0.2, 0.04],
                    color: 0xE8F0C0, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "arrow_spark", bind: "projectile", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 22, shape: { kind: "sphere", radius: 0.08 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.07, 0.02],
                    color: 0xF4F4C8, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "arrow_hit", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "arrows", fallback: 3 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 22,
                    lifetime: [6, 12], size: [0.26, 0.06], sizeMode: "index",
                    color: 0xF0E8C8, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 30
                },
                {
                    name: "arrow_shard", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.06, drag: 0.9,
                    lifetime: [9, 16], size: [0.1, 0.02],
                    color: 0xB8C878, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "crit_star", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/vanilla/critical_hit",
                    burst: { count: { data: "crit", fallback: 0 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.24], spread: 26,
                    lifetime: [7, 13], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xFFF4A8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 20
                }
            ]
        },
        flinch: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "flinch_pin", bind: "target", offset: [0, 0.9, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.28, 0.06], sizeMode: "index",
                    color: 0xE8E8B8, alpha: [0.9, 0], light: "full", maxParticles: 20
                },
                {
                    name: "flinch_spark", bind: "target", offset: [0, 1.0, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 6, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [10, 16], size: [0.08, 0.02],
                    color: 0xD8E0A0, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_triplearrows", 1, TriplearrowsDefinition);
