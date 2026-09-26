/**
 * 甩肉 / filletaway 的客户端表现。
 *
 * 一句话：身侧一道横斩光划过 → 血肉被甩出去、在脚边铺开一圈 → 身上浮起一层淡淡的暖白轮廓，表示身体更轻更快。
 * 色相家族：血肉红 0xC0483A 为主体，暖白 0xFFD8C0 作斩光与细节，收势只留很淡的蒸汽。
 * 拍子：起（windup 0–6t）→ 击（carve 1–18t）→ 收（afterglow 18–34t）。
 * 范围：carve 绑施法者自身，血肉向四周铺开的半径按 `data.scale`（散落半径 / 2）画出——铺多开就是甩出去多远。
 * 运动：横斩光扫过身体，血肉沿随机水平方向带重力抛出并落地，暖白轮廓向上缓慢离场。
 * 数：`data.intensity`（实际支付 / 最大生命 / 0.5）抬高斩光与血屑的量；服务端按体重逐块甩出，
 *     `data.chunks` 就是画面的块数——重个体削下的更多、甩得更远。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const FilletAwayDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 8,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "brace_glint", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 10, shape: { kind: "line", length: 0.7, rotation: [0, 0, 90] },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [6, 10], size: [0.1, 0.03],
                    color: 0xFFD8C0, alpha: [0.65, 0], light: "full", maxParticles: 24
                }
            ]
        },
        carve: {
            duration: 34,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "slash_light", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 4, at: 1 },
                    shape: { kind: "line", length: 1.2, rotation: [0, 0, 90] },
                    direction: "outward", speed: [0.15, 0.35],
                    lifetime: [6, 10], size: [0.9, 0.3], sizeMode: "index",
                    color: 0xFFD8C0, alpha: [0.95, 0], light: "full", bloom: 0.4
                },
                {
                    name: "flesh_scatter", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 70 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.1, 0.34],
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0xC0483A, alpha: [0.85, 0], gravity: 0.06, drag: 0.86, light: "world", maxParticles: 200
                },
                {
                    name: "blood_arc", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 40 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [8, 14], size: [0.13, 0.02],
                    color: 0xFF8A78, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 140
                },
                {
                    name: "carve_dust", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.4, 0.14],
                    color: 0xC0483A, alpha: [0.5, 0], light: "world"
                }
            ]
        },
        afterglow: {
            duration: 34,
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "light_body", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    rate: 5, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 32], size: [0.14, 0.02], sizeMode: "sin",
                    color: 0xFFE2C8, alpha: [0.26, 0], alphaMode: "sin", light: "full", maxParticles: 18
                },
                {
                    name: "steam", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 4, shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 24], size: [0.2, 0.05],
                    color: 0xE0D0C8, alpha: [0.16, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_filletaway", 1, FilletAwayDefinition);
