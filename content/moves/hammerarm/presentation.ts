/**
 * 臂锤 / hammerarm 的客户端表现。
 *
 * 一句话：施法者把整条手臂抡过头顶、拳边聚起斗气 → 一记横挥重砸落在目标身上炸开拳劲与碎土，拳面把地面
 *   砸出一圈放射状裂痕 → 惯性带得自己踉跄，身上浮起疲软的灰气。
 * 色相家族：拳劲的暖橙（impact_fighting／bigfist／hollowfist）为主体，土褐（earth／tinydust）作地面裂尘，
 *   中性灰（0x9A968C）只用在踉跄余韵；无第二色相。
 * 拍子：起 hoist（举臂聚气）→ 击 slam（拳面炸开）→ 裂 cleft（地面裂痕）→ 收 stagger（踉跄）／失 miss（扑空）。
 * 范围：单体近身，slam 的爆点与 cleft 的裂环都按 `data.radius`（裂痕半径）与 `data.scale` 铺开，
 *   裂环就是会被砸裂的那圈地面。
 * 运动：slam 的拳劲从命中点向外崩、碎土带重力落回；cleft 的裂尘贴地向外扩；stagger 的灰气缓慢上飘。
 * 数：`data.dents`（体重与物攻换算的裂地量）决定碎屑与裂尘量，`data.intensity`（威力 / 100）抬高密度与亮度，
 *   `data.speedLoss`（自身速度下降级）决定踉跄灰气的量。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const HammerarmDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        hoist: {
            duration: { data: "windup", fallback: 14 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "arm_rise", bind: "source", offset: [0, 1.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    rate: 20, shape: { kind: "arc", radius: 0.7, arcDegrees: 160, rotation: [0, 0, 40] },
                    direction: "inward", speed: [0.04, 0.16], spin: 10,
                    lifetime: [7, 13], size: [0.24, 0.05],
                    color: 0xE8A24A, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "gather", bind: "source", offset: [0, 1.7, 0.2], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 14, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 11], size: [0.13, 0.03],
                    color: 0xF6C271, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        slam: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fist", bind: "point", fit: "none", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.14, 0.34],
                    lifetime: [7, 12], size: [0.5, 0.08], sizeMode: "index",
                    alpha: [1, 0], light: "full", maxParticles: 24
                },
                {
                    name: "hit", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "dents", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.08, 0.3], spread: 28,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF6C271, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "chips", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dents", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.26], spin: 12, spread: 30,
                    gravity: 0.08, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x8C7448, alpha: [0.8, 0], light: "world", maxParticles: 80
                }
            ]
        },
        cleft: {
            duration: 24,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "crack_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.1 } },
                    direction: "outward", speed: [0.09, 0.26],
                    lifetime: [10, 18], size: [0.5, 1.2], sizeMode: "sin",
                    color: 0xD9C79A, alpha: [0.55, 0], light: "world", maxParticles: 6
                },
                {
                    name: "rubble", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "dents", fallback: 10 }, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.1 } },
                    direction: "up", speed: [0.05, 0.2], spin: 10, spread: 24,
                    gravity: 0.09, drag: 0.9,
                    lifetime: [12, 22], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xA89878, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dents", fallback: 10 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.1 } },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.05, drag: 0.92,
                    lifetime: [12, 20], size: [0.06, 0.02],
                    color: 0x8C7448, alpha: [0.4, 0], light: "world", maxParticles: 80
                }
            ]
        },
        stagger: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fatigue", bind: "source", offset: [0, 0.6, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "fatigue", fallback: 16 } },
                    shape: { kind: "box", size: [0.5, 0.6, 0.5] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x9A968C, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "circle", radius: 0.8 },
                    direction: "outward", speed: [0.03, 0.13],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x8C7448, alpha: [0.4, 0], light: "world", maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hammerarm", 1, HammerarmDefinition);
