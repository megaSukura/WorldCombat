/**
 * 替身 / substitute 的客户端表现。
 *
 * 一句话：一处微光在脚边收紧 → 落点炸出一具半透明的血盾剪影并立在那里 → 每次被打中都在它身上弹开一小圈
 * → 打碎时向外抛散，或被时间收走时淡去。
 * 色相家族：骨白／冷灰为主（xsfadeorb、smallring、tinydust、smoke），只有承伤与成形强调用一点暗红。
 * 拍子：起（windup 0–8t）→ 击（form 1–20t）→ 收（present 持续 / absorb 每次承伤 / break、expire 20–30t）。
 * 范围：windup 收在施法者脚边；form、present 绑在替身所在的那一格——玩家一眼看到血盾站在哪，就知道攻击会被引到哪；
 *        absorb 绑在替身身上，画的就是「这一下由它承受」。
 * 运动：光从施法者身上挤向落点并向外炸开；成形后本体静止，只有缓慢上浮的余韵；承伤时向内收一圈、再弹开。
 * 数：`data.scale`（替身耐久 / 最大生命 1/4）缩放 form 与 present 的轮廓；`data.intensity`（本次承受 / 最大生命）
 *     抬高 absorb 的亮度与数量——挨得越重，画面越猛。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const SubstituteDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "draw_in", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 14, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xD9DCE6, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "life_ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 20, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.07],
                    lifetime: [10, 16], size: [0.34, 0.1],
                    color: 0xB06A7A, alpha: [0.4, 0], light: "full"
                }
            ]
        },
        form: {
            duration: 34,
            exit: { stop: 20, drain: 18 },
            emitters: [
                {
                    name: "form_burst", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xE8EAF2, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "body_fill", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: 26 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.34, 0.14], sizeMode: "sin",
                    color: 0x9AA0B0, alpha: [0.55, 0], alphaMode: "sin", light: "full", maxParticles: 60
                },
                {
                    name: "form_ring", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.4, 0.14],
                    color: 0xB06A7A, alpha: [0.5, 0], light: "world"
                },
                {
                    name: "form_dust", bind: "point", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 36 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xC9CBD6, alpha: [0.55, 0], gravity: 0.03, drag: 0.9, light: "world", maxParticles: 90
                }
            ]
        },
        present: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "shield_pulse", bind: "point", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [20, 30], size: [0.3, 0.12], sizeMode: "sin",
                    color: 0x9AA0B0, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 12
                },
                {
                    name: "shield_motes", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [18, 28], size: [0.08, 0.02],
                    color: 0xD9DCE6, alpha: [0.28, 0], light: "full", maxParticles: 14
                }
            ]
        },
        absorb: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "absorb_flash", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 40 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0xF0C6CE, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "absorb_ring", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [8, 13], size: [0.3, 0.1],
                    color: 0xB06A7A, alpha: [0.7, 0], light: "full"
                }
            ]
        },
        break: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "break_core", bind: "point", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE8EAF2, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "break_shards", bind: "point", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 46 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xC9CBD6, alpha: [0.75, 0], gravity: 0.05, drag: 0.88, light: "world", maxParticles: 120
                },
                {
                    name: "break_puff", bind: "point", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [14, 24], size: [0.28, 0.06],
                    color: 0x8A8E9A, alpha: [0.32, 0], light: "world", maxParticles: 60
                }
            ]
        },
        expire: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "fade_ring", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [14, 22], size: [0.3, 0.06],
                    color: 0x9AA0B0, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "fade_motes", bind: "point", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 24 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [18, 28], size: [0.1, 0.01],
                    color: 0xD9DCE6, alpha: [0.5, 0], light: "full", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_substitute", 1, SubstituteDefinition);
