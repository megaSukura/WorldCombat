/**
 * 紧束 / wrap 的客户端表现。
 *
 * 一句话：藤蔓在身侧盘起（起）→ 甩出一圈藤裹住目标（甩→裹）→ 目标身上一圈缠到头颈的藤茧缓慢收紧、
 * 每绞一下沿身体炸开一圈藤屑（绞）→ 藤茧散开叶片落下（解）／被外力踹开时向两侧崩开（撕）。
 * 色相家族：淡橄榄绿（0x7E9C5A，高光 0xD9E3C0）为主，碎屑用暖米 tinydust；单一色相，比缠绕的饱和绿更灰更淡。
 * 拍子：起 gather → 甩 lash → 裹 seize → 持 coil（藤茧，持续）→ 绞 crush（周期）→ 解 release / torn / whiff。
 * 范围：seize 与 coil 都绑目标、画在目标身上，说明「被裹住的是它」；cyl 长度绑 `data.height`（目标身高派生），
 *      画出的藤茧高度就是被裹住的高度。
 * 运动：藤茧自下而上箍紧，`data.pulses` 越多收得越紧；crush 时藤屑向外炸，torn 时沿水平两侧崩开。
 * 数：藤屑数量绑 `data.notes`（物攻派生），绞击强度绑 `data.intensity`（本绞威力 / 18），收紧档位绑 `data.pulses`。
 * 参照节：视觉语言第一、二、三、四、五、六、七、九节（持续状态少而稳）。
 */
const WrapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "spool", bind: "source", offset: [0, 0.02, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    rate: 10, shape: { kind: "torus", radius: 0.36, thickness: 0.06, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.07],
                    spin: 6, lifetime: [7, 13], size: [0.14, 0.03],
                    color: 0x7E9C5A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        lash: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "reach", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 10 },
                    shape: { kind: "polyline" },
                    direction: "away", speed: [0.04, 0.14], spread: 16,
                    spin: 14, lifetime: [6, 12], size: [0.14, 0.02], sizeMode: "index",
                    color: 0x7E9C5A, alpha: [0.7, 0], light: "world", maxParticles: 44
                }
            ]
        },
        seize: {
            duration: 24,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "cinch", bind: "target", offset: [0, 0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: { data: "notes", fallback: 14 }, interval: 2, repeats: 3 },
                    shape: { kind: "cylinder", radius: 0.42, length: { data: "height", fallback: 1.3 }, thickness: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [9, 15], size: [0.32, 0.05], sizeMode: "index",
                    color: 0x7E9C5A, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [4, 8], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        coil: {
            duration: 0,
            exit: { stop: 2, drain: 12 },
            emitters: [
                {
                    name: "cocoon", bind: "target", offset: [0, 0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: 7, shape: { kind: "cylinder", radius: 0.44, length: { data: "height", fallback: 1.3 }, thickness: 0.55 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [14, 22], size: [0.3, 0.22],
                    color: 0x7E9C5A, alpha: [0.34, 0], light: "world", maxParticles: 22
                },
                {
                    name: "motes", bind: "target", offset: [0, 0.6, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 5, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "down", speed: [0.01, 0.04],
                    spin: 8, gravity: 0.01, lifetime: [16, 24], size: [0.07, 0.01],
                    color: 0xD9E3C0, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        },
        crush: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "tighten", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: { data: "notes", fallback: 14 } },
                    shape: { kind: "cylinder", radius: 0.44, length: { data: "height", fallback: 1.3 }, thickness: 0.5 },
                    direction: "inward", speed: [0.04, 0.15],
                    lifetime: [7, 13], size: [0.24, 0.04], sizeMode: "index",
                    color: 0x7E9C5A, alpha: [0.8, 0], light: "world", maxParticles: 50
                },
                {
                    name: "fibre", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "notes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.18], spread: 40,
                    spin: 10, gravity: 0.04, drag: 0.92,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xD9E3C0, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        release: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fall", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.48 },
                    direction: "down", speed: [0.03, 0.12],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x7E9C5A, alpha: [0.6, 0], light: "world", maxParticles: 46
                }
            ]
        },
        torn: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "rip", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.12, 0.36], spread: 18,
                    spin: 18, lifetime: [6, 12], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xD9E3C0, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        whiff: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "loose", bind: "source", offset: [0, 0.1, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 10 },
                    shape: { kind: "arc", radius: 0.5, arcDegrees: 160 },
                    direction: "outward", speed: [0.04, 0.16],
                    spin: 12, lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x7E9C5A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wrap", 1, WrapDefinition);
