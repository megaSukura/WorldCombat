/**
 * 冰锤 / icehammer 的客户端表现。
 *
 * 一句话：施法者的拳面凝出厚冰、冰屑向拳心收拢 → 一记垂直下砸把冰壳在目标身上炸开，冻气窜上目标身体、
 *   冰屑四散 → 落地处结出一圈薄冰，自己踉跄着浮起疲软的寒气。
 * 色相家族：冰蓝（0x4FA8D8 主体、0x8FD6F5 亮面）＋霜白（0xEAFBFF）只出现在碎裂与冻结核心；中性尘作余韵。
 * 拍子：起 hoist（凝冰举锤）→ 击 slam（冰壳炸开）→ 冻 chill（冻气附着）→ 冰 frost（地面结冰）→ 收 stagger／失 miss。
 * 范围：frost 的冰圈按 `data.radius`（冰面半径）铺开，画出的就是结冰的那圈地面；slam 的爆点按 `data.scale`。
 * 运动：slam 的冰屑从拳面与命中点向外崩、带重力落回；chill 的冻气贴目标向上缠绕；frost 的霜点贴地向外扩。
 * 数：`data.shards`（体重与物攻换算的冰屑量）决定碎裂与冰屑密度，`data.intensity`（威力 / 100）抬高密度与亮度，
 *   `data.radius`／`data.scale`（冰面半径换算）决定冰圈尺度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const IcehammerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        hoist: {
            duration: { data: "windup", fallback: 15 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "rime", bind: "source", offset: [0, 1.5, 0.15], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 22, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.14], spin: 12,
                    lifetime: [7, 14], size: [0.16, 0.03],
                    color: 0x8FD6F5, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 80
                },
                {
                    name: "cold", bind: "source", offset: [0, 1.55, 0.2], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xEAFBFF, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        slam: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fist", bind: "point", fit: "none", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.14, 0.32],
                    lifetime: [7, 12], size: [0.5, 0.08], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 24
                },
                {
                    name: "shatter", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.08, 0.3], spread: 28,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "shards", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.07, 0.28], spin: 14, spread: 32,
                    gravity: 0.08, drag: 0.9,
                    lifetime: [10, 18], size: [0.13, 0.02],
                    color: 0x8FD6F5, alpha: [0.9, 0], light: "full", maxParticles: 90
                }
            ]
        },
        chill: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "frost_creep", bind: "target", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 26, shape: { kind: "box", size: [0.7, 1.3, 0.7] },
                    direction: "up", speed: [0.01, 0.06], spin: 8,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xEAFBFF, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "chill_spark", bind: "target", offset: [0, 0.9, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        frost: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "ice_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.5 } },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [10, 18], size: [0.5, 1.1], sizeMode: "sin",
                    color: 0x8FD6F5, alpha: [0.5, 0], light: "full", maxParticles: 6
                },
                {
                    name: "snow_drift", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 } },
                    direction: "up", speed: [0.02, 0.1], spread: 20,
                    gravity: 0.04, drag: 0.94,
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0xEAFBFF, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "mist", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 } },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [16, 28], size: [0.28, 0.5],
                    color: 0x8FD6F5, alpha: [0.28, 0], light: "world", maxParticles: 50
                }
            ]
        },
        stagger: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fatigue", bind: "source", offset: [0, 0.6, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "fatigue", fallback: 16 } },
                    shape: { kind: "box", size: [0.5, 0.6, 0.5] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x9AA6B4, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.03, 0.13], spin: 10,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0x8FD6F5, alpha: [0.4, 0], light: "world", maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_icehammer", 1, IcehammerDefinition);
