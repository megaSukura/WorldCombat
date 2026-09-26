/**
 * 逆鳞 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：龙气从脚下卷成赤红的旋流，顺着低头冲撞的方向甩出一条赤红走廊；撞中的一刻在目标身上炸开龙鳞火花；
 *   接连几次之后龙低下头，头顶升起一圈转个不停的眩晕气流。
 * 色相家族：赤红 0xC23B2E 与近白暖橙 0xFFE0C0 为主，低饱和灰红 0x8A5A50 只做余韵与余烬；龙与火光是一家色相。
 * 层次：蓄势内聚（tempo）→ 真实短冲轨迹＋冲势条（charge）→ 命中爆发（claw）→ 冲空尘（whiff）→ 收束眩晕（spent）→ 持续眩晕（dizzy）。
 * 范围：charge 的 `dash_path` 绑 `path`、用 `polyline` 描出这一撞身体真实走出的短段（data.path），画出的线就是被撞的范围。
 * 运动：短冲轨迹每撞按身体实际位移更新；冲势条沿 `data.direction` 指向；命中火花从目标向外炸开；眩晕气流绕着头顶转。
 * 数：服务端把 `data.grains`（龙气点数）、`data.intensity`（威力）与 `data.scale`（判定半径）交给发射器，数量和强度按机制走。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const OutrageDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tempo: {
            duration: 20,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.7, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 18, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 16], size: [0.14, 0.02],
                    color: 0xC23B2E, alpha: [0.65, 0], light: "full", maxParticles: 40
                },
                {
                    name: "snort", bind: "source", offset: [0, 1.0, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFE0C0, alpha: [0.85, 0], light: "full", maxParticles: 24
                }
            ]
        },
        charge: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "dash_path", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "grains", fallback: 16 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xC23B2E, alpha: [0.42, 0], light: "world", maxParticles: 90
                },
                {
                    name: "dash_streak", bind: "source", offset: [0, 0.55, 0], height: 0.45, fit: "body", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 10 }, shape: { kind: "line", length: 1.6 },
                    direction: "outward", speed: [0.12, 0.3], drag: 0.9,
                    lifetime: [6, 12], size: [0.5, 0.08],
                    color: 0xFFE0C0, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        claw: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "grains", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.28],
                    lifetime: [9, 16], size: [0.34, 0.06], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "scale_spark", bind: "target", height: 0.7, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 1 }, amount: 1,
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xFFE0C0, alpha: [0.9, 0], light: "full", maxParticles: 48
                },
                {
                    name: "finisher_ring", bind: "target", offset: [0, 0.1, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.12, 0.3], drag: 0.9,
                    lifetime: [12, 20], size: [0.8, 0.1], sizeMode: "sin",
                    color: 0x8A5A50, alpha: [0.5, 0], light: "world", maxParticles: 6
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "skid_dust", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [10, 18], size: [0.1, 0.01],
                    color: 0x8A5A50, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        },
        spent: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "dizzy", bind: "source", offset: [0, 1.15, 0], height: 0.2, fit: "body", spin: 12,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 10, repeats: 2, interval: 8 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [16, 26], size: [0.24, 0.06],
                    alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "sink_dust", bind: "source", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x8A5A50, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        punish: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "backlash", bind: "source", offset: [0, 0.8, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 14], size: [0.2, 0.04],
                    alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        dizzy: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "dizzy_loop", bind: "source", offset: [0, 1.15, 0], height: 0.15, fit: "body", spin: 9,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 4, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.2, 0.05],
                    alpha: [0.4, 0], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_outrage", 1, OutrageDefinition);
