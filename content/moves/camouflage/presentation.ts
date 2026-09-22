/**
 * 保护色 / camouflage 的客户端表现。
 *
 * 一句话：脚下一圈中性扫描环收拢、身侧浮起灰白尘点 → 按脚下的材质炸开一撮对应碎屑与同色微粒，
 *         身体轮廓被染成那个属性的颜色 → 存续期间身上一直浮着低密度的同色尘点。
 * 色相家族：每种材质用同一种贴图、只换 `data.color`（该属性的色相，已降饱和），中性层用灰白。
 *   属性能改，颜色就跟着改，这是本招唯一的身份来源。
 * 拍子：起 scan 0–16t（收拢）／击 <材质> 44t（碎屑炸开＋同色微粒）／续 wear／变 shift／收 fade。
 * 范围：材质 moment 的碎屑环按 `fit: body` 与 `data.scale` 铺开，画出这一层颜色覆盖到整个身形。
 * 运动：扫描环向内收、碎屑向外炸开后上飘、存续期间微粒缓缓上升。
 * 数：碎屑数绑 `data.fringe`（体型与体重派生），色尘数绑 `data.motes`（特攻派生），
 *   存续期的 wear 用约 1/3 的 motes 做低密度提示。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const CamouflageSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        scan: {
            duration: 16,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "scan_ring", bind: "source", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "inward", speed: [0.06, 0.12], spread: 4,
                    lifetime: [10, 15], size: [0.24, 0.1],
                    color: 0xCFD3DE, alpha: [0.55, 0], light: "full", maxParticles: 60
                },
                {
                    name: "scan_dust", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere_surface", radius: 0.9 },
                    direction: "inward", speed: [0.06, 0.14], spread: 8,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xE8ECF0, alpha: [0.8, 0], light: "full", maxParticles: 110
                }
            ]
        },
        water: {
            duration: 44,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "water_accent", bind: "source", fit: "body", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "fringe", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.24], spread: 20, gravity: 0.03, drag: 0.9,
                    lifetime: [12, 20], size: [0.12, 0.03], sizeMode: "index",
                    color: { data: "color", fallback: 0x6390F0 }, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "water_motes", bind: "source", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.07], gravity: 0.02,
                    lifetime: [10, 18], size: [0.08, 0.01], sizeMode: "sin",
                    color: { data: "color", fallback: 0x6390F0 }, alpha: [0.75, 0], light: "full", maxParticles: 90
                }
            ]
        },
        ice: {
            duration: 44,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "ice_accent", bind: "source", fit: "body", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "fringe", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.09, 0.26], spread: 22, gravity: 0.05, drag: 0.9, spin: 40,
                    lifetime: [12, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: { data: "color", fallback: 0x96D9D6 }, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "ice_motes", bind: "source", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [10, 18], size: [0.09, 0.01], sizeMode: "sin",
                    color: { data: "color", fallback: 0x96D9D6 }, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        grass: {
            duration: 44,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "grass_accent", bind: "source", fit: "body", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "fringe", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.07, 0.22], spread: 24, gravity: 0.02, drag: 0.9, spin: 60,
                    lifetime: [12, 22], size: [0.13, 0.03], sizeMode: "index",
                    color: { data: "color", fallback: 0x7AC74C }, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "grass_motes", bind: "source", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.05], spin: 30,
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: { data: "color", fallback: 0x7AC74C }, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        ground: {
            duration: 44,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "ground_accent", bind: "source", fit: "body", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "fringe", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.26], spread: 26, gravity: 0.06, drag: 0.88,
                    lifetime: [12, 20], size: [0.16, 0.04], sizeMode: "index",
                    color: { data: "color", fallback: 0xE2BF65 }, alpha: [0.9, 0], light: "world", maxParticles: 120
                },
                {
                    name: "ground_motes", bind: "source", fit: "body", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.05], gravity: 0.03,
                    lifetime: [10, 18], size: [0.08, 0.01], sizeMode: "sin",
                    color: { data: "color", fallback: 0xE2BF65 }, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        rock: {
            duration: 44,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "rock_accent", bind: "source", fit: "body", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "fringe", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.3], spread: 26, gravity: 0.07, drag: 0.87, spin: 20,
                    lifetime: [12, 22], size: [0.2, 0.05], sizeMode: "index",
                    color: { data: "color", fallback: 0xB6A136 }, alpha: [0.92, 0], light: "world", maxParticles: 110
                },
                {
                    name: "rock_motes", bind: "source", fit: "body", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "down", speed: [0.01, 0.06], gravity: 0.04,
                    lifetime: [10, 18], size: [0.08, 0.01], sizeMode: "sin",
                    color: { data: "color", fallback: 0xB6A136 }, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        fire: {
            duration: 44,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "fire_accent", bind: "source", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "fringe", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "up", speed: [0.05, 0.2], spread: 24, drag: 0.92,
                    lifetime: [10, 18], size: [0.13, 0.03], sizeMode: "index",
                    color: { data: "color", fallback: 0xEE8130 }, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 130
                },
                {
                    name: "fire_motes", bind: "source", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.07],
                    lifetime: [9, 16], size: [0.1, 0.02], sizeMode: "sin",
                    color: { data: "color", fallback: 0xEE8130 }, alpha: [0.75, 0], light: "full", bloom: 0.2, maxParticles: 90
                }
            ]
        },
        normal: {
            duration: 44,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "normal_accent", bind: "source", fit: "body", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: { data: "fringe", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.2], spread: 22, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.03], sizeMode: "index",
                    color: { data: "color", fallback: 0xA8A878 }, alpha: [0.8, 0], light: "full", maxParticles: 110
                },
                {
                    name: "normal_motes", bind: "source", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.08, 0.01], sizeMode: "sin",
                    color: { data: "color", fallback: 0xA8A878 }, alpha: [0.65, 0], light: "full", maxParticles: 90
                }
            ]
        },
        shift: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "shift_ring", bind: "source", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.3, 0.7], sizeMode: "sin",
                    color: { data: "color", fallback: 0xCFD3DE }, alpha: [0.6, 0], light: "full", maxParticles: 20
                },
                {
                    name: "shift_motes", bind: "source", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.22], spread: 18,
                    lifetime: [10, 16], size: [0.09, 0.01],
                    color: { data: "color", fallback: 0xCFD3DE }, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        wear: {
            duration: 40,
            exit: { stop: 20, drain: 24 },
            emitters: [
                {
                    name: "wear_glow", bind: "source", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 4 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [14, 24], size: [0.07, 0.01], sizeMode: "sin",
                    color: { data: "color", fallback: 0xCFD3DE }, alpha: [0.35, 0], alphaMode: "sin", light: "full", maxParticles: 40
                }
            ]
        },
        fade: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "fade_puff", bind: "source", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.09], drag: 0.9,
                    lifetime: [14, 24], size: [0.18, 0.36],
                    color: 0x9AA0A8, alpha: [0.3, 0], light: "world", render: "translucent", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_camouflage", 1, CamouflageSceneDefinition);
