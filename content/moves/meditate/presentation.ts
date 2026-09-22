/**
 * 瑜伽姿势 / meditate 的客户端表现。
 *
 * 一句话：施法者身侧的紫光点先向内收拢、亮起，一圈圈灵环从脚边沿身体升到头顶、越升越白，
 * 最后一道灵光从体内顶出把沉睡的力顶醒；此后一段时间，身侧每隔几拍浮起一环极淡的气息，提示入静还在。
 * 色相家族：灵紫 0xB39DDB 为主体，亮紫 0x9C6ADE 与近白 0xF0EAFF 作强调；收尾用灰紫 0x8E7CC3 沉下去。
 * 拍子：沉息（inhale 0–14t）→ 唤醒（awaken 0–32t）→ 入静（stillness，持续低密度）→ 收息（settle 0–22t）。
 * 范围：地面灵环绑脚点、fit none，半径按 `data.scale`（实际灵环半径 / 1.2）推出；身侧灵环绑施法者，随体型缩放。
 * 运动：光点向内收 → 灵环上升 → 灵光由内向外顶、余烬下沉。
 * 数：灵光量绑 `data.motes`（特攻派生），唤醒层数绑 `data.gift`（1 或 2，安静时更高），
 *   `data.scale` 同时放大整片范围与粒子尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const MeditateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "breath_in", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xB39DDB, alpha: [0.6, 0], light: "full", maxParticles: 42
                },
                {
                    name: "calm_dots", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xE8DEFF, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        awaken: {
            duration: 32,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "ascend", bind: "source", offset: [0, 0.15, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 5, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [16, 24], size: [0.3, 0.62], sizeMode: "index",
                    color: 0xC7B6F5, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "sparkles", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xF0EAFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 96
                },
                {
                    name: "body_surge", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: 10, at: 1 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [14, 22], size: [0.22, 0.7], sizeMode: "linear",
                    color: 0x9C6ADE, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 44
                },
                {
                    name: "ground_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 7 },
                    shape: { kind: "ring", radius: 1.2 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.4, 0.72], sizeMode: "index",
                    color: 0x9C6ADE, alpha: [0.55, 0], light: "world", maxParticles: 26
                }
            ]
        },
        stillness: {
            duration: 0,
            exit: { stop: 8, drain: 22 },
            emitters: [
                {
                    name: "aura", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 2, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 36], size: [0.07, 0.02], sizeMode: "sin",
                    color: 0xB39DDB, alpha: [0.35, 0], light: "full", maxParticles: 18
                }
            ]
        },
        settle: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "dissipate", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.06], gravity: 0.01, drag: 0.93,
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0x8E7CC3, alpha: [0.4, 0], light: "world", maxParticles: 44
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_meditate", 1, MeditateDefinition);
