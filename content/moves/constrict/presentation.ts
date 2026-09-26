/**
 * 缠绕 / constrict 的客户端表现。
 *
 * 一句话：施法者身侧的青藤绷起（起）→ 触手按真实路程一段段伸出、藤尖在前（爬）→ 够到目标时绕体一箍并炸开藤屑
 * （缠）→ 目标身上留下一圈持续收束的藤环（持）→ 攀缠式还有一根连着双方、随身体更新的藤（牵）→ 藤环散开、
 * 叶片落下（解）；撞墙时藤尖停在墙面，拉断时连接崩开、叶片掉落。
 * 色相家族：深草绿（0x4E7A32 藤环、0x6FA83C 叶）与米白绞痕为主，无第二个色相。
 * 拍子：起 reach（绷藤）→ 爬 grow（随伸展路程增长）→ 缠 bind／squeeze（接触与收紧）→ 持 hold（藤环绕身）
 *      → 牵 latch（随双方身体更新，张力越高越细越亮）→ 解 release（散开）→ 断 snap／空 miss／墙 wall。
 * 范围：grow 与 bind 的 polyline 沿 `data.path` 画出触手爬过的真实线段，线的末端就是它够到的方向；
 *      latch 的 polyline 以 path ["source","target"] 直接连住施法者与目标，两端每帧跟随身体；squeeze／hold
 *      绑目标，说明「被缠住的是它」。
 * 运动：触手沿线一次爬出；收紧时藤环自下而上箍紧；束缚期间藤环缓慢绕体；攀缠线被拉到极限时变细变亮。
 * 数：藤屑数量绑 `data.notes`（物攻与等级派生），收紧强度与减速级数绑 `data.stages`（speedStages + 概率加强），
 *      束缚时长绑 `data.bound`（bindTicks）——画面里的数量、强度与持续和机制一致；攀缠线的粗细绑 `data.girth`、
 *      亮度绑 `data.tension`，都来自连接两端当前的真实距离。
 * 参照节：视觉语言第二、三、四、五、七、九节（持续状态少而稳）。
 */
const ConstrictDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        reach: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "taut", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.07],
                    spin: 6, lifetime: [6, 11], size: [0.09, 0.02],
                    color: 0x6FA83C, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        grow: {
            duration: 0,
            exit: { stop: 2, drain: 12 },
            emitters: [
                {
                    name: "tendril", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    rate: 30, shape: { kind: "polyline" },
                    direction: "away", speed: [0.02, 0.09],
                    spin: 8, lifetime: [5, 10], size: [0.11, 0.02], sizeMode: "index",
                    color: 0x4E7A32, alpha: [0.75, 0], light: "world", maxParticles: 60
                },
                {
                    name: "creep", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 12, shape: { kind: "polyline" },
                    direction: "away", speed: [0.02, 0.08],
                    spin: 12, lifetime: [5, 10], size: [0.08, 0.01],
                    color: 0x8FBF56, alpha: [0.55, 0], light: "full", maxParticles: 30
                },
                {
                    name: "tip", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    rate: 8, shape: { kind: "sphere", radius: 0.22 },
                    direction: "shape", speed: [0.02, 0.07],
                    spin: 10, lifetime: [5, 9], size: [0.14, 0.02],
                    color: 0x6FA83C, alpha: [0.8, 0], light: "world", maxParticles: 20
                }
            ]
        },
        bind: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "tendril", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "notes", fallback: 12 } },
                    shape: { kind: "polyline" },
                    direction: "away", speed: [0.03, 0.11],
                    spin: 8, lifetime: [6, 12], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x4E7A32, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        squeeze: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "coil", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: { data: "stages", fallback: 3 }, interval: 2 },
                    shape: { kind: "cylinder", radius: 0.42, length: 1.1, thickness: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.34, 0.06], sizeMode: "index",
                    color: 0x4E7A32, alpha: [0.8, 0], light: "world", maxParticles: 30
                },
                {
                    name: "grit", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "notes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18],
                    spread: 40, spin: 12,
                    lifetime: [7, 13], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x6FA83C, alpha: [0.7, 0], light: "full", maxParticles: 50
                },
                {
                    name: "snap", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 5, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.18],
                    lifetime: [4, 8], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xD8E8C0, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 18
                }
            ]
        },
        hold: {
            duration: 30,
            exit: { stop: 20, drain: 20 },
            emitters: [
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: 6, spriteFrom: "random", shape: { kind: "torus", radius: 0.42, thickness: 0.1, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.3, 0.24],
                    color: 0x4E7A32, alpha: [0.35, 0], light: "world", maxParticles: 20
                },
                {
                    name: "motes", bind: "target", offset: [0, 0.9, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 5, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "down", speed: [0.01, 0.04],
                    spin: 8, gravity: 0.01, lifetime: [16, 24], size: [0.07, 0.01],
                    color: 0x8FBF56, alpha: [0.3, 0], light: "world", maxParticles: 22
                }
            ]
        },
        latch: {
            duration: 0,
            exit: { stop: 2, drain: 16 },
            emitters: [
                {
                    name: "vine", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: 22, shape: { kind: "polyline" },
                    direction: "away", speed: [0.01, 0.05], spread: 8,
                    spin: 10, lifetime: [6, 12], size: { data: "girth", fallback: 0.09 },
                    color: 0x4E7A32, alpha: [{ data: "tension", fallback: 0.4 }, 0], light: "world", maxParticles: 70
                },
                {
                    name: "leaf", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 8, shape: { kind: "polyline" },
                    direction: "down", speed: [0.01, 0.04],
                    spin: 8, gravity: 0.01, lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x8FBF56, alpha: [0.3, 0], light: "world", maxParticles: 30
                },
                {
                    name: "grip", bind: "target", offset: [0, 0.05, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: 5, spriteFrom: "random", shape: { kind: "torus", radius: 0.42, thickness: 0.1, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.28, 0.2],
                    color: 0x4E7A32, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fall", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "down", speed: [0.03, 0.12],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x6FA83C, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "slack", bind: "target", offset: [0, 0.3, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.04, drag: 0.94,
                    lifetime: [8, 15], size: [0.08, 0.01],
                    color: 0x8FBF56, alpha: [0.45, 0], light: "world", maxParticles: 34
                }
            ]
        },
        snap: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "break", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 16 },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.08, 0.26], spread: 20,
                    spin: 14, gravity: 0.03, drag: 0.93,
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x4E7A32, alpha: [0.8, 0], light: "world", maxParticles: 50
                },
                {
                    name: "drop", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.12],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x6FA83C, alpha: [0.6, 0], light: "world", maxParticles: 36
                }
            ]
        },
        wall: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "stop", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 5, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.05, 0.16],
                    lifetime: [4, 8], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xD8E8C0, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 16
                },
                {
                    name: "scatter", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "notes", fallback: 8 } },
                    shape: { kind: "arc", radius: 0.4, arcDegrees: 150 },
                    direction: "outward", speed: [0.03, 0.12],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x6FA83C, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "recoil", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "notes", fallback: 10 } },
                    shape: { kind: "arc", radius: 0.42, arcDegrees: 150, rotation: [0, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x6FA83C, alpha: [0.5, 0], light: "world", maxParticles: 44
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_constrict", 1, ConstrictDefinition);
