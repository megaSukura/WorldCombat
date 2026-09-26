/**
 * 高温重压 / heatcrash 的客户端表现。
 *
 * 一句话：施法者全身火苗卷起 → 低低扑出去、身体几乎贴着地面 → 触地后贴地滑出，身后拖出一道火擦痕 →
 * 压中的目标身上爆开火星，能被点着的则窜起明火。
 * 与重磅冲撞分开：这里是**低平**的身体与贴地滑痕，没有高跃与落点圆爆；停止后火痕很快熄灭。
 * 色相家族：暖橙到深红（flame / ember / wisp / impact_fire）为主体，焦黑（floorscorch_big / burning_rock）作地面擦痕，
 * 烟灰（smoke / tinydust）作余韵；只在核心与明火层出现高饱和橙。
 * 拍子：起（windup 蓄火）→ 扑（pounce 低弧）→ 滑（slide 贴地火线、scorch 火擦痕）→ 停（stop 余烬）→ 击（impact 压中、shove 被顶开、burn 明火）。
 * 范围：pounce／slide 绑施法者身体，跟着真实运动；scorch 绑实际贴地点，宽度按 `data.scale`（火痕宽 / 0.45）铺开。
 * 运动：扑是低平外扩的火苗，滑是贴地拖尾加地面擦痕；命中是短促外爆，明火贴目标向上窜。
 * 数：scorch 的数量绑定机制值（宽度/强度），impact 的强度绑 `data.intensity`（威力 / 90），burn 的余烬量绑 `data.embers`。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HeatCrashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "gather_flame", bind: "source", offset: [0, 0.7, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 22, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [8, 14], size: [0.16, 0.03], sizeMode: "sin",
                    alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "ember_feet", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 16, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.04, 0.14],
                    gravity: -0.01, drag: 0.94,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFB347, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        pounce: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "low_flame", bind: "source", offset: [0, 0.25, 0], height: 0.24,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 34, shape: { kind: "box", size: [0.5, 0.28, 0.5] },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: -0.01, drag: 0.95,
                    lifetime: [7, 12], size: [0.18, 0.02], sizeMode: "index",
                    color: 0xFF8A2A, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "pounce_embers", bind: "source", offset: [0, 0.16, 0], height: 0.16,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 26, shape: { kind: "sphere", radius: 0.3, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [7, 14], size: [0.06, 0.01],
                    color: 0xFFC46A, alpha: [0.8, 0], light: "full", maxParticles: 100
                }
            ]
        },
        slide: {
            duration: 40,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "ground_flame", bind: "source", offset: [0, 0.12, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 30, trail: { minDistance: 0.24 },
                    shape: { kind: "box", size: [0.5, 0.16, 0.5] },
                    direction: "outward", speed: [0.02, 0.1],
                    gravity: -0.005, drag: 0.96,
                    lifetime: [6, 11], size: [0.16, 0.02], sizeMode: "index",
                    color: 0xFF8A2A, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 140
                },
                {
                    name: "slide_embers", bind: "source", offset: [0, 0.1, 0], height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 24, trail: { minDistance: 0.2 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.04, drag: 0.94,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0xFFC46A, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        scorch: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "scorch_mark", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch_big",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "circle", radius: 0.45 },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [14, 18], size: [0.8, 0.9],
                    alpha: [0.7, 0], light: "world", maxParticles: 3
                },
                {
                    name: "scorch_ember", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 4, at: 1 },
                    shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    gravity: 0.03, drag: 0.94,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0xFFC46A, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        },
        stop: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "ash_out", bind: "source", offset: [0, 0.14, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.06, drag: 0.9,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0xFF9A3A, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "shape", speed: [0.1, 0.32],
                    lifetime: [6, 11], size: [0.42, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                },
                {
                    name: "hit_embers", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 30 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.26],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    alpha: [0.9, 0], light: "full", maxParticles: 120
                }
            ]
        },
        shove: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "pushed_ash", bind: "target", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    gravity: 0.02, drag: 0.92,
                    lifetime: [8, 14], size: [0.18, 0.28],
                    color: 0x3A302A, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        burn: {
            duration: { data: "burnTicks", fallback: 60 },
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "alight", bind: "target", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/vanilla/flame",
                    rate: { data: "embers", fallback: 26 },
                    shape: { kind: "box", size: [0.5, 0.7, 0.5] },
                    direction: "up", speed: [0.02, 0.08],
                    gravity: -0.01, drag: 0.96,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "burn_smoke", bind: "target", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "embers", fallback: 26 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    gravity: -0.005, drag: 0.96,
                    lifetime: [14, 24], size: [0.2, 0.3],
                    color: 0x3A302A, alpha: [0.3, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_heatcrash", 1, HeatCrashDefinition);
