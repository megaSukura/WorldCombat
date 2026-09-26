/**
 * 刷刷茶炮 / matchagotcha 的客户端表现。
 *
 * 一句话：盏里搅起一圈绿汽与茶泡 → 一颗茶泡拖着绿沫飞出 → 落点炸开一片茶汤泡沫、圈内每个目标都被绿沫溅到，
 *   身上冒起热气，被烫到的人窜出一簇橙火。
 *
 * 色相家族：抹茶绿（0x8CBF3F／0x5E8A24）与奶沫近白（0xE8F3C0）；橙火（0xE2531B）只在 scald 一幕进入，
 *   因为灼伤是这招与家族其他成员真正区别开的那件事。
 * 拍子：起 windup（搅茶起汽）→ 飞 jet（茶泡尾迹）→ 泼 splash（落点茶沫轮廓 + 命中核心）→ 抽 drain（回血）
 *   ／ scald（橙火与热气）。飞行被取消时茶泡直接消失，不补泼。
 * 范围：splash 的环按 `data.burst`（机制溅射半径）铺开，圈多大就是烫到多大；`data.whisk` 让刷泡式的圈明显更开。
 * 运动：jet 的茶泡沿 `data.velocity` 直飞、拖出绿沫尾迹；splash 的泡沫自落点向外摊开、边落边带重力。
 * 数：`data.motes`（茶炮威力与汲取比例换算）决定泡沫与茶点密度，`data.hits`（烫到几个人）让范围命中数从画面读出，
 *   `data.intensity` 随威力抬升亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const MatchaGotchaDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "whisk_steam", bind: "source", height: 0.75, offset: [0, 0, 0.2],
                    particle: "world_combat_core:cobblemon/generic/steamfast_center",
                    rate: 16, shape: { kind: "ring", radius: 0.28, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08], spin: 24,
                    lifetime: [8, 14], size: [0.22, 0.05],
                    color: 0xE8F3C0, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "whisk_broth", bind: "source", height: 0.7, offset: [0, 0, 0.22],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble_broth",
                    rate: 12, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.10, 0.02],
                    color: 0x8CBF3F, alpha: [0.75, 0], light: "world", maxParticles: 30
                },
                {
                    name: "leaf_flecks", bind: "source", height: 0.75, offset: [0, 0, 0.18],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 8, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.09], spin: 30,
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0x5E8A24, alpha: [0.7, 0], light: "world", maxParticles: 20
                }
            ]
        },
        jet: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "brew_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble_broth",
                    trail: { minDistance: 0.26 }, rate: 26,
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [5, 10], size: [0.3, 0.16],
                    color: 0x9CCB4F, alpha: [0.95, 0], light: "full", maxParticles: 32
                },
                {
                    name: "brew_tail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    trail: { minDistance: 0.22 }, rate: 18,
                    direction: "velocity", speed: [0.02, 0.06], spread: 20, spin: 30, gravity: 0.03, drag: 0.94,
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0x8CBF3F, alpha: [0.7, 0], light: "world", maxParticles: 50
                },
                {
                    name: "brew_foam", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 }, rate: 14,
                    direction: "velocity", speed: [0.01, 0.06], spread: 26, gravity: 0.04, drag: 0.94,
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xE8F3C0, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        splash: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "tea_disc", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble_broth",
                    burst: { count: 22 }, shape: { kind: "ring", radius: { data: "burst", fallback: 1.4 } },
                    direction: "outward", speed: [0.06, 0.26], spread: 14,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [9, 16], size: [0.14, 0.03],
                    color: 0x8CBF3F, alpha: [0.8, 0], light: "world", maxParticles: 90
                },
                {
                    name: "tea_edge", bind: "point", fit: "none", offset: [0, 0.14, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 10], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xE8F3C0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "tea_foam", bind: "point", fit: "none", offset: [0, 0.28, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 20 } }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.24], spread: 26, gravity: 0.04, drag: 0.9,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xE8F3C0, alpha: [0.85, 0], light: "world", maxParticles: 70
                }
            ]
        },
        drain: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.02, 0.09], spread: 10,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0x5E8A24, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "line", length: { data: "span", fallback: 3 } },
                    rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.13, 0.34], spread: 9,
                    lifetime: [6, 13], size: [0.09, 0.01],
                    color: 0x9CCB4F, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 70
                }
            ]
        },
        scald: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "scald_steam", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 16, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.18, 0.04],
                    color: 0xE8F3C0, alpha: [0.35, 0], light: "world", maxParticles: 30
                },
                {
                    name: "scald_embers", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.2], spread: 24, gravity: 0.03, drag: 0.94,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xE2531B, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_matchagotcha", 1, MatchaGotchaDefinition);
