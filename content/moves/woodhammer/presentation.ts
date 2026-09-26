/**
 * 木槌 / woodhammer 的客户端表现。
 *
 * 一句话：躯体绷硬、抬起，再整副砸下；落地的一刻碎木沿接触面喷出，脚下一圈短暂的地裂碎屑贴着地表拉开，
 * 砸空时同样溅起碎屑，只是没有那声闷响。地裂只是画面，不改变任何方块。
 * 色相家族：木绿与树皮褐（0x7A8B4A / 0x8C6A3F）为底，草绿的冲击与浅木色碎屑点缀，饱和黄绿只给砸击核心一点。
 * 拍子：起 harden（绷硬）→ 举 raise（抬起）→ 砸 fall（砸下）→ 击 impact（碎木与裂纹）／ whiff（砸空）。
 * 范围：impact 与 whiff 绑落点、画的就是砸到哪；crack 绑原生接触格，按 crackTicks 存续；raise/fall 贴真实身体升降。
 * 运动：绷硬向内收；砸下时速度线沿真实运动向下压；命中碎木沿 `data.face` 外法线喷、裂纹贴地向外扩。
 * 数：`data.splinters`（物攻与体重派生）决定碎木总量，`data.cracks`（地裂碎屑数）决定裂纹圈上的碎块数，
 * `data.crackTicks` 决定裂纹存续，`data.height`（真实升降高度）拉长竖向槌影，
 * `data.intensity`（威力 / 115）抬高密度与亮度，`data.scale`（判定半径 / 0.62）放大砸面。
 */
const WoodhammerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        harden: {
            duration: 18,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "temper", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0x7A8B4A, alpha: [0.5, 0], light: "world", maxParticles: 56
                },
                {
                    name: "sap", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xD8D2B0, alpha: [0.45, 0], light: "full", maxParticles: 22
                }
            ]
        },
        raise: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "down", speed: [0.03, 0.12],
                    drag: 0.93,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x8C6A3F, alpha: [0.45, 0], light: "world", maxParticles: 50
                },
                {
                    name: "updraft", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    orient: "velocity",
                    rate: 20, shape: { kind: "line", length: { data: "height", fallback: 0.5 } },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [5, 9], size: [0.16, 0.04],
                    color: 0xD8D2B0, alpha: [0.6, 0], light: "full", maxParticles: 90
                }
            ]
        },
        fall: {
            duration: 24,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "drive", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    orient: "velocity",
                    rate: 30, shape: { kind: "line", length: { data: "height", fallback: 0.6 } },
                    direction: "shape", speed: [0.08, 0.26], trail: { minDistance: 0.24 },
                    lifetime: [4, 8], size: [0.2, 0.05],
                    color: 0xD8D2B0, alpha: [0.7, 0], light: "full", maxParticles: 160
                },
                {
                    name: "chips", bind: "source", offset: [0, 0.3, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: { data: "splinters", fallback: 24 }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "away", speed: [0.06, 0.2], spin: 10,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0x8C6A3F, alpha: [0.6, 0], light: "world", maxParticles: 140
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "splinters", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.07, 0.28], spread: 16,
                    lifetime: [7, 13], size: [0.44, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 100
                },
                {
                    name: "splinter", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    orient: "direction",
                    burst: { count: { data: "splinters", fallback: 24 } },
                    shape: { kind: "cone", radius: 0.5, angleDegrees: 55 },
                    direction: "shape", speed: [0.1, 0.3], spin: 12,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [12, 22], size: [0.2, 0.05],
                    color: 0x8C6A3F, alpha: [0.8, 0], light: "world", maxParticles: 120
                },
                {
                    name: "quake", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.0 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.5, 1.1], sizeMode: "sin",
                    color: 0x7A8B4A, alpha: [0.45, 0], light: "world"
                }
            ]
        },
        whiff: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "groundhit", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: { data: "cracks", fallback: 10 }, at: 0 },
                    shape: { kind: "hemisphere", radius: 0.46, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.08, 0.28], spread: 16,
                    lifetime: [9, 16], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE8E2C8, alpha: [1, 0], light: "world", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "soil", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "cracks", fallback: 10 } },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.0 } },
                    direction: "outward", speed: [0.06, 0.2],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x8C6A3F, alpha: [0.55, 0], light: "world", maxParticles: 90
                }
            ]
        },
        crack: {
            duration: 0,
            emitters: [
                {
                    name: "scar", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "cracks", fallback: 10 } },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.0 } },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0, drag: 0.8,
                    lifetime: { data: "crackTicks", fallback: 80 }, size: [0.09, 0.02],
                    color: 0x6E5A3C, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_woodhammer", 1, WoodhammerDefinition);
