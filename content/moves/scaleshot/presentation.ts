/**
 * 鳞射 / scaleshot 的客户端表现。
 *
 * 一句话：施法者抖身、背鳞竖起并亮起 → 一片片鳞刃沿准线（散鳞式成扇形）射出、拖着短促的龙色尾 →
 *   命中处崩开蓝紫鳞屑 → 射完后身上浮起一层轻快的光、脚边散落几片脱下的鳞。
 * 色相家族：龙蓝紫（spike / impact_dragon / glowingsparkle）为主体，中性碎屑（tinydust）作余屑，无第二色相。
 * 拍子：起 shake（竖鳞）→ 射 volley（一片接一片）→ 击 hit（鳞屑崩开）／空 husk → 收 shed（脱鳞、提速的光与落鳞）。
 * 范围：本招是远程直线/扇形连射，画面靠一串鳞刃的轨迹与散布角标出「这条线/这个扇面会被打到」；范围随 `data.scale`（判定 / 0.2）。
 * 运动：每片鳞沿准线高速直飞、朝目标修正，带短尾；命中向外崩鳞；脱鳞时脚下鳞片向外落下、身上亮光上飘。
 * 数：`data.shot` / `data.shots` 让画面读出演到第几片、还剩几片；命中鳞屑量绑 `data.shards`（威力派生），
 *   `data.intensity`（单鳞威力 / 25）放大整幕，`data.scale` 让大个子的鳞更大。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ScaleshotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        shake: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "raise", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 20, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.13],
                    lifetime: [6, 12], size: [0.16, 0.04], spin: 12,
                    color: 0x7C8CE8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "sheen", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.46 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 11], size: [0.12, 0.03],
                    color: 0xBFD0FF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 26
                }
            ]
        },
        volley: {
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "shard", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    trail: { minDistance: 0.24 }, rate: 34,
                    direction: "velocity", speed: [0.0, 0.02], spin: 10,
                    lifetime: [4, 8], size: [0.2, 0.06],
                    color: 0x8FA0F0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 34
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    trail: { minDistance: 0.34 }, rate: 14,
                    direction: "velocity", speed: [0.02, 0.08], spread: 22,
                    gravity: 0.02, drag: 0.94,
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xC8D6FF, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "shards", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.24], spread: 26,
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 52
                },
                {
                    name: "scales", bind: "point", fit: "none", offset: [0, 0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shot", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.07, 0.26], gravity: 0.08, drag: 0.92,
                    lifetime: [9, 16], size: [0.14, 0.03], spin: 14,
                    color: 0x7C8CE8, alpha: [0.9, 0], light: "full", maxParticles: 34
                },
                {
                    name: "grit", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.13],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0xAEB8D8, alpha: [0.45, 0], light: "world", maxParticles: 26
                }
            ]
        },
        husk: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "ting", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shards", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.04, 0.18], gravity: 0.09, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02], spin: 12,
                    color: 0x8FA0F0, alpha: [0.6, 0], light: "world", maxParticles: 26
                }
            ]
        },
        shed: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "lighten", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "shed", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.13, 0.02],
                    color: 0xC8D6FF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "dropped", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shed", fallback: 12 } },
                    shape: { kind: "circle", radius: 0.6 },
                    direction: "outward", speed: [0.03, 0.15], gravity: 0.09, drag: 0.9,
                    lifetime: [10, 18], size: [0.11, 0.02], spin: 10,
                    color: 0x7C8CE8, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_scaleshot", 1, ScaleshotDefinition);
