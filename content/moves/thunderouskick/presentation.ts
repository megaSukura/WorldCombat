/**
 * 雷鸣蹴击 / thunderouskick 的客户端表现。
 *
 * 一句话：身上窜起电光后，施法者以几道电光残影在目标身侧来回闪步，最后从一侧撞上去踢出一脚，
 * 踢中的地方炸开黄白电火，目标护架上崩出一圈缺口火花。
 * 色相家族：电光的黄与白（electricity_yellow／electricity_white／glowingsparkle_cyan 原色＋近白高光）＋一处格斗暖橙（impact_fighting）。
 * 拍子：起（windup 聚电）→ 击（blink 残影、kick 踢实）→ 收（guard 缺口 / miss 踢空）。
 * 范围：`kick` 绑命中点，用 `data.path`（出脚真实起点→真实接触点）拉出一条 polyline 电光条，长度就是这一脚真正的接触区；
 *   `blink` 的残影只在服务端真正走动的每一步发一次，沿 `data.direction`（这一步真实位移方向）拉出电光条，玩家看得见绕步绕向哪一侧。
 * 运动：电光从脚边窜起、残影沿位移方向拖尾、踢实整片电火外爆、护架缺口从接触点向上崩开。
 * 数：残影的条数就是真实的成功绕步（服务端每成功一步发一次，不按计划次数），`data.stages`（实际踢开级数）绑定缺口火花量，
 *   `data.blind` 让分神时的那一脚更亮，`data.intensity`（威力 / 90）放大整幕。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const ThunderouskickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "charge_spark", bind: "source", offset: [0, 0.25, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 24, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 11], size: [0.14, 0.03],
                    color: 0xF4E27A, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "charge_glow", bind: "source", offset: [0, 0.12, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 14, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 12], size: [0.08, 0.02],
                    color: 0xD8F0FF, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 26
                }
            ]
        },
        blink: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "dashline", bind: "source", offset: [0, 0.5, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 3, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [6, 10], size: [0.34, 0.1],
                    color: 0xF8F0A0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 20
                },
                {
                    name: "afterimage", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.16], spread: 20,
                    lifetime: [6, 11], size: [0.18, 0.04],
                    color: 0xE8F8FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 30
                }
            ]
        },
        kick: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "kick_arc", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 46, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [6, 10], size: [0.3, 0.08],
                    color: 0xF8F0A0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 40
                },
                {
                    name: "kick_core", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.46 },
                    direction: "outward", speed: [0.06, 0.24], spread: 24,
                    lifetime: [6, 12], size: [0.46, 0.12], sizeMode: "index",
                    color: 0xF8F4C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 30
                },
                {
                    name: "kick_fist", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2], spread: 22,
                    lifetime: [7, 13], size: [0.4, 0.1], sizeMode: "index",
                    color: 0xF0C89A, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 26
                },
                {
                    name: "kick_spark", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.22], spread: 26,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xF4E27A, alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        guard: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "guard_break", bind: "target", offset: [0, 0.7, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: { data: "stages", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 15], size: [0.34, 0.08], sizeMode: "index",
                    color: 0xFFF0B0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 24
                },
                {
                    name: "guard_spark", bind: "target", offset: [0, 0.8, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "stages", fallback: 1 }, at: 0, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xE8E8A0, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 12], size: [0.1, 0.02],
                    color: 0xD8E8F0, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thunderouskick", 1, ThunderouskickDefinition);
