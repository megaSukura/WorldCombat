/**
 * 自我激励 / workup 的客户端表现。
 *
 * 一句话：低头的施法者把火星从四面收进胸口 → 猛地一攥拳，一圈暖热的火从身上窜起来 → 若这一下是背水，
 * 火色转深红、再来一圈更亮的爆发；之后一小段时间火星在身上慢慢上浮，表示这口气还没散。
 * 色相家族：暖橙 0xFF7A3C 为主体，近白 0xFFE0C0 作高光，背水时加入深红 0xC8302A 的强调层。
 * 拍子：起（gather 0–10t，可被中断随动作清理）→ 击（flare 0–26t；背水换 backfoot 0–32t）→ 收（resolve 低密度续期）。
 * 范围：以自身为心的小范围爆发，脚下环半径约 0.45 格，正好是这股火气罩住自己的范围。
 * 运动：起势向内收、爆发向外上窜、余韵贴身上浮。
 * 数：爆发与余韵的粒子量绑 `data.surge`（物攻 + 特攻派生），背水另绑 `data.comeback` 切换更亮的强调层。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const WorkupDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 10,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "intake", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.14, 0.04],
                    color: 0xFF7A3C, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xFFE0C0, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        flare: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    burst: { count: { data: "surge", fallback: 24 } },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.26], drag: 0.9,
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0xFF8A42, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "embers", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "surge", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.06, 0.2], gravity: 0.02,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xFFB060, alpha: [0.85, 0], light: "full", maxParticles: 100
                },
                {
                    name: "ring", bind: "source", offset: [0, 0.08, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 16], size: [0.3, 0.7], sizeMode: "sin",
                    color: 0xFFD9A8, alpha: [0.6, 0], light: "full", maxParticles: 14
                }
            ]
        },
        backfoot: {
            duration: 32,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "back_burst", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    burst: { count: { data: "surge", fallback: 24 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.1, 0.3], drag: 0.88,
                    lifetime: [10, 20], size: [0.24, 0.05],
                    color: 0xC8302A, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 130
                },
                {
                    name: "back_embers", bind: "source", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "surge", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.08, 0.26], gravity: 0.015,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0xFF6A3C, alpha: [0.9, 0], light: "full", maxParticles: 110
                },
                {
                    name: "back_ring", bind: "source", offset: [0, 0.08, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 5 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [12, 18], size: [0.4, 0.9], sizeMode: "index",
                    color: 0xFFD0A0, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        resolve: {
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "aura", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "surge", fallback: 24 },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 28], size: [0.1, 0.03],
                    color: 0xFF9A50, alpha: [0.32, 0], alphaMode: "sin", light: "full", maxParticles: 40
                },
                {
                    name: "last_grit", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0xFFD9A8, alpha: [0.3, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_workup", 1, WorkupDefinition);
