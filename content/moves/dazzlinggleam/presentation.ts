/**
 * 魔法闪耀 / dazzlinggleam 的客户端表现。
 *
 * 一句话：施法者把身周飘散的粉色微光收拢到身上，脚下浮起一圈将亮未亮的光环；随后中心一枚柔亮星体瞬闪、
 *   一圈短半透明的光沿身体向外推，每个实际受击者被一条短光路连回中心、眼边留下一枚小星点；目眩结束，星点随之收掉。
 *   没有整屏大白闪，玩家始终能看清身前。
 * 色相家族：粉白（glowingsparkle_pink / shinesparkle_rainbow / impact_fairy / largefadeorb）为主体，
 *   近白只做炸开核心的强调。
 * 拍子：起（charge 微光内收、地面光环将亮）→ 闪（flash 短柔星瞬闪、光浪外推）→ 中（hit 光路连人、眼边星点）
 *   → 眩（dazzle 存续期间眼边星点续期）→ 收（sober 目眩结束时星点消退 / miss 落空）。
 * 范围：flash / charge 的地面圈按参考半径 3.4 书写、由服务端 `data.scale`（真实光浪半径 / 3.4）缩到实际半径，玩家看到的圈就是会被闪到的范围。
 * 运动：起手微光与光环向内收束；炸开时整圈向外推、外圈光道沿半径射出；hit 的光路沿 `data.path` 从中心连到受击者。
 * 数：`data.rays`（特攻与等级派生）决定外圈光道条数，`data.motes`（特攻派生）决定光尘量，
 *   `data.count`（本次威力×距离派生）决定每个命中目标眼边的星点量，`data.dazzle` 决定是否留目眩星点。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DazzlinggleamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 18, shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "inward", speed: [0.05, 0.2], spread: 16,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xFFD9F2, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "rim", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 14, shape: { kind: "circle", radius: 3.4, thickness: 0.85 },
                    direction: "inward", speed: [0.03, 0.1], spread: 8,
                    lifetime: [10, 16], size: [0.22, 0.06],
                    color: 0xFFE9F6, alpha: [0.4, 0], light: "full", bloom: 0.2, maxParticles: 60
                }
            ]
        },
        flash: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "star", bind: "source", height: 0.6, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: 3, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 11], size: [0.85, 0.2], sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", bloom: 0.5, maxParticles: 8
                },
                {
                    name: "wave", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: { data: "rays", fallback: 9 }, at: 0 },
                    shape: { kind: "circle", radius: 3.4, thickness: 0.9 },
                    direction: "outward", speed: [0.06, 0.24], spread: 8,
                    lifetime: [10, 18], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFE9F6, alpha: [0.45, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "rays", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "rays", fallback: 9 }, at: 0 },
                    shape: { kind: "circle", radius: 0.5, thickness: 0.6 },
                    direction: "outward", speed: [0.5, 1.3], spread: 8,
                    lifetime: [8, 16], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.75, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    rate: { data: "motes", fallback: 26 },
                    shape: { kind: "circle", radius: 3.4, thickness: 0.85 },
                    direction: "outward", speed: [0.1, 0.4], spread: 18,
                    gravity: 0.01, drag: 0.93,
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xFFD9F2, alpha: [0.7, 0], light: "full", maxParticles: 200
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "link", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    shape: { kind: "polyline" },
                    rate: 44, direction: "outward", speed: [0.01, 0.05], spread: 8,
                    lifetime: [5, 10], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xFFD9F2, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "spark", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: { data: "count", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.4], spread: 20,
                    lifetime: [6, 12], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "petal", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "count", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.16, 0.5], spread: 22,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xFFD9F2, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        dazzle: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "eye", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 6, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xFFD9F2, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        sober: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 6 },
                    shape: { kind: "ring", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xF0C8E4, alpha: [0.4, 0], light: "full", maxParticles: 12
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dim", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xF0C8E4, alpha: [0.4, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dazzlinggleam", 1, DazzlinggleamDefinition);
