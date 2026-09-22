/**
 * 吸血 / leechlife 的客户端表现。
 *
 * 一句话：口器张开、暗红血光在口边聚起 → 扑上去咬住，接触点炸开暗红碎屑与血珠 → 一道血线一直连在两张嘴之间，
 *   一拍一拍把血从对手身上抽回施法者，目标跑开时血线「啪」地断开。
 *
 * 色相家族：暗红（0xB0303A／0x6E1B24）与近白（0xF2D7C0）；近白只给咬口核心与血珠高光，无第二色相。
 * 拍子：起 windup（聚血光）→ 咬 bite（入口峰值）→ 吸 draw ×N（每拍一道血线）／脱 snap（钩子断开）→ 空 miss（扑空）。
 * 范围：bite 以 `data.scale`（口器判定 / 0.4）铺开接触点；draw 的 path 把对手与施法者连成实线，线的形状就是机制的持续抽吸。
 * 运动：draw 的血珠沿 `data.direction` 从目标一端收向施法者；`data.intensity` 随每拍抽量抬升速度与亮度。
 * 数：`data.draw`／`data.draws`（第几拍、共几拍）让玩家数得出还剩几口；`data.motes`（咬口与抽量换算）决定血珠密度；
 *   `data.deep` 让深咬式在画面里更浓。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const LeechLifeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "blood_gather", bind: "source", height: 0.7, offset: [0, 0, 0.22],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 14, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.10, 0.01],
                    color: 0xB0303A, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 26
                }
            ]
        },
        bite: {
            duration: 20,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "bite_core", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [6, 10], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF2D7C0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "fang_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.24], spread: 24, spin: 40,
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0x6E1B24, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "bite_mark", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/bite",
                    burst: { count: 2 }, shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xB0303A, alpha: [0.85, 0], light: "full", maxParticles: 6
                }
            ]
        },
        draw: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "tether", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/drip",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.03, 0.12], spread: 8,
                    lifetime: [7, 14], size: [0.10, 0.02],
                    color: 0x6E1B24, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "line", length: { data: "span", fallback: 2.4 } },
                    rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.14, 0.34], spread: 9,
                    lifetime: [5, 12], size: [0.09, 0.02],
                    color: 0xB0303A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 80
                },
                {
                    name: "sip_pulse", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "draw", fallback: 1 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.10, 0.02],
                    color: 0xF2D7C0, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 12
                },
                {
                    name: "mend", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "intensity", fallback: 1 },
                    shape: { kind: "sphere", radius: 0.18 }, direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.12, 0.01],
                    color: 0xB0303A, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 20
                }
            ]
        },
        snap: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "snap_burst", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], spread: 30,
                    lifetime: [7, 13], size: [0.12, 0.02],
                    color: 0xB0303A, alpha: [0.9, 0], light: "world", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.6, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x9A8E74, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_leechlife", 1, LeechLifeDefinition);
