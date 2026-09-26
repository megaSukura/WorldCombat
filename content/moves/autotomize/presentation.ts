/**
 * 身体轻量化 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身上几处寒光一闪，随后一块块外壳被撬下来向外甩出、真实抛落；身体腾起一层淡淡的轻光留在窗口里，
 *   但不再往上飘——重力变小只让跳跃更高、下落更慢，静止的身体仍贴着地。
 *
 * 色相家族：冷银蓝（0xC9D6E4）为主体，近白（0xEAF4FF）作撬件高光，灰蓝（0xA9B6C4）作落地尘。没有第二个色相。
 * 层次：撬件寒光（起）／外壳与尘、一下白闪（击）／轻身贴体微光（收）／外壳落点散去（余）。
 * 起击收：wrench（撬件）→ shed（卸下）→ light（轻身）→ scatter（散）。
 * 范围：卸件以自身为源，粒子随碰撞箱缩放；scatter 绑每片外壳真实的位置，件数与 `data.parts` 一致。
 * 运动：外壳由体内向外甩、受重力下落；轻身只做贴体闪烁，不向上飘。真实抛落的实体外壳由 WorldBodies 承载，不是粒子冒充。
 * 数：甲片与尘的数量绑 `data.parts`（体重派生），整体强度绑 `data.intensity`（提速等级与件数派生）。
 */
const AutotomizeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wrench: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "wrench_glint", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], spin: 60,
                    lifetime: [5, 10], size: [0.07, 0.015],
                    color: 0xD8E6F2, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        shed: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "shed_shards", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "parts", fallback: 3 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.1, 0.35], gravity: 0.06, drag: 0.9, spin: 80,
                    lifetime: [10, 18], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xC9D6E4, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "shed_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "parts", fallback: 3 }, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: 0.9 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xA9B6C4, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "shed_flash", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    burst: { count: 1 }, shape: { kind: "point" },
                    lifetime: [3, 5], size: [0.45, 0.1],
                    color: 0xEAF4FF, alpha: [0.6, 0], light: "full", bloom: 0.5, maxParticles: 2
                }
            ]
        },
        light: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "light_glint", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.005, 0.02],
                    lifetime: [10, 16], size: [0.05, 0.01],
                    color: 0xDCEAF6, alpha: [0.28, 0], light: "full", maxParticles: 14
                },
                {
                    name: "light_shell", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 3, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.005, 0.02],
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0xBFD4E6, alpha: [0.22, 0], light: "full", maxParticles: 12
                }
            ]
        },
        scatter: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "scatter_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "parts", fallback: 2 }, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.03, drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0xA9B6C4, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_autotomize", 1, AutotomizeDefinition);
