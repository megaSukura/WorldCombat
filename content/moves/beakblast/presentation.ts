/**
 * 鸟嘴加农炮 / beakblast 的客户端表现。
 *
 * 一句话：鸟嘴先烧到赤热，热浪在身周抖成一圈；随后一发白热的喙弹直线射出去，命中处炸开成片羽状火花；
 *   加热期间谁用身体贴上来，近身处就腾起一小簇火、把他点着。
 * 色相家族：橙金（0xFF7A2E／0xFFD06A／burning_rock／impact_fire）与白亮喙弹（0xFFF0C0／impact_flying）。
 * 拍子：起（raise 抬喙预热）→ 热（heat 赤热窗口）→ 袭（sear 接触惩罚）→ 射（fire 炮口）→ 击（burst 命中）
 *   ／失（miss）→ 收（fade）。
 * 范围：`heat` 的 `aura_ring` 用 `shape.radius: 1.6` 配 `data.scale`（加热接触半径 / 1.6）画出来，这圈热浪的半径
 *   就是「贴到多近会被烫」的机制半径——玩家一眼看出该站在哪里。
 * 运动：喙弹沿瞄准方向直线飞出；`sear` 的火在贴上来的人身上迸开。
 * 数：`heat` 的火焰量绑 `data.flames`（物攻换算出机制数），`sear`／`burst` 的迸火量绑 `data.sparks`，强度绑
 *   `data.intensity`（喙弹威力派生）；`data.progress` 让加热圈随窗口推进变亮。
 */
const BeakblastDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "preheat", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "sphere", radius: 0.2 }, direction: "up", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.14, 0.03], color: 0xFFB347, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "puff", bind: "source", offset: [0, 0.55, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 6, shape: { kind: "sphere", radius: 0.2 }, direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.16, 0.26], color: 0x3A2A22, alpha: [0.25, 0], light: "world", maxParticles: 20
                }
            ]
        },
        heat: {
            duration: { data: "heat", fallback: 34 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "aura_ring", bind: "source", fit: "none", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 3, shape: { kind: "ring", radius: 1.6 }, direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.2, 0.5], color: 0xFF7A2E, alpha: [0.4, 0], light: "world", maxParticles: 20
                },
                {
                    name: "flames", bind: "source", offset: [0, 0.62, 0], height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "flames", fallback: 20 }, shape: { kind: "sphere", radius: 0.22 }, direction: "up",
                    speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xFFD06A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "shimmer", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    rate: 12, shape: { kind: "ring", radius: 0.3 }, direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.12, 0.02], color: 0xFF8A3C, alpha: [0.7, 0], light: "full", maxParticles: 50
                },
                {
                    name: "hot_smoke", bind: "source", offset: [0, 0.62, 0], height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.24 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.18, 0.3], color: 0x4A3022, alpha: [0.22, 0], light: "world", maxParticles: 30
                }
            ]
        },
        sear: {
            duration: 30,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "ignite", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "sparks", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.08, 0.26], spread: 22,
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "cling", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.02, 0.09],
                    lifetime: [10, 18], size: [0.1, 0.02], color: 0xFF8A3C, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        fire: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "muzzle", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.1, 0.3], spread: 20,
                    lifetime: [5, 10], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 30
                },
                {
                    name: "muzzle_ember", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "sparks", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.08, 0.26], gravity: 0.06,
                    lifetime: [8, 14], size: [0.12, 0.02], color: 0xFFD06A, alpha: [0.9, 0], light: "full", maxParticles: 50
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "sparks", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.32 }, direction: "outward", speed: [0.1, 0.3], spread: 22,
                    lifetime: [7, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "scorch", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFF8A3C, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.35 }, direction: "outward", speed: [0.03, 0.12], gravity: 0.06,
                    lifetime: [9, 15], size: [0.07, 0.02], color: 0x9A8C6C, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "cool", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.25 }, direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.1, 0.02], color: 0xFF8A3C, alpha: [0.5, 0], light: "full", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_beakblast", 1, BeakblastDefinition);
