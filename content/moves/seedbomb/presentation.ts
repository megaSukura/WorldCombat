/**
 * 种子炸弹 / seedbomb 的客户端表现。
 *
 * 一句话：脚边把硬种收进荚里、高抛过顶，一枚真实种荚落地浅弹，随后在原地裂壳一次。
 * 色相家族：草绿与枯黄（grass/seed／xsseed／impact_grass 原色）＋中性尘（tinydust）＋一点近白高光（glowingsparkle）。
 * 拍子：起（windup 收种）→ 抛（toss 弧线）→ 滚（rolling 引信逐刻裂痕）→ 爆（burst／miss 开壳）→ 收（余韵淡出）。
 * 范围：burst 的落点球半径（`data.scale = 实际爆点半径 / 1.5`）与服务端判定同一球；墙能遮挡。
 * 运动：种荚沿高抛弧线飞过顶、落地浅弹；引信在荚上逐刻加深裂痕，到点原地开壳。
 * 数：`data.crackRate`/`data.crackSize`（引信进度换算）驱动滚动裂痕的密度与大小，`data.seeds`（物攻与等级换算的碎种数）
 *   绑定散种量，`data.chaff`（物攻换算的碎壳量）绑定碎屑量，`data.intensity`（整荚威力 / 80）放大整幕。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const SeedbombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        rolling:{emitters:[
            {name:"shell_cracks",bind:"projectile",fit:"none",particle:"world_combat_core:cobblemon/generic/spike",rate:{data:"crackRate",fallback:8},shape:{kind:"sphere_surface",radius:.18},lifetime:[2,4],size:[{data:"crackSize",fallback:.06},0.02],color:0xAAB84A,alpha:[.8,.1],maxParticles:60},
            {name:"shell_flicker",bind:"projectile",fit:"none",particle:"world_combat_core:cobblemon/generic/sparkle/glowingsparkle",rate:{data:"crackRate",fallback:8},shape:{kind:"sphere",radius:.14},lifetime:[2,5],size:[.06,.01],color:0xDCEFA0,alpha:[{data:"crack",fallback:0},0],light:"full",bloom:.3,maxParticles:48}
        ]},
        windup: {
            duration: 11,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "gather_seed", bind: "source", offset: [0, 0.5, 0.12], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 16, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 14], size: [0.12, 0.03],
                    alpha: [0.85, 0], light: "full", maxParticles: 34
                },
                {
                    name: "gather_chaff", bind: "source", offset: [0, 0.45, 0.12], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "sphere", radius: 0.48 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.06, 0.02],
                    color: 0x8A7A4A, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        },
        toss: {
            duration: 0,
            exit: { stop: 0, drain: 16 },
            emitters: [
                {
                    name: "pod_trail", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    trail: { minDistance: 0.22 },
                    rate: 34, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.04, drag: 0.9,
                    lifetime: [8, 15], size: [0.13, 0.03],
                    alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "shell_burst", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "chaff", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [7, 14], size: [0.3, 0.06], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "seed_scatter", bind: "point", offset: [0, 0.3, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "seeds", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.07, drag: 0.93,
                    lifetime: [12, 22], size: [0.13, 0.04],
                    alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "burst_dust", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x9A8A5A, alpha: [0.4, 0], light: "world", maxParticles: 34
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "shell_burst", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "chaff", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [7, 14], size: [0.28, 0.06], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "shell_spike", bind: "point", offset: [0, 0.3, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "seeds", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.06, drag: 0.93,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xAAB84A, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "land_scatter", bind: "point", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "seeds", fallback: 12 }, at: 0 },
                    shape: { kind: "circle", radius: 1.4 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.06, drag: 0.92,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    alpha: [0.8, 0], light: "world", maxParticles: 90
                },
                {
                    name: "land_dust", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "circle", radius: 1.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x9A8A5A, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_seedbomb", 1, SeedbombDefinition);
