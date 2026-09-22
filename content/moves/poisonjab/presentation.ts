/**
 * 毒击 / poisonjab 的客户端表现。
 *
 * 一句话：施法者站定、把一条带毒的肢体沿直线递出去，末端拖着一串毒滴；扎中的地方在对方身上炸开一小簇
 *   毒液与一圈地环，肢体随即收回；刺空只留一下滴落的毒点。
 * 色相家族：毒绿（0x9BE86B）与深紫（0x6B4E8A）为主，近白只做命中亮点。整体沿一条直线走，与飞行的毒针区分开。
 * 拍子：起 coil（聚毒）→ 伸 thrust（肢体延长）→ 中 sting（伤口溅毒）→ 收 whiff（落空淡出）。
 * 范围：thrust 的 `limb` 发射器绑 `direction` 朝目标、长度直接读 `data.reach`，画出来的那条线就是判定用的直线。
 * 运动：没有飞行物——肢体是瞬时的直线延长，命中在线的末端炸开，一眼看出是站定出臂的近身招。
 * 数：`data.swing`（由威力派生）绑定沿直线排布的毒点数量，`data.drops`（由物攻派生）绑定起手聚毒与命中溅毒量，
 *   `data.reach` 直接绑定肢体长度。画面里的数量和机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PoisonjabDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.35, 0.25], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "drops", fallback: 14 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [5, 11], size: [0.09, 0.02],
                    color: 0x9BE86B, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "sheen", bind: "source", offset: [0, 0.35, 0.25], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [4, 9], size: [0.06, 0.01],
                    color: 0xD7F5A8, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        thrust: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "limb", bind: "source", fit: "none", orient: "direction", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: { data: "swing", fallback: 8 }, at: 0 },
                    shape: { kind: "line", length: { data: "reach", fallback: 2.6 }, rotation: [0, 0, 0] },
                    direction: "shape", speed: [0.02, 0.1], gravity: 0.02, drag: 0.94,
                    lifetime: [6, 13], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x6B4E8A, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "beads", bind: "source", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "swing", fallback: 8 }, at: 0 },
                    shape: { kind: "line", length: { data: "reach", fallback: 2.6 }, rotation: [0, 0, 0] },
                    direction: "shape", speed: [0.03, 0.14], gravity: 0.04, drag: 0.92,
                    lifetime: [7, 14], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x9BE86B, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 50
                },
                {
                    name: "backdraft", bind: "source", offset: [0, 0.1, -0.2], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "away", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0xB8C88A, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        sting: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "wound", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.22], spread: 20,
                    lifetime: [5, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xD7F5A8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 30
                },
                {
                    name: "splash", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "drops", fallback: 14 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.06, drag: 0.9,
                    lifetime: [9, 17], size: [0.09, 0.02],
                    color: 0x9BE86B, alpha: [0.9, 0], light: "world", maxParticles: 70
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "swing", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [9, 16], size: [0.2, 0.07],
                    color: 0x8A6BA8, alpha: [0.55, 0], light: "world", maxParticles: 26
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "drip", bind: "point", fit: "none", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "drops", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.08, drag: 0.9,
                    lifetime: [7, 14], size: [0.07, 0.01],
                    color: 0x9BE86B, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_poisonjab", 1, PoisonjabDefinition);
