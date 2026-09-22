/**
 * 血月 / bloodmoon 的客户端表现。
 *
 * 一句话：施法者脚下红雾向内汇聚，头顶升起一轮赤红如血的满月；满月亮到极点，把全部气势化作一道垂直落下的
 *   血红光柱砸在目标脚下，地面被砸出一圈暗红焦痕，久久不散。
 * 色相家族：血红（0x8E2436、0xC23A4A）做月与光柱，暗红（0x5A1620）做地面焦痕与烟，近白粉（0xFFD9DE）只给
 *   落点那一抹闪光；整招一个色相家族。
 * 拍子：起 raise/gather（聚气与升月）→ 落 fall（月柱垂落）→ 击 impact（砸地）→ 痕 mark（焦痕余韵）。
 * 范围：fall 的柱体沿 `data.path`（月→地两点）画一条垂落的光带；impact/mark 的地面盘用 `data.radius` 画成与
 *   判定一致的一圈，`data.scale` 让画面尺寸跟着机制半径走。
 * 运动：raise 的月盘在头顶撑开、gather 的红雾向心收拢、fall 的光点沿月到地的直线加速下落、mark 的焦痕贴地不动。
 * 数：`data.motes`（特攻派生）绑定发射量，`data.intensity`（主目标威力派生）抬高亮度，`data.eclipse` 区分满月/月蚀。
 * 参照节：视觉语言第二、三、四、五、六、七、九节。
 */
const BloodmoonDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 30 },
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "disc", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 26, shape: { kind: "circle", radius: 1.1 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [10, 18], size: [1.1, 0.4], sizeMode: "sin",
                    color: 0x8E2436, alpha: [0.55, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "halo", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 12, shape: { kind: "ring", radius: 1.35, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.95,
                    lifetime: [12, 22], size: [1.6, 0.8], sizeMode: "sin",
                    color: 0xC23A4A, alpha: [0.4, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "rim", bind: "point", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 18, shape: { kind: "ring", radius: 1.25, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.1], spin: 6,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xFFD9DE, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        gather: {
            duration: { data: "windup", fallback: 30 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "inward", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 30, shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.08, 0.3], drag: 0.96,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xC23A4A, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "haze", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 8, shape: { kind: "circle", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.02, 0.06], drag: 0.94,
                    lifetime: [14, 24], size: [0.5, 0.14], sizeMode: "sin",
                    color: 0x5A1620, alpha: [0.28, 0], light: "world", maxParticles: 30
                }
            ]
        },
        moon: {
            duration: 40,
            exit: { drain: 16 },
            emitters: [
                {
                    name: "flare", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 40, shape: { kind: "circle", radius: 1.05 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.94,
                    lifetime: [10, 18], size: [1.3, 0.5], sizeMode: "sin",
                    color: 0xC23A4A, alpha: [0.6, 0], light: "full", bloom: 0.45, maxParticles: 140
                },
                {
                    name: "spill", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "motes", fallback: 22 }, at: 0 },
                    shape: { kind: "ring", radius: 1.2, rotation: [90, 0, 0] }, direction: "outward", speed: [0.08, 0.3], spread: 16,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xFFD9DE, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                }
            ]
        },
        fall: {
            duration: 34,
            exit: { drain: 14 },
            emitters: [
                {
                    name: "column", bind: "path", shape: { kind: "polyline" }, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 90, direction: "shape", speed: [0.3, 0.7], spread: 6, drag: 0.97,
                    lifetime: [6, 10], size: [0.24, 0.06],
                    color: 0xC23A4A, alpha: [0.75, 0], light: "full", bloom: 0.4, maxParticles: 180
                },
                {
                    name: "core", bind: "path", shape: { kind: "polyline" }, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 60, direction: "shape", speed: [0.35, 0.8], spread: 4, drag: 0.97,
                    lifetime: [5, 9], size: [0.12, 0.03],
                    color: 0x8E2436, alpha: [0.7, 0], light: "world", maxParticles: 140
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "motes", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 }, direction: "outward", speed: [0.12, 0.42], spread: 26,
                    lifetime: [8, 15], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFD9DE, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "ash", bind: "target", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "motes", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.6 }, direction: "outward", speed: [0.08, 0.26], spread: 30, gravity: -0.02, drag: 0.9,
                    lifetime: [14, 24], size: [0.6, 0.2], sizeMode: "sin",
                    color: 0x5A1620, alpha: [0.4, 0], light: "world", maxParticles: 70
                }
            ]
        },
        spill: {
            duration: 24,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "edge", bind: "target", offset: [0, 0.35, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: { data: "motes", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 }, direction: "outward", speed: [0.08, 0.3], spread: 24,
                    lifetime: [8, 14], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xC23A4A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 46
                }
            ]
        },
        mark: {
            duration: 30,
            exit: { stop: 16, drain: 14 },
            emitters: [
                {
                    name: "scorch", bind: "point", fit: "none", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch_big",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "point" }, direction: "up", speed: [0, 0],
                    lifetime: [24, 32], size: { data: "radius", fallback: 2 }, sizeMode: "linear",
                    color: 0x5A1620, alpha: [0.75, 0], light: "world", maxParticles: 2
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 10, shape: { kind: "ring", radius: { data: "radius", fallback: 2 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0xC23A4A, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "embers", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "circle", radius: { data: "radius", fallback: 2 } },
                    direction: "up", speed: [0.02, 0.1], spread: 12, gravity: -0.01, drag: 0.92,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0x8E2436, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "empty", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "motes", fallback: 22 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2 } }, direction: "outward", speed: [0.03, 0.14], spread: 30,
                    lifetime: [12, 20], size: [0.45, 0.12], sizeMode: "sin",
                    color: 0x5A1620, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "motes", fallback: 22 }, at: 0 },
                    shape: { kind: "circle", radius: 1.0 }, direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0x8E2436, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bloodmoon", 1, BloodmoonDefinition);
