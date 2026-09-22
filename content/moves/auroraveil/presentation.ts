/**
 * 极光幕 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把天光拉下来，头顶横起几道虹带、在天顶铺成一片极光，地面亮起一圈光边画出幕的范围；
 * 幕下的人身上笼着流速的极光，来袭的攻击撞上时折出一道亮带，极光慢慢收拢、落下。
 *
 * 色相家族：极光本身就是多色带，所以用 shinesparkle_rainbow 的原色作主体，青 0x7FE6D8 与紫 0xB79CF0
 *   只做两侧描边，近白 0xEAF9F5 给地层光边；这是「含义需要第二个色相」的少数情况。
 * 一个效果一个色相家族，其余层保持低饱和。持续层全部抬到天顶与地面边圈，绝不当在视线正中。
 * 层次：拉光（起）／地边圈＋天顶虹带（铺开）／天顶极光与边圈（持续）／入幕流光（事件）／折光挡下（事件）／收。
 * 起击收：windup（聚光）→ curtain（拉开）→ veil（持续）→ cover（入幕）→ block（挡下）→ fade（收）。
 * 数：虹带数绑定 data.ribbons；地边圈与天顶极光的尺度绑定 data.scale（半径/4）；挡下的爆发量读 data.blocked。
 */
const AuroraVeilDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "draw", bind: "source", offset: [0, 1.8, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: 12, interval: 3, repeats: 2 }, shape: { kind: "circle", radius: 0.7 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [16, 26], size: [0.18, 0.04], sizeMode: "sin",
                    alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 26 }
            ]
        },
        curtain: {
            duration: 48,
            exit: { stop: 20, drain: 32 },
            emitters: [
                { name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 30, at: 1 }, shape: { kind: "ring", radius: 4 },
                    direction: "outward", speed: [0.18, 0.3],
                    lifetime: [16, 26], size: [0.6, 1.0], sizeMode: "sin",
                    color: 0x7FE6D8, alpha: [0.6, 0], light: "full", maxParticles: 44 },
                { name: "bands", bind: "point", offset: [0, 5.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "ribbons", fallback: 8 }, interval: 3, repeats: 5 }, shape: { kind: "circle", radius: 3.6 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.94,
                    lifetime: [22, 36], size: [0.24, 0.06], sizeMode: "sin",
                    alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 120 },
                { name: "ribbon_a", bind: "point", offset: [0, 5.0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 20, interval: 4, repeats: 3 }, shape: { kind: "line", length: 4.6, rotation: [0, 0, 20] },
                    direction: "shape", speed: [0.02, 0.08], drag: 0.95,
                    lifetime: [20, 32], size: [0.3, 0.06],
                    color: 0xB79CF0, alpha: [0.5, 0], light: "full", maxParticles: 90 },
                { name: "ribbon_b", bind: "point", offset: [0, 4.6, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 20, interval: 4, repeats: 3 }, shape: { kind: "line", length: 4.2, rotation: [0, 0, -24] },
                    direction: "shape", speed: [0.02, 0.08], drag: 0.95,
                    lifetime: [20, 32], size: [0.3, 0.06],
                    color: 0x7FE6D8, alpha: [0.5, 0], light: "full", maxParticles: 90 }
            ]
        },
        veil: {
            exit: { drain: 30 },
            emitters: [
                { name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    rate: 7, shape: { kind: "ring", radius: 4 },
                    direction: "up", speed: [0.004, 0.016],
                    lifetime: [22, 34], size: [0.6, 1.0], sizeMode: "sin",
                    color: 0xEAF9F5, alpha: [0.26, 0], alphaMode: "sin", light: "full", maxParticles: 36 },
                { name: "sky", bind: "point", offset: [0, 5.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: { data: "ribbons", fallback: 8 }, shape: { kind: "circle", radius: 3.6 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [24, 40], size: [0.2, 0.05], sizeMode: "sin",
                    alpha: [0.42, 0], alphaMode: "sin", light: "full", maxParticles: 140 },
                { name: "fall", bind: "point", offset: [0, 4.0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 10, shape: { kind: "circle", radius: 3.4 },
                    direction: "down", speed: [0.02, 0.07], gravity: 0.02, drag: 0.96,
                    lifetime: [18, 30], size: [0.08, 0.02],
                    color: 0xEAF9F5, alpha: [0.3, 0], light: "full", maxParticles: 120 }
            ]
        },
        cover: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "wrap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: 14 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [14, 24], size: [0.16, 0.03], sizeMode: "sin",
                    alpha: [0.75, 0], light: "full", bloom: 0.2, maxParticles: 30 }
            ]
        },
        block: {
            duration: 24,
            exit: { stop: 8, drain: 20 },
            emitters: [
                { name: "fold", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.06, 0.18], drag: 0.88,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xEAF9F5, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 34 },
                { name: "deflect", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 12 }, shape: { kind: "line", length: 1.3 }, orient: "direction", direction: "shape",
                    speed: [0.18, 0.3],
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0xB79CF0, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 24 }
            ]
        },
        fade: {
            duration: 36,
            exit: { stop: 12, drain: 30 },
            emitters: [
                { name: "lower", bind: "point", offset: [0, 3.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "ribbons", fallback: 8 }, interval: 3, repeats: 3 }, shape: { kind: "circle", radius: 3.2 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.02, drag: 0.95,
                    lifetime: [22, 36], size: [0.2, 0.03],
                    alpha: [0.4, 0], light: "world", maxParticles: 80 },
                { name: "ring", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 4 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [18, 28], size: [0.3, 0.06],
                    color: 0x7FE6D8, alpha: [0.3, 0], light: "world", maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_auroraveil", 1, AuroraVeilDefinition);
