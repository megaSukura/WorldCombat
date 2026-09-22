/**
 * 蛛网 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：一团乳白偏灰的黏丝沿直线飞出去，命中后把目标密密裹进层层丝网——每多一层就多裹一圈、更紧一点；
 *   丝网在目标身上泛着黏腻的光；火一燎，整团丝轰地烧成橙色火星与黑烟散掉。
 *
 * 色相家族：乳白灰（0xE6E2D6／0xC9C4B4）为主，黏光用一点冷白（0xEDE8F0）；只有「烧开」这一幕加入橙（0xF0A24A）——
 *   火与丝的反差本身就是机制（怕火），第二个色相只在表明这件事时进入。
 * 层次：起势（口边聚丝）→ 命中裹身（丝网从外收拢、逐层收紧）→ 持守（丝壳低频脉动＋几缕垂丝＋黏光）
 *   → 烧开（橙火星＋黑烟一次爆开）／松脱（丝慢慢垂落）。
 * 起击收：windup（聚丝）→ shot（飞行）→ wrap（裹身峰值）→ cocoon（持续）→ burn／fade（余韵）／splat（落空）。
 * 范围：目标身上的丝壳半径按 `data.scale = 观测碰撞箱宽度 / 0.9` 缩放，跟着目标的身量走；
 *   丝网与丝壳的转速／半径即判定里那个被裹住的整体。
 * 运动：丝束从外向内收拢并绕身缠紧（direction inward＋环带），垂丝贴地缓慢下坠，烧开时沿球面向外炸开。
 * 数：`data.threads`（特攻换算的丝道数）绑定裹身的发射量，`data.layers`（层数）抬高丝壳密度与亮度，
 *   `data.intensity` 再整体缩放。
 * 参照节：视觉语言第一、二、三、四、五、六、七、九节。
 */
const SpiderwebDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 7, drain: 15 },
            emitters: [
                {
                    name: "gather_silk", bind: "source", height: 0.72, offset: [0, 0, 0.16],
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xE6E2D6, alpha: [0.6, 0], light: "world", maxParticles: 32
                },
                {
                    name: "gather_glint", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 7, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 13], size: [0.07, 0.01],
                    color: 0xEDE8F0, alpha: [0.6, 0], light: "full", maxParticles: 14
                }
            ]
        },
        shot: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "silk_trail", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    trail: { minDistance: 0.22 },
                    rate: 26, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xE6E2D6, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        wrap: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "wrap_burst", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "threads", fallback: 12 }, repeats: 2, interval: 3 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.06, 0.22],
                    lifetime: [9, 16], size: [0.28, 0.06], sizeMode: "index",
                    color: 0xE6E2D6, alpha: [1, 0], light: "world", maxParticles: 90
                },
                {
                    name: "wrap_shell", bind: "target", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 30, repeats: 3, interval: 4 },
                    shape: { kind: "cylinder", radius: 0.42, length: 1.3 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [16, 26], size: [0.2, 0.05],
                    color: 0xE6E2D6, alpha: [0.55, 0], light: "world", maxParticles: 100
                },
                {
                    name: "wrap_glint", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 18 }, shape: { kind: "sphere_surface", radius: 0.46 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xEDE8F0, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        cocoon: {
            duration: 0,
            exit: { stop: 0, drain: 26 },
            emitters: [
                {
                    name: "cocoon_shell", bind: "target", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: { data: "layers", fallback: 1 }, shape: { kind: "cylinder", radius: 0.42, length: 1.3 },
                    direction: "inward", speed: [0.0, 0.02],
                    lifetime: [22, 38], size: [0.18, 0.05], sizeMode: "sin",
                    color: 0xE6E2D6, alpha: [0.3, 0.08], alphaMode: "sin", light: "world", maxParticles: 44
                },
                {
                    name: "cocoon_drip", bind: "target", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    rate: 3, shape: { kind: "circle", radius: 0.34 },
                    direction: "down", speed: [0.0, 0.02], gravity: 0.04, drag: 0.98,
                    lifetime: [16, 26], size: [0.07, 0.02],
                    color: 0xC9C4B4, alpha: [0.5, 0], light: "world", maxParticles: 16
                },
                {
                    name: "cocoon_glint", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xEDE8F0, alpha: [0.35, 0], alphaMode: "sin", light: "full", maxParticles: 10
                }
            ]
        },
        burn: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "burn_flash", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 34 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.28], spread: 30,
                    lifetime: [8, 15], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF0A24A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "burn_smoke", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.44 },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [16, 28], size: [0.3, 0.08],
                    color: 0x3A3226, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "fade_fall", bind: "target", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "layers", fallback: 1 }, repeats: 6, interval: 3 },
                    shape: { kind: "sphere_surface", radius: 0.44 },
                    direction: "down", speed: [0.01, 0.05], gravity: 0.03, drag: 0.95,
                    lifetime: [16, 28], size: [0.16, 0.04],
                    color: 0xE6E2D6, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        splat: {
            duration: 18,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "splat_burst", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 20 }, shape: { kind: "circle", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [10, 16], size: [0.12, 0.03],
                    color: 0xE6E2D6, alpha: [0.6, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spiderweb", 1, SpiderwebDefinition);
