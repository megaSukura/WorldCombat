/**
 * 血月 / bloodmoon 的客户端表现。
 *
 * 一句话：施法者脚下红雾向内汇聚，身前上方升起一轮赤红如血的满月；满月亮到极点，把全部气势推成一道粗直的
 *   血红月束沿锁定方向射出去，命中处炸开一抹近白粉的闪光，同线后排依次亮起同样的落点；放完之后施法者身上留下
 *   一层暗红的禁复标识，说明要换招才能恢复。
 * 色相家族：血红（0x8E2436、0xC23A4A）做月与月束，暗红（0x5A1620）做残烟，近白粉（0xFFD9DE）只给命中那一抹闪光；
 *   整招一个色相家族。
 * 拍子：起 raise/gather（升月与聚气）→ 凝 moon（满月亮到极点）→ 束 beam（粗月束直射）→ 击 impact/spill（首敌与后排）
 *   → 空 miss（射入空地/墙面）→ 禁 spent（窗口标识）。
 * 范围：beam 沿 `data.path`（束起→束止两点）画一道粗直光带，宽度按 `data.radius`；束止由方块截断结果给出。
 * 运动：raise 的月盘在身前上方撑开、gather 的红雾向心收拢、beam 的光点沿束直线铺开、spent 的暗环贴着施法者缓慢收束。
 * 数：`data.motes`（特攻派生）绑定发射量，`data.intensity`（首敌威力派生）抬高亮度，`data.eclipse` 区分满月/月蚀，
 *   `data.linger` 绑定额外余韵时长。
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
                    name: "rim", bind: "point", fit: "none",
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
        beam: {
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
                },
                {
                    name: "muzzle", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.1, 0.34], spread: 26,
                    lifetime: [6, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFD9DE, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "motes", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 }, direction: "outward", speed: [0.12, 0.42], spread: 26,
                    lifetime: [8, 15], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFD9DE, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "ash", bind: "point", offset: [0, 0.3, 0],
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
                    name: "edge", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: { data: "motes", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 }, direction: "outward", speed: [0.08, 0.3], spread: 24,
                    lifetime: [8, 14], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xC23A4A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 46
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
                    shape: { kind: "circle", radius: { data: "radius", fallback: 0.6 } }, direction: "outward", speed: [0.03, 0.14], spread: 30,
                    lifetime: [12, 20], size: [0.45, 0.12], sizeMode: "sin",
                    color: 0x5A1620, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        spent: {
            duration: { data: "linger", fallback: 100 },
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "seal", bind: "source", offset: [0, 0.1, 0], height: 0.1, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 5, shape: { kind: "ring", radius: 0.55, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.06], drag: 0.94,
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0x8E2436, alpha: [0.45, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dim", bind: "source", offset: [0, 0.5, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 6, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.95,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0x5A1620, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bloodmoon", 1, BloodmoonDefinition);
