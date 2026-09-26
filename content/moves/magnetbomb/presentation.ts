/**
 * 磁铁炸弹 / magnetbomb 的客户端表现。
 *
 * 一句话：施法者身前磁光聚起，几枚钢弹被磁力拽着拐向对手，一碰到就吸在它身上轻轻振动、引信火花闪动，
 * 一道随剩余引信收缩的光环保住它，随后在它身上炸开一圈钢色冲击与碎屑；没吸住的会消散，撞墙的粘在撞点走同一段引信。
 * 色相家族：钢灰（0x9AA4AE）与近白（0xDDE4EA），引信与爆炸心用一点火橙（0xE8A24F）表示「要炸了」。
 * 拍子：起（load 上磁）→ 发（launch 发射、seek 吸弹、stick 吸住、charge 附着引信）→ 击（blast 爆炸、splash 溅射）／空（fade）。
 * 范围：blast 的爆环半径由 `data.scale`（爆炸半径 / 1.2）给出，玩家看出这一炸罩住多大一圈。
 * 运动：seek 的钢弹沿 projectile 锚点被磁力拉向对手；charge 的钢弹随实际锚点移动；blast 向外炸开。
 * 数：`data.count`（弹数）绑定 launch 的发射量，`data.trail`（每弹威力换算）绑定 seek 的尾迹，
 *   `data.notes`（威力换算的碎屑数）绑定 blast 的数量，`data.intensity` 抬高亮度。
 *   附着光环由自定义场景 `world_combat:magnetbomb_fuse` 逐帧按 `data.remaining / data.fuse` 收缩，实体与墙面用同一锚点。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const MagnetbombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        load: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "field", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 20, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xB8C2CC, alpha: [0.7, 0], light: "full", maxParticles: 50
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [5, 11], size: [0.08, 0.02],
                    color: 0xDDE4EA, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        launch: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst_orb", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: { data: "count", fallback: 3 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.14, 0.34], spread: 10,
                    lifetime: [6, 12], size: [0.24, 0.08], sizeMode: "index",
                    color: 0x9AA4AE, alpha: [0.95, 0], light: "full", maxParticles: 40
                },
                {
                    name: "burst_spark", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "count", fallback: 3 } },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xDDE4EA, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 40
                }
            ]
        },
        seek: {
            duration: 40,
            exit: { stop: 34, drain: 8 },
            emitters: [
                {
                    name: "bomb_body", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: { data: "trail", fallback: 20 }, shape: { kind: "sphere", radius: 0.1 },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [4, 9], size: [0.2, 0.1],
                    color: 0x9AA4AE, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "bomb_trail", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "trail", fallback: 20 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.25 },
                    lifetime: [5, 10], size: [0.08, 0.02],
                    color: 0xDDE4EA, alpha: [0.8, 0], light: "full", maxParticles: 140
                }
            ]
        },
        stick: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "stuck", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: 3 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "shape", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.16, 0.05],
                    color: 0x9AA4AE, alpha: [0.9, 0], light: "full", maxParticles: 20
                },
                {
                    name: "fuse", bind: "point", offset: [0, 0.62, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 2, interval: 4, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.12 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [4, 8], size: [0.09, 0.02],
                    color: 0xE8A24F, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 20
                }
            ]
        },
        charge: {
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "held", bind: "point", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 7, shape: { kind: "sphere", radius: 0.1 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.16, 0.05],
                    color: 0x9AA4AE, alpha: [0.9, 0], light: "full", maxParticles: 16
                },
                {
                    name: "fuse", bind: "point", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "sphere", radius: 0.08 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [4, 8], size: [0.08, 0.02],
                    color: 0xE8A24F, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 18
                }
            ]
        },
        blast: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "notes", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xB8C2CC, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 110
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "notes", fallback: 16 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.1, 0.3], spread: 24, gravity: 0.04, drag: 0.9, spin: 120,
                    lifetime: [9, 17], size: [0.12, 0.02],
                    color: 0x9AA4AE, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 18], size: [0.36, 0.14],
                    color: 0x8A939C, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        splash: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "splash_core", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xB8C2CC, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        fade: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dissipate", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [7, 14], size: [0.07, 0.02],
                    color: 0x9AA4AE, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_magnetbomb", 1, MagnetbombDefinition);

// 引信光环：每帧按剩余引信收缩，跟着标记效果的实际锚点（实体身上或撞墙点）。
WorldCombatClient.scene("world_combat:magnetbomb_fuse", 1, function (frame) {
    const entry: CombatSceneEntry<{ radius: number; fuse: number; remaining: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data;
    const fuse = data.fuse > 0 ? data.fuse : 1;
    const left = Math.max(0, Math.min(1, data.remaining / fuse));
    const radius = Math.max(0.08, data.radius * (0.3 + 0.7 * left));
    const alpha = Math.max(0x22, Math.min(0xCC, Math.round(0x22 + 0xAA * left)));
    frame.ring(entry.position[0], entry.position[1], entry.position[2], radius, (alpha << 24) | 0xE8A24F);
});
