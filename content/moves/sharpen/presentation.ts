/**
 * 棱角化 / sharpen 的客户端表现。
 *
 * 一句话：施法者体表先浮起一片冷冷的金属反光，随后一片片棱锋从身上「啪」地弹出、地上的石屑被带起；
 * 窗口内每次被近身撞上，就在真实的接触点炸开一撮冷白棱光；棱角钝去时它们一齐缩回、碎屑落地。
 * 色相家族：钢灰 0xC8D0DA 为主体，冷蓝 0x8FA6C4 作阴影，近白 0xEAF0F6 作锋口与反击强调。
 * 拍子：起锋（charge 0–10t）→ 弹出（jag 0–28t）→ 棱角（edge，绑 boostWindow 的持续低密度）→ 反击（cut 0–18t）→ 钝去（dull 0–22t）。
 * 范围：地面碎屑环绑脚点、fit none，半径按 `data.scale`（实际棱角半径 / 1.0）推出；体表棱锋绑施法者，随体型缩放。
 * 运动：棱锋由内向外弹出 → 锋口细光缓慢游走 → 反击时冷光在真实接触点炸开 → 钝去时碎屑下坠。
 * 数：棱角数绑 `data.spikes`（物攻/体重派生），反击强度绑 `data.edge`（棱锋威力），`data.scale` 放大范围与尺寸。
 * 持续：edge 绑在真正的棱角 boostWindow 上（服务端 `WorldFeedback.onEffect`），窗口关闭会同步收回。
 * 接触：cut 绑真实伤害回执给出的接触点（`bind: "point"`），只在真实近身接触反应时触发。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SharpenDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "cold_glint", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xEAF0F6, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        jag: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "spikes_out", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "spikes", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.28],
                    lifetime: [10, 18], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xC8D0DA, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "shards", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "spikes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.92, spin: 60,
                    lifetime: [12, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x8FA6C4, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "ground_chips", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x8FA6C4, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        edge: {
            duration: 0,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "edge_light", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 2, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [16, 28], size: [0.06, 0.02], sizeMode: "sin",
                    color: 0xC8D0DA, alpha: [0.4, 0], light: "full", maxParticles: 20
                }
            ]
        },
        cut: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "slash_back", bind: "point", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "edge", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xEAF0F6, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 60
                }
            ]
        },
        dull: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "retract", bind: "source", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.06, drag: 0.9,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x8FA6C4, alpha: [0.45, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sharpen", 1, SharpenDefinition);
