/**
 * 看穿的客户端表现。
 *
 * 一句话：朝已知威胁方向张开一道短窄的读招幕，来袭被看穿的一瞬只在入射侧炸开一圈冷蓝读纹与一个惊叹号，
 * 随后自己脚下拖出一小段速度线进入先机。
 * 色相家族：灵能冷蓝与淡紫（psyring / screen / sparkle），惊叹号与读中亮弧用同族亮白。
 * 拍子：起（focus 0–12t，短窄幕与内聚光点，微弱）→ 击（read 入射侧爆弧）→ 收（opening 短步迹，或 miss 淡去）。
 * 范围：focus 的幕与 read 的弧半径直接读 `data.reach`（机制闪光半径），并跟着 `data.direction` 转向——
 *   凝神幕朝威胁张开，读中弧则立在来袭的那一侧；画面就是读招作用的那一圈。
 * 运动：凝神时薄幕由外向内收光；读中时从入射侧炸开一圈读纹；先机的速度线只贴着脚边拖出短短几步，不再包成球壳。
 * 数：`data.power`（免除量／最大生命）决定读中亮度，`data.breakCount`（power×14）是断点火花数，`data.intensity`（先机等级／2）决定速度线密度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DetectDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        focus: {
            duration: 16,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "screen", bind: "source", offset: [0, 0.6, 0], height: 0.4, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 12, shape: { kind: "arc", radius: { data: "reach", fallback: 1.2 }, arcDegrees: 64 },
                    direction: "shape", speed: [0.0, 0.02], spin: 6,
                    lifetime: [8, 16], size: [0.42, 0.3],
                    color: 0x8FD0FF, alpha: [0.3, 0.06], alphaMode: "sin",
                    light: "full", maxParticles: 48
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0.4, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/orb/xsalphaboost",
                    rate: 18, shape: { kind: "arc", radius: { data: "reach", fallback: 1.2 }, arcDegrees: 64 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.09, 0.03], sizeMode: "index",
                    color: 0xCFE8FF, alpha: [0.7, 0], light: "full", maxParticles: 70
                }
            ]
        },
        read: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "read_arc", bind: "target", offset: [0, 0.55, 0], height: 0.4, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 2, at: 1, interval: 3 }, shape: { kind: "arc", radius: { data: "reach", fallback: 1.2 }, arcDegrees: 92 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.5, 0.14],
                    color: 0x9FB8FF, alpha: [{ data: "power", fallback: 0.85 }, 0], light: "full", bloom: 0.3
                },
                {
                    name: "flash", bind: "target", offset: [0, 0.55, 0], height: 0.4, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 14, at: 1 }, shape: { kind: "arc", radius: 0.3, arcDegrees: 92 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "mark", bind: "target", offset: [0, 0.9, 0], height: 0.4, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/exclamation",
                    burst: { count: 1, at: 2 }, shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [18, 26], size: [0.3, 0.3],
                    color: 0xEAF4FF, alpha: [1, 0], light: "full"
                },
                {
                    name: "break", bind: "target", height: 0.5, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "breakCount", fallback: 6 } }, shape: { kind: "cone", radius: 0.3, angleDegrees: 26 },
                    direction: "shape", speed: [0.1, 0.28], spin: 24,
                    lifetime: [9, 16], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xEAF4FF, alpha: [0.9, 0], light: "full", maxParticles: 50
                }
            ]
        },
        opening: {
            duration: 34,
            exit: { stop: 18, drain: 16 },
            emitters: [
                {
                    name: "steps", bind: "source", offset: [0, 0.12, 0], height: 0.2, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 22, shape: { kind: "box", size: [0.24, 0.16, 0.24] },
                    direction: "shape", speed: [0.02, 0.08], trail: { minDistance: 0.3 },
                    lifetime: [5, 9], size: [0.16, 0.05],
                    color: 0xCFE8FF, alpha: [0.6, 0], light: "full", maxParticles: 90
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fade", bind: "target", offset: [0, 0.6, 0], height: 0.4, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 16 }, shape: { kind: "arc", radius: { data: "reach", fallback: 1.2 }, arcDegrees: 120 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0x8AA0C0, alpha: [0.4, 0], gravity: 0.02, light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_detect", 1, DetectDefinition);
