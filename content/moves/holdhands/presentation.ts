/**
 * 牵手 / Hold Hands 的客户端表现。
 *
 * 一句话：两只宝可梦手上聚起心光（windup）→ 一条粉色的心形链子把两人连起来（clasp）→
 *   链子持续亮着、两端各自浮起心光（warm／mark）→ 走远时链子当场崩断、心光四散（snap）→
 *   正常到点则心光缓缓升散（fade）。
 * 色相家族：暖粉 0xFF9FBF 作主体，奶白粉 0xFFE0EC 作高光；链子用偏紫的 0xE0A0D8 作暗部。
 * 范围：warm 用 `data.path`（施法者 ↔ 伙伴）画 polyline，链子拉到哪里、哪天会断一眼可读；尺寸随 `data.scale`。
 * 运动：心光沿两人连线跳动、双端各自上浮、崩断时向外散落。
 * 数：心光数 `data.motes` 与链子尺度 `data.scale` 来自本招算出的机制值。
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 */
const HoldhandsDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 12 },
            emitters: [
                { name: "gather", bind: "source", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.05], spin: 6,
                    lifetime: [7, 13], size: [0.16, 0.05],
                    color: 0xFF9FBF, alpha: [0.8, 0], light: "full", maxParticles: 40 },
                { name: "gather_dust", bind: "source", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.32 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0xFFE0EC, alpha: [0.5, 0], light: "world", maxParticles: 26 }
            ]
        },
        clasp: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                { name: "ribbon", bind: "path", offset: [0, 0.6, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    shape: { kind: "polyline" },
                    rate: 50, direction: "shape", speed: [0.015, 0.06], trail: { minDistance: 0.12 },
                    lifetime: [8, 14], size: [0.14, 0.05],
                    color: 0xFF9FBF, alpha: [0.9, 0], light: "full", maxParticles: 110 },
                { name: "burst", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 15], size: [0.1, 0.03],
                    color: 0xFFE0EC, alpha: [0.9, 0], light: "full", maxParticles: 40 }
            ]
        },
        warm: {
            exit: { drain: 26 },
            emitters: [
                { name: "link", bind: "path", offset: [0, 0.58, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 16 }, direction: "shape", speed: [0.01, 0.04], spin: 4,
                    lifetime: [14, 22], size: [0.09, 0.03],
                    color: 0xFF9FBF, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 36 }
            ]
        },
        mark: {
            exit: { drain: 24 },
            emitters: [
                { name: "heart", bind: "target", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 8, shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.008, 0.03], spin: 5,
                    lifetime: [16, 26], size: [0.1, 0.03],
                    color: 0xFF9FBF, alpha: [0.45, 0], alphaMode: "sin", light: "full", maxParticles: 22 }
            ]
        },
        snap: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                { name: "broken", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xFF9FBF, alpha: [0.9, 0], light: "full", maxParticles: 34 },
                { name: "broken_dust", bind: "target", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.04,
                    lifetime: [8, 16], size: [0.05, 0.02],
                    color: 0xE0A0D8, alpha: [0.6, 0], light: "world", maxParticles: 30 }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                { name: "drift", bind: "target", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04], spin: 3,
                    lifetime: [16, 28], size: [0.12, 0.24],
                    color: 0xFF9FBF, alpha: [0.3, 0], light: "world", maxParticles: 24 },
                { name: "last_heart", bind: "target", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.035],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xFFE0EC, alpha: [0.3, 0], light: "full", maxParticles: 20 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_holdhands", 1, HoldhandsDefinition);
