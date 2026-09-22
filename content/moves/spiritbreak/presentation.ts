/**
 * 灵魂冲击 / spiritbreak 的客户端表现。
 *
 * 一句话：施法者身上收拢起一层压人的妖精气势 → 低头裹着粉色气流贴地冲出去，拖出两道冲刺线 →
 *   撞上对手的那一下炸开一朵妖精冲击花并把人推得踉跄 → 冲击点向外扩出一圈粉色光环。
 * 色相家族：妖精粉（0xF58CB8／0xFFD1E8）为主体，近白只给撞击高光。
 * 拍子：起 windup（收势）→ 冲 rush（贴地冲锋）→ 撞 smash（命中爆发）→ 余 aura（冲击点光环）。
 * 范围：单体接触招；判定是冲锋走廊，aura 的圆环半径读 `data.radius`（判定半径与冲击尺度的派生），
 *   玩家一眼看出撞的是身前那一条。
 * 运动：施法者沿瞄准方向贴地推进（服务端位移），气势粒子沿冲锋方向被甩在身后；光环从冲击点向外扩。
 * 数：光环碎光数量绑定 `data.sparks`（物攻与等级派生），掉特攻级数绑定 `data.drop`，强度绑定
 *   `data.intensity`（单发威力 / 75）。
 */
const SpiritbreakDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 18, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12], spin: 16,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xF58CB8, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "aura", bind: "source", offset: [0, 0.75, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    rate: 10, shape: { kind: "sphere", radius: 0.44 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0xFFD1E8, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        rush: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dash", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 40, shape: { kind: "box", size: [0.5, 0.6, 0.5] },
                    direction: "away", speed: [0.05, 0.2], spin: 6,
                    lifetime: [5, 10], size: [0.3, 0.08],
                    color: 0xF58CB8, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "pulse", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "sparks", fallback: 16 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "away", speed: [0.04, 0.18], spread: 20, drag: 0.9,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xFFD1E8, alpha: [0.85, 0], light: "full", maxParticles: 80
                }
            ]
        },
        smash: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: { data: "sparks", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3], spread: 28,
                    lifetime: [7, 14], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFD1E8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "shove", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "sparks", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.04, drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xF58CB8, alpha: [0.9, 0], light: "full", maxParticles: 80
                }
            ]
        },
        aura: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.18, 0.5], spread: 6,
                    lifetime: [8, 16], size: [0.3, 0.9],
                    color: 0xF58CB8, alpha: [0.6, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "sparks", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 20], size: [0.09, 0.01],
                    color: 0xFFD1E8, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spiritbreak", 1, SpiritbreakDefinition);
