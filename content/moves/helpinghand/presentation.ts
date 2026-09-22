/**
 * 帮助 / Helping Hand 的客户端表现。
 *
 * 一句话：施法者伸手，一串暖光沿两人之间飞向伙伴（reach）→ 伙伴身上亮起一层柔和的暖光并持续一会儿（ready）→
 *         伙伴下一次命中炸开一圈金亮，把这份力用掉（strike）→ 没等到出手时，暖光静静上浮散去（fade）。
 * 色相家族：暖金 0xFFD98A 作主体，奶白 0xFFF3D0 作高光；只有 strike 强调层补一点亮白。
 * 范围：reach 用 `data.path`（施法者 ↔ 伙伴）画 polyline，从谁送到谁一眼可见；路径顶点每帧跟随双方。
 * 运动：光沿两人连线飞、命中时金圈向外炸、暖光慢上浮。
 * 数：光点数 `data.motes`、兑现规模 `data.burst`、强度 `data.boost` 全部来自本招算出的机制值。
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 */
const HelpinghandDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 12 },
            emitters: [
                { name: "gather", bind: "source", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.09, 0.03],
                    color: 0xFFD98A, alpha: [0.7, 0], light: "full", maxParticles: 44 },
                { name: "gather_dust", bind: "source", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0xFFF3D0, alpha: [0.5, 0], light: "world", maxParticles: 30 }
            ]
        },
        reach: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "thread", bind: "path", offset: [0, 0.65, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "polyline" },
                    rate: 70, direction: "shape", speed: [0.02, 0.08], trail: { minDistance: 0.1 },
                    lifetime: [7, 13], size: [0.14, 0.04],
                    color: 0xFFD98A, alpha: [0.85, 0], light: "full", maxParticles: 140 },
                { name: "thread_dust", bind: "path", offset: [0, 0.6, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: 34, direction: "shape", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0xFFF3D0, alpha: [0.5, 0], light: "world", maxParticles: 90 }
            ]
        },
        ready: {
            exit: { drain: 30 },
            emitters: [
                { name: "warm_aura", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "motes", fallback: 18 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.004, 0.02], spin: 12,
                    lifetime: [18, 30], size: [0.1, 0.03],
                    color: 0xFFD98A, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 40 },
                { name: "warm_dust", bind: "target", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [16, 28], size: [0.05, 0.01],
                    color: 0xFFF3D0, alpha: [0.45, 0], alphaMode: "sin", light: "world", maxParticles: 30 }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                { name: "flare", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "burst", fallback: 36 } }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.1, 0.28], drag: 0.9,
                    lifetime: [10, 20], size: [0.22, 0.05],
                    color: 0xFFD98A, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60 },
                { name: "flare_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "burst", fallback: 36 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xFFF3D0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 70 },
                { name: "flare_ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [10, 18], size: [0.36, 0.72], sizeMode: "sin",
                    color: 0xFFD98A, alpha: [0.6, 0], light: "full", maxParticles: 16 }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                { name: "drift", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 28], size: [0.14, 0.34],
                    color: 0xFFD98A, alpha: [0.3, 0], light: "world", maxParticles: 24 },
                { name: "last_mote", bind: "target", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.008, 0.03],
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0xFFF3D0, alpha: [0.3, 0], light: "full", maxParticles: 24 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_helpinghand", 1, HelpinghandDefinition);
