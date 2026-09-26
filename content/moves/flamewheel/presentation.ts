/**
 * 火焰轮 / flamewheel 的客户端表现。
 *
 * 一句话：身体蜷成一团火轮、卷着向前滚，轮缘的火一路旋转碾过挡路的东西；滚完展开时身上腾起一圈热气。
 * 色相家族：橙（0xF08030）与暗红（0xC03818），轮缘高光近白（0xFFE8A0）。
 * 拍子：蜷 curl（收火成轮）→ 滚 roll（火轮旋转前进）→ 行 wake（余焰）→ 碾 impact（每次命中）→ 化 thaw（自身解冻）→ 熄 fizzle（空滚）。
 * 范围：roll 的滚动线沿 `data.path` 两顶点铺成一条火带（横向按 `data.scale` 缩放），画的就是碾过的区域。
 * 运动：轮缘粒子绕身体轴自转（`spin`）并向前滚；wake 沿路径留下慢慢暗下去的火。
 * 数：`data.flames`（速度派生）决定火星与命中的密度，`data.intensity`（本次伤害派生，后续目标按碾过占比递减）决定命中亮度，
 * `data.fierce`（1 表示烈焰轮）在起手多压一圈更暗的火；thaw 一幕只在实际解除冰冻时由服务端触发。
 */
const FlamewheelDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        curl: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 18, shape: { kind: "sphere_surface", radius: 0.7 }, direction: "inward", speed: [0.06, 0.2],
                    lifetime: [7, 13], size: [0.32, 0.1],
                    color: 0xF08030, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "rim", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 6, shape: { kind: "ring", radius: 0.55 }, direction: "outward", speed: [0.03, 0.1],
                    spin: 26, lifetime: [8, 14], size: [0.3, 0.5],
                    color: 0xFFE8A0, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 26
                },
                {
                    // fierce=1（烈焰轮）时先压一圈更暗更厚的火，读出来的滚动比疾风轮更沉。
                    name: "fierce", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "fierce", fallback: 0 }, repeats: 6, interval: 1 },
                    shape: { kind: "sphere_surface", radius: 0.6 }, direction: "outward", speed: [0.04, 0.14],
                    lifetime: [9, 16], size: [0.36, 0.12],
                    color: 0xC03818, alpha: [0.7, 0], light: "full", bloom: 0.22, maxParticles: 40
                }
            ]
        },
        roll: {
            duration: 44,
            exit: { stop: 24, drain: 14 },
            emitters: [
                {
                    name: "track", bind: "path", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    shape: { kind: "polyline" },
                    rate: { data: "flames", fallback: 22 }, speed: [0.03, 0.12], spread: 20,
                    lifetime: [7, 13], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xF08030, alpha: [0.68, 0], light: "full", bloom: 0.3, maxParticles: 220
                },
                {
                    name: "wheel", bind: "source", offset: [0, 0.42, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "flames", fallback: 22 }, shape: { kind: "torus", radius: 0.5, thickness: 0.18 },
                    direction: "shape", speed: [0.08, 0.3], spin: 34, drag: 0.9,
                    lifetime: [6, 11], size: [0.32, 0.08], sizeMode: "index",
                    color: 0xF08030, alpha: [0.8, 0], light: "full", bloom: { data: "intensity", fallback: 0.3 }, maxParticles: 130
                },
                {
                    name: "rim", bind: "source", offset: [0, 0.42, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 8, shape: { kind: "ring", radius: 0.5 }, direction: "outward", speed: [0.05, 0.18],
                    spin: 40, lifetime: [6, 12], size: [0.28, 0.46],
                    color: 0xFFE8A0, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "flames", fallback: 22 }, shape: { kind: "sphere", radius: 0.48 },
                    direction: "away", speed: [0.1, 0.38], spread: 22, drag: 0.9,
                    lifetime: [5, 9], size: [0.11, 0.02],
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 90
                }
            ]
        },
        wake: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "after", bind: "source", offset: [0, 0.16, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "flames", fallback: 22 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "away", speed: [0.02, 0.1], drag: 0.9, gravity: -0.01,
                    lifetime: [9, 16], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xC03818, alpha: [0.55, 0], light: "full", bloom: 0.2, maxParticles: 110
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "flames", fallback: 22 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.1, 0.32], spread: 16,
                    lifetime: [7, 13], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFFE8A0, alpha: [0.95, 0], light: "full", bloom: { data: "intensity", fallback: 0.5 }, maxParticles: 160
                },
                {
                    name: "roll_off", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "flames", fallback: 22 } },
                    shape: { kind: "sphere_surface", radius: 0.44 }, direction: "outward", speed: [0.1, 0.34],
                    drag: 0.9, lifetime: [8, 15], size: [0.34, 0.08], sizeMode: "index",
                    color: 0xF08030, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 150
                },
                {
                    name: "smoke", bind: "target", offset: [0, 0.65, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.45 }, direction: "up",
                    speed: [0.02, 0.1], gravity: -0.02, drag: 0.9,
                    lifetime: [14, 24], size: [0.36, 0.14],
                    color: 0x6A5B52, alpha: [0.32, 0], light: "world", maxParticles: 40
                }
            ]
        },
        thaw: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "melt", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "thawed", fallback: 1 }, repeats: 10, interval: 1 },
                    shape: { kind: "sphere_surface", radius: 0.45 }, direction: "outward", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.2, 0.03],
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "die", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.44 }, direction: "outward",
                    speed: [0.03, 0.12], gravity: 0.02, drag: 0.9,
                    lifetime: [7, 14], size: [0.09, 0.01],
                    color: 0xC03818, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flamewheel", 1, FlamewheelDefinition);
