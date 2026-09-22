/**
 * 掀榻榻米 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者按地，一张草绿的榻榻米从脚边掀起、横着翻成一面席墙，罩住身边的伙伴；招式伤害拍在席面上
 *   被整片吃下，席子猛地一颤、草屑簌簌飞起，吃满时整张席子落下。
 *
 * 色相家族：草黄（0xD9C08A）为主体，米白（0xF0E2BC）做高光与草屑，苔绿（0x6E7A46）做席边与落席；没有第二个色相。
 * 层次：聚草（起）／席面环与席条（击）／贴身席墙（持续）／吃伤震颤（事件）／落席（收）。
 * 起击收：fold（起）→ raise（击）→ hold（持续）→ block（事件）→ fall（收）。
 * 范围：地环与席面绑落点、fit none，半径按 `data.scale`（实际遮蔽半径 / 3.4）推出，画出来的圈就是席子真罩到的范围。
 * 运动：起手草屑向内聚；掀席时环向外推远、席条自地面翻起；吃伤时草屑沿来袭方向弹开；落席时向下沉散。
 * 数：席条数绑 `data.slats`（防御派生），草屑量绑 `data.fibers`（防御派生），尺寸与范围绑 `data.scale`（体型与配置派生）。
 * 持续状态：持续层贴地、低密度，让出目标本体视线。
 */
const MatBlockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        fold: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "fold_straw", bind: "source", fit: "body", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    rate: 12, shape: { kind: "sphere", radius: 1.0 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 14,
                    lifetime: [8, 14], size: [0.14, 0.04],
                    color: 0xF0E2BC, alpha: [0.5, 0], light: "world", maxParticles: 36
                }
            ]
        },
        raise: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "raise_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.34, 0.14],
                    color: 0xD9C08A, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "raise_slat", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "slats", fallback: 10 } },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.04, 0.13], drag: 0.9,
                    lifetime: [16, 26], size: [0.5, 0.16],
                    color: 0xD9C08A, alpha: [0.7, 0], light: "world", maxParticles: 44
                },
                {
                    name: "raise_straw", bind: "source", fit: "body", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: { data: "fibers", fallback: 24 } },
                    shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.01, drag: 0.92, spin: 16,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xF0E2BC, alpha: [0.8, 0], light: "world", maxParticles: 70
                }
            ]
        },
        hold: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hold_slat", bind: "target", fit: "body", height: 0.35, offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: 4, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.006, 0.03],
                    lifetime: [14, 22], size: [0.32, 0.1], sizeMode: "sin",
                    color: 0xD9C08A, alpha: [0.26, 0], alphaMode: "sin", light: "world", maxParticles: 18
                },
                {
                    name: "hold_straw", bind: "target", fit: "body", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.008, 0.03],
                    lifetime: [14, 22], size: [0.06, 0.01],
                    color: 0x6E7A46, alpha: [0.2, 0], light: "world", maxParticles: 14
                }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "block_flex", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: { data: "slats", fallback: 10 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "away", speed: [0.08, 0.26], drag: 0.9, spin: 12,
                    lifetime: [8, 16], size: [0.3, 0.06],
                    color: 0xF0E2BC, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "block_straw", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "fibers", fallback: 24 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "away", speed: [0.06, 0.2], gravity: 0.02, drag: 0.92, spin: 18,
                    lifetime: [8, 16], size: [0.11, 0.03],
                    color: 0x6E7A46, alpha: [0.85, 0], light: "world", maxParticles: 70
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "fall_slat", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "down", speed: [0.03, 0.12], gravity: 0.03, drag: 0.9,
                    lifetime: [16, 28], size: [0.36, 0.1],
                    color: 0x6E7A46, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fall_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.94,
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0xD9C08A, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_matblock", 1, MatBlockDefinition);
