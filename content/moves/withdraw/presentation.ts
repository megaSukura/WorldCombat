/**
 * 缩入壳中 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：身体一收，水光与壳片由四面合拢、拼成一圈厚壳把施法者整个包住；壳在身时表面流转着水纹，
 *   每被挡下一击就荡开一圈水花与壳屑，挡满或被破时整层壳片炸开、重新露出身体。
 *
 * 色相家族：壳青蓝（0x4C7FA8）为主体，水光蓝（0x8FC7D6）做高光，深水（0x2F5A78）做余韵；没有第二个色相。
 * 层次：合拢（起）／壳片、壳环与水泡（击）／壳面的水纹（收）／荡开的水花（受击）／炸开的壳片（末）。
 * 起击收：tuck（收身）→ seal（合壳）→ hollow（持壳）／block（挡击）→ open（开壳）。
 * 范围：壳环绑身体、fit none，半径按 `data.scale`（实际壳半径 / 1.3）推出，画出来的壳就是护到的体积。
 * 运动：壳片与水光由外向内合拢；合壳时壳环向外推开、水泡上浮；持壳时水纹沿壳面流转；挡击时水花向外荡开；开壳时壳片受重力落下。
 * 数：壳片量绑 `data.plates`（防御与等级派生），剩余硬挡次数绑 `data.left`，挡击强度绑 `data.intensity`，尺寸绑 `data.scale`。
 * 持续状态：持壳期低密度、贴身，玩家仍看得清目标。
 */
const WithdrawDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tuck: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "tuck_ripple", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 10, shape: { kind: "sphere", radius: 1.3 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 12,
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x8FC7D6, alpha: [0.5, 0], light: "world", maxParticles: 36
                }
            ]
        },
        seal: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "seal_plate", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    burst: { count: { data: "plates", fallback: 12 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.3 },
                    direction: "inward", speed: [0.05, 0.17], drag: 0.88, spin: 16,
                    lifetime: [12, 22], size: [0.2, 0.04],
                    color: 0x4C7FA8, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "seal_ring", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 1.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 20], size: [0.44, 0.78], sizeMode: "index",
                    color: 0x8FC7D6, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "seal_bubble", bind: "source", fit: "none", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 14, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: [0.03, 0.12], gravity: -0.01, drag: 0.9,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0x8FC7D6, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hollow: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "hollow_ripple", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 3, shape: { kind: "sphere_surface", radius: 0.9 },
                    direction: "up", speed: [0.01, 0.03], spin: 10,
                    lifetime: [12, 20], size: [0.1, 0.03],
                    color: 0x8FC7D6, alpha: [0.3, 0], light: "world", maxParticles: 18
                },
                {
                    name: "hollow_orb", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 2, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.006, 0.018], spin: 8,
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0x4C7FA8, alpha: [0.28, 0], light: "world", maxParticles: 12
                }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "block_splash", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "plates", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.03, drag: 0.9, spin: 20,
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0x8FC7D6, alpha: [0.85, 0], light: "world", maxParticles: 140
                },
                {
                    name: "block_flash", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    lifetime: [10, 12], size: [0.5, 0.9],
                    color: 0x8FC7D6, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 4
                }
            ]
        },
        open: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "open_plate", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    burst: { count: { data: "plates", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.03, 0.13], gravity: 0.05, drag: 0.9, spin: 22,
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0x2F5A78, alpha: [0.65, 0], light: "world", maxParticles: 140
                },
                {
                    name: "open_splash", bind: "source", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.04, drag: 0.92,
                    lifetime: [12, 20], size: [0.12, 0.03],
                    color: 0x8FC7D6, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_withdraw", 1, WithdrawDefinition);
