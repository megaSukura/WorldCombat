/**
 * 铠农炮 / armorcannon 的客户端表现。
 *
 * 一句话：施法者身上腾起火星、胸前的护甲烧红并收成一副火壳 → 火壳沿准线射出去，拖出一条火星尾迹 →
 *   命中或撞块在真落点炸开一团火与崩落的碎甲 → 落点在 burst 后浮起一圈短时热壳残屑（residue），随后后坐卸掉、铠甲缺口冒余烟。
 * 色相家族：火橙 0xFF8C3A 与暖黄 0xFFC06A 为主体，近白 0xFFF0D0 只给弹体核心，焦黑 0x3A2A22 作烟与余韵；火与烟是一家。
 * 拍子：起 ready（烧甲凝壳）→ 弃守 guard（护甲崩片）→ 射 travel（沿准线飞行）→ 击 burst（炸开火团）→ 屑 residue（热壳余烬）→ 收 slump（余烟）／散 fizzle（飞空）。
 * 范围：burst 的 `scorch_ring` 绑落点、`fit:"none"`，半径直接绑 `data.scorch`（落点热屑半径），residue 的圈也按它铺开。
 * 运动：travel 沿弹体运动方向拖火星；burst 向外交崩碎甲与火点、烟团上浮、地环外推；residue 余烬原地明灭上浮；slump 余烟缓慢上浮、落火下沉。
 * 数：burst 的碎甲量、火点量、烟量与 residue 的余烬量绑 `data.plates`（体重派生），核心强度绑 `data.intensity`（威力派生）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ArmorCannonDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        ready: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "burn", bind: "source", offset: [0, 0.7, 0.2], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFF8C3A, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "plate", bind: "source", offset: [0, 0.6, 0.15], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    rate: 8, shape: { kind: "sphere", radius: 0.25 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [7, 12], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xFFC06A, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        guard: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crack", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "plates", fallback: 8 }, at: 0 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.1, 0.28], drag: 0.92,
                    lifetime: [8, 14], size: [0.24, 0.06], sizeMode: "index",
                    color: 0xFF8C3A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "ash", bind: "source", offset: [0, 0.8, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "plates", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.07],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x3A2A22, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        travel: {
            duration: 0,
            exit: { drain: 8 },
            emitters: [
                {
                    name: "trail", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    trail: { minDistance: 0.25 }, rate: 24,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [5, 10], size: [0.12, 0.03],
                    color: 0xFF8C3A, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "shell_glow", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 14, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0xFFF0D0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "plates", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.3], spread: 30,
                    lifetime: [7, 13], size: [0.34, 0.06], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "fire", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "plates", fallback: 8 }, at: 0 },
                    shape: { kind: "circle", radius: 0.9 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xFF8C3A, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "embers", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "plates", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.06, drag: 0.94,
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0xFFC06A, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "scorch_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "scorch", fallback: 1.0 } },
                    direction: "outward", speed: [0.16, 0.38],
                    lifetime: [8, 14], size: [0.6, 0.12], sizeMode: "index",
                    color: 0x3A2A22, alpha: [0.8, 0], light: "world", maxParticles: 6
                },
                {
                    name: "smoke", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "plates", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [16, 28], size: [0.4, 0.16],
                    color: 0x3A2A22, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        residue: {
            duration: 60,
            exit: { stop: 20, drain: 24 },
            emitters: [
                {
                    name: "heat", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "plates", fallback: 8 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "scorch", fallback: 1.0 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.09, 0.01],
                    color: 0xFFC06A, alpha: [0.55, 0], light: "full", maxParticles: 50
                },
                {
                    name: "ash", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "plates", fallback: 8 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "scorch", fallback: 1.0 } },
                    direction: "outward", speed: [0.01, 0.03], gravity: 0.02, drag: 0.94,
                    lifetime: [20, 34], size: [0.1, 0.02],
                    color: 0x3A2A22, alpha: [0.4, 0], light: "world", maxParticles: 44
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "spark", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.08,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFF8C3A, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        slump: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "residue", bind: "source", offset: [0, 0.7, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "plates", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.14, 0.04],
                    color: 0x3A2A22, alpha: [0.45, 0], light: "world", maxParticles: 40
                },
                {
                    name: "ember_fall", bind: "source", offset: [0, 0.5, 0], height: 0.3, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 10, shape: { kind: "sphere", radius: 0.35 },
                    direction: "down", speed: [0.01, 0.06], gravity: 0.05,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFF8C3A, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_armorcannon", 1, ArmorCannonDefinition);
