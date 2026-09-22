/**
 * 破壳 / shellsmash 的客户端表现。
 *
 * 一句话：壳体先绷紧、接缝透出光 → 整片壳炸开、壳片向外四散并扎进地面 → 碎片在地上闪一下再黯淡。
 * 色相家族：壳白 0xE8E2D0 为主体，暖白 0xFFF6E0 落在强调层，灰褐 0x8A8374 作余韵（石屑）。
 * 拍子：起（swell 0–14t）→ 破（crack 0–26t）→ 散（shed 0–34t）→ 落（settle 0–24t）。
 * 范围：shed 的壳环绑脚点、半径按 `data.spread`，`data.scale`（实际散落半径 / 1.8）同步缩放——画面里的环
 *   就是壳片真正扎到的范围。
 * 运动：swell 光在壳缝上聚；crack 亮环向外一推；shed 壳片沿环向外飞出，速度按 `data.shatter`，随后向下沉；
 *   settle 只剩地面余烬。
 * 数：壳片数量绑 `data.shards`（体重与防御派生），单片尺度绑 `data.shardSize`，威力强弱绑 `data.intensity`。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ShellSmashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        swell: {
            duration: 14,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "seam", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.06, 0.01], sizeMode: "sin",
                    color: 0xFFF6E0, alpha: [0.55, 0], light: "full", maxParticles: 30
                }
            ]
        },
        crack: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "shards", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 16], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFF6E0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "shock_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.1, 0.24],
                    lifetime: [10, 18], size: [0.4, 0.9], sizeMode: "index",
                    color: 0xE8E2D0, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        shed: {
            duration: 34,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "plates", bind: "source", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "shards", fallback: 18 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "spread", fallback: 1.8 } },
                    direction: "outward", speed: [0.06, { data: "shatter", fallback: 0.15 }],
                    gravity: 0.05, lifetime: [18, 30], size: [{ data: "shardSize", fallback: 0.1 }, 0.02], sizeMode: "index",
                    color: 0xE8E2D0, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.1, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shards", fallback: 18 } },
                    shape: { kind: "ring", radius: { data: "spread", fallback: 1.8 } },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, lifetime: [14, 24], size: [0.06, 0.01],
                    color: 0x8A8374, alpha: [0.6, 0], light: "world", maxParticles: 80
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: 5, at: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [6, 12], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xFFF6E0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 20
                }
            ]
        },
        settle: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "shards", fallback: 18 } },
                    shape: { kind: "ring", radius: { data: "spread", fallback: 1.8 } },
                    direction: "up", speed: [0.01, 0.05],
                    gravity: 0.03, lifetime: [14, 24], size: [0.12, 0.03],
                    color: 0x8A8374, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shellsmash", 1, ShellSmashDefinition);
