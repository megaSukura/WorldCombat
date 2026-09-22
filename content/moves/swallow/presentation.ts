/**
 * 吞下 / swallow 的客户端表现。
 *
 * 一句话：身上那层琥珀光壳先被吸向喉咙、沉进身体，随后一圈暖金色的回光从体内荡开、把伤口填上；
 * 慢咽时分三口小回，每口在身侧浮起一小簇金光。色相家族：琥珀 0xF0B23A 为主体，暖金 0xFFD37A 作回光，
 * 近白 0xFFF3D0 只在满层回报时作强调。拍子：含住（hold 0–16t）→ 化开（wash 0–30t）→ 慢咽（sip 0–20t）→ 收（fade 0–20t）。
 * 范围：回光地面环绑施法者、fit none，半径按 `data.scale`（实际回光半径 / 1.4）推出；回波本身即机制范围。
 * 运动：光壳向内收进身体 → 回光沿地面向外荡开 → 金黄余点缓缓上浮。
 * 数：回光量绑 `data.motes`（特防/等级派生），回波强度绑 `data.healed`/`data.intensity`（机制派生的实际回复量），
 *   层数绑 `data.layers`（攒了几层决定回光有多旺）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const SwallowDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        hold: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "shell_in", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    rate: 26, shape: { kind: "sphere_surface", radius: 0.65 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xF0B23A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        wash: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "heal_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 9 },
                    shape: { kind: "ring", radius: 1.4 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: [0.42, 0.78], sizeMode: "index",
                    color: 0xFFD37A, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "body_bloom", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [12, 22], size: [0.2, 0.6], sizeMode: "linear",
                    color: 0xF0B23A, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "rise_motes", bind: "source", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "circle", radius: 0.6 },
                    direction: "up", speed: [0.04, 0.14], gravity: -0.005, drag: 0.95,
                    lifetime: [14, 24], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xFFF3D0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 96
                }
            ]
        },
        sip: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "small_gulp", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "circle", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.1], gravity: -0.004, drag: 0.95,
                    lifetime: [10, 18], size: [0.08, 0.02], sizeMode: "index",
                    color: 0xFFD37A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "warm_dust", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.06], gravity: 0.01, drag: 0.92,
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xF0B23A, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_swallow", 1, SwallowDefinition);
