/**
 * 角钻 / horndrill 的客户端表现。
 *
 * 一句话：角的螺旋越转越快，锁定的一条钻路先亮起来；随后施法者贴着这条线钻过去，钻尖的碎石与火星沿路
 * 甩开，贯穿目标的那一刻在它身上炸开一圈钻花。
 * 色相家族：金属灰与暖石色（0xC9A66B / 0xA08C6E + 近白 0xE8DFC8 / 火星 0xFFD98A）为主体，钻尖的高光最亮。
 * 拍子：起（windup 螺旋聚拢）→ 定（mark 钻路与宽度预览，持续蓄势）→ 钻（bore 逐刻推进）→ 击（gore 贯穿 / miss 扎空）。
 * 范围：mark 的钻路沿 `data.path` 的两端顶点画出（世界几何，不被缩放），服务端已把线裁到真实墙面；
 *   宽度由落点预览环读取 `data.scale = 实际判定半径 / 0.6`；玩家看到的那条亮线与圆口就是要让开的位置。
 * 运动：唯一的钻头贴本人前侧（`data.front`，随本体移动），钻过去时火星与碎屑沿路甩出，钻尖本身在旋转；
 *   命中与扎空都落在服务端回执的实际首体接触点上。
 * 数：`data.bore`（物攻派生）决定钻屑与火星密度，`data.scale`（判定半径派生）同时放大钻头与预览环。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HornDrillDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 16 },
            exit: { drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.9, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.12], spread: 14, spin: 40,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xFFD98A, alpha: [0.8, 0], light: "full", bloom: 0.15, maxParticles: 40
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], spin: 30,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8A7A62, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        mark: {
            duration: 0,
            exit: { stop: 0, drain: 22 },
            emitters: [
                {
                    name: "lane", bind: "path", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    shape: { kind: "polyline" }, rate: { data: "bore", fallback: 18 },
                    direction: "shape", speed: [0.0, 0.02], spread: 4,
                    lifetime: [6, 12], size: [0.18, 0.03],
                    color: 0xC9A66B, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "lane_dust", bind: "path", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" }, rate: { data: "bore", fallback: 12 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0x6E5A44, alpha: [0.5, 0], light: "world", maxParticles: 90
                }]
        },
        bore: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                
                {
                    name: "sparks", bind: "source", offset: [0, 0.8, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "bore", fallback: 24 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.4], spread: 30, drag: 0.9,
                    lifetime: [5, 10], size: [0.07, 0.01],
                    color: 0xFFD98A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 120
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.5, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: { data: "bore", fallback: 16 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26, gravity: 0.06, drag: 0.93,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0x8A7A62, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        gore: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "pierce", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "bore", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.5], spread: 24,
                    lifetime: [6, 12], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "chips", bind: "point", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "bore", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.34], spread: 30, gravity: 0.09, drag: 0.94,
                    lifetime: [12, 22], size: [0.16, 0.04],
                    color: 0x9A8A72, alpha: [0.8, 0], light: "world", maxParticles: 60
                }]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "chips", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "bore", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.08, 0.32], spread: 30, gravity: 0.08, drag: 0.93,
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0x8A7A62, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "scuff", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], spread: 12,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0x8A7A62, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_horndrill", 1, HornDrillDefinition);

// One fixed drill follows the actual body; emitted grit remains an auxiliary short trail.
WorldCombatClient.scene("world_combat:move_horndrill/drill", 1, frame => {
    const entry: CombatSceneEntry<any> = JSON.parse(frame.data()), data = entry.data || {};
    if (entry.lifecycle || data.lifecycle) return;
    const raw = frame.anchor(String(data.actor || entry.source || ""));
    if (!raw || !Array.isArray(data.direction)) return;
    const body = JSON.parse(raw);
    if (!body) return;
    const radius = Math.max(.45, Number(data.girth) || .6), front = body.width * .5 + radius * .4;
    const x = body.x + data.direction[0] * front, y = body.y + body.height * .5, z = body.z + data.direction[2] * front;
    frame.sprite("cobblemon:particle/generic/drill", x, y, z, radius * 1.4,
        (frame.serverTick() + frame.partialTick()) * 28 % 360, 0xFFE8DFC8 | 0, 0, true);
});
