/**
 * 巨力锤 / gigatonhammer 的客户端表现。
 *
 * 一句话：施法者连人带锤旋身蓄力，巨锤由同一个姿态真实抬高；锤头沿真实弧线下落（过顶式）或沿真实水平弧扫过
 *   （横扫式），锤头扫到哪就亮到哪；过顶式触地后才从接触点沿真实地表掀起前推的冲击波，按真实路径亮起；抡完
 *   身上留下一层力竭的标识。
 * 色相家族：冷钢灰（0x9AA4AE、0xC9D4DE、0xE6ECF2）做锤与冲击波，白（0xFFFFFF）只给命中那一抹，暖火星只作细节。
 * 拍子：起 wind/raise（蓄力抬锤）→ 挥 swing（当前真实锤头段/子弧）→ 砸 slam（触地）→ 波 wave（真实地表分三段）→
 *   击 hit / wave-hit → 收 mark/spent。
 * 范围：slam 的靠近击用 `data.radius` 的一圈；wave 的每一段按 `data.path` 四点画出（与判定同一组真实地表顶点）；
 *   `data.scale` 让画面尺寸跟着机制范围走，`data.front` 给出这一段走到了三段的第几段。
 * 运动：wind 的碎屑绕身快速旋转、swing 的锤头段由服务端每刻给出真实端点、wave 的地纹沿真实地表按真实时刻推进。
 * 数：`data.dust`（物攻派生）绑定发射量，`data.intensity`（锤击威力派生）抬高亮度，`data.sweep` 区分两种形态，
 *   `data.linger` 绑定禁复标记的时长。
 * 锤身：`world_combat:move_gigatonhammer/hammer` 由自定义场景逐帧画出线框锤头 + 锤柄；蓄力按 serverTick 从
 *   `data.start`/`data.duration` 抬起，挥动时每刻读服务端给出的真实 `data.head`，不假借环状粒子冒充锤身。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const GigatonhammerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wind: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "spin", bind: "source", offset: [0, 0.9, 0], height: 0.8, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "ring", radius: 0.9, rotation: [90, 0, 0] },
                    direction: "shape", speed: [0.18, 0.5], spread: 8, drag: 0.95,
                    lifetime: [7, 12], size: [0.11, 0.02],
                    color: 0xC9D4DE, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "steel", bind: "source", offset: [0, 0.9, 0], height: 0.8, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 16, shape: { kind: "ring", radius: 1.0, rotation: [90, 0, 0] },
                    direction: "shape", speed: [0.2, 0.5], spread: 10, spin: 8,
                    lifetime: [6, 11], size: [0.13, 0.03],
                    color: 0xE6ECF2, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        swing: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "trail", bind: "path", fit: "world", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "shape", speed: [0.05, 0.18], spread: 12,
                    lifetime: [5, 10], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xE6ECF2, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.02, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "dust", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.06, 0.2], spread: 24,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        slam: {
            duration: 30,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: 26, shape: { kind: "ring", radius: { data: "radius", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.12, 0.4], drag: 0.93,
                    lifetime: [9, 16], size: [0.5, 0.12], sizeMode: "index",
                    color: 0xC9D4DE, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "dust", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.12, 0.44], spread: 26,
                    lifetime: [8, 15], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 80
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 70, shape: { kind: "sphere", radius: 0.5 }, direction: "up", speed: [0.06, 0.28], spread: 30,
                    gravity: 0.05, drag: 0.92, lifetime: [12, 20], size: [0.4, 0.1], sizeMode: "sin",
                    color: 0xB9A88C, alpha: [0.5, 0], light: "world", maxParticles: 120
                }
            ]
        },
        wave: {
            duration: 22,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "lane", bind: "path", shape: { kind: "polygon" }, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 80, direction: "outward", speed: [0.1, 0.4], spread: 10, gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xB9A88C, alpha: [0.6, 0], light: "world", maxParticles: 140
                },
                {
                    name: "laneSteel", bind: "path", shape: { kind: "polygon" }, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 50, direction: "outward", speed: [0.14, 0.5], spread: 12,
                    lifetime: [7, 13], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 110
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "crack", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "dust", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.1, 0.4], spread: 24,
                    lifetime: [7, 13], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.42, maxParticles: 60
                },
                {
                    name: "spall", bind: "point", offset: [0, 0.32, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "dust", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.36 }, direction: "outward", speed: [0.14, 0.42], spread: 28, gravity: 0.08,
                    lifetime: [9, 15], size: [0.1, 0.02],
                    color: 0x9AA4AE, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        "wave_hit": {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "thud", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: { data: "dust", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.06, 0.24], spread: 24,
                    lifetime: [8, 14], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xC9D4DE, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        mark: {
            duration: 30,
            exit: { stop: 16, drain: 12 },
            emitters: [
                {
                    name: "imprint", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "point" }, direction: "up", speed: [0, 0],
                    lifetime: [22, 30], size: { data: "scale", fallback: 1 }, sizeMode: "linear",
                    color: 0x6B6257, alpha: [0.5, 0], light: "world", maxParticles: 2
                },
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "circle", radius: { data: "shockLength", fallback: 4.8 } },
                    direction: "up", speed: [0.02, 0.1], spread: 20, gravity: 0.04, drag: 0.92,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xB9A88C, alpha: [0.4, 0], light: "world", maxParticles: 70
                }
            ]
        },
        spent: {
            duration: { data: "linger", fallback: 100 },
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "source", offset: [0, 0.15, 0], height: 0.1, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], spread: 16, gravity: -0.01, drag: 0.93,
                    lifetime: [16, 26], size: [0.4, 0.14], sizeMode: "sin",
                    color: 0x8A8F96, alpha: [0.3, 0], light: "world", maxParticles: 30
                },
                {
                    name: "heavy", bind: "source", offset: [0, 0.6, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 5, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.14], drag: 0.94,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x9AA4AE, alpha: [0.4, 0], light: "full", bloom: 0.12, maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gigatonhammer", 1, GigatonhammerDefinition);

/**
 * 锤身本体：线框锤头 + 锤柄，由服务端姿态驱动。蓄力（raise）读 start/duration 把锤从脚下抬起并旋转；
 * 挥动（swing）每刻读服务端给出的真实 root/head。固定几何、无粒子生灭、无额外实体。
 */
const GigatonhammerHammerScene = "world_combat:move_gigatonhammer/hammer";
function gigatonhammerNumber(value: any, fallback: number): number { return typeof value === "number" && isFinite(value) ? value : fallback; }
function gigatonhammerVector(value: any): number[] | null {
    if (Array.isArray(value) && value.length >= 3) {
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    }
    return null;
}

WorldCombatClient.scene(GigatonhammerHammerScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const root = gigatonhammerVector(data.root);
    if (root === null) return;
    const scale = Math.max(0.5, Math.min(2.4, gigatonhammerNumber(data.scale, 1)));
    const sweep = data.sweep === 1 || data.sweep === true;
    let head = gigatonhammerVector(data.head);
    if (head === null) {
        // 蓄力：按真实进度把锤从脚边抬到过顶，并随进度转起来。
        const start = gigatonhammerNumber(data.start, frame.serverTick());
        const duration = Math.max(1, gigatonhammerNumber(data.duration, 12));
        const progress = Math.max(0, Math.min(1, (frame.serverTick() - start) / duration));
        const angle = progress * Math.PI * 2;
        const length = (0.6 + 1.5 * progress) * scale;
        head = [root[0] + Math.cos(angle) * 0.35 * scale, root[1] + length, root[2] + Math.sin(angle) * 0.35 * scale];
    }
    // 锤柄：从身体中心到锤头。
    const handle = (sweep ? 230 : 200) << 24 | 0xC9D4DE;
    frame.line(root[0], root[1], root[2], head[0], head[1], head[2], handle | 0);
    // 锤头：以 head 为中心的线框方块，尺寸随 scale。
    const s = gigatonhammerNumber(data.headRadius, .45) / Math.sqrt(3);
    const cx = head[0], cy = head[1], cz = head[2];
    const corners = [
        [cx - s, cy - s, cz - s], [cx + s, cy - s, cz - s], [cx + s, cy - s, cz + s], [cx - s, cy - s, cz + s],
        [cx - s, cy + s, cz - s], [cx + s, cy + s, cz - s], [cx + s, cy + s, cz + s], [cx - s, cy + s, cz + s]
    ];
    const color = (245 << 24 | 0xE6ECF2) | 0;
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (let i = 0; i < edges.length; i++) {
        const a = corners[edges[i][0]], b = corners[edges[i][1]];
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], color);
    }
});
