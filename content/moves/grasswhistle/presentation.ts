/**
 * 草笛 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者含着草叶、音孔亮起 → 一声哨音沿直线笔直扎出，一圈圈声波串成一条会动的音束、穿过第一个
 *   目标继续朝后延伸 → 被扎穿的人头顶冒起 Z；如果这一声裂了，音束在起点就散成一撮走音的音符。
 *
 * 色相家族：叶绿（0x7CC24E）为主体音束与波纹，亮黄绿（0xB6E06A）做细节，近白（0xEFFBD8）只给音束核心与睡下的高光。
 * 拍子：起 windup（含叶）→ 吹 beam（一瞬铺开的细线）→ 眠 sleep（头顶 Z）／裂 crack（起点散音符）。
 * 范围：beam 的 `lance` 绑在施法者身上、`fit: "world"`，shape 用 `data.span`（墙截出的实际音线长度）画出
 *   一条沿 `data.direction` 的直线；线到哪，就唱到哪——玩家一眼看出只有这条线会被带走，打墙就短一截。
 * 运动：音束一次铺开，`data.flow`（音的推进）决定线条与波纹串推进的快慢；sleep 的 Z 自下而上升起。
 * 数：`data.shrills`（特攻与等级换算）决定音束上的波纹与线条数量；`data.lane`（体宽换算）决定线内环的半径。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const GrassWhistleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "leaf", bind: "source", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.07], spin: 30,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xEFFBD8, alpha: [0.8, 0], light: "full", maxParticles: 22
                },
                {
                    name: "tune", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 6, shape: { kind: "circle", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.04], spin: 20,
                    lifetime: [10, 16], size: [0.18, 0.04],
                    color: 0x7CC24E, alpha: [0.6, 0], light: "full", maxParticles: 18
                }
            ]
        },
        beam: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    // 一次铺开的瞬时细线：长度就是 `data.span`（墙截出的实际音线长），`fit:"world"` 让判定与画面共用同一格数。
                    name: "lance", bind: "point", fit: "world", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "line", length: { data: "span", fallback: 10 } }, orient: "direction",
                    burst: { count: { data: "lines", fallback: 20 } }, direction: "shape",
                    speed: { data: "flow", fallback: 0.2 },
                    lifetime: [8, 14], size: [0.22, 0.04],
                    color: 0x7CC24E, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "lance_core", bind: "point", fit: "world", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "line", length: { data: "span", fallback: 10 } }, orient: "direction",
                    burst: { count: { data: "shrills", fallback: 5 } }, direction: "shape",
                    speed: { data: "flow", fallback: 0.2 },
                    lifetime: [7, 12], size: [0.14, 0.03],
                    color: 0xEFFBD8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "rings", bind: "point", fit: "world", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    shape: { kind: "ring", radius: { data: "lane", fallback: 0.7 }, rotation: [90, 0, 0] },
                    orient: "direction", burst: { count: { data: "shrills", fallback: 5 } },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [12, 18], size: [0.26, 0.06],
                    color: 0xB6E06A, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        sleep: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "zzz", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    burst: { count: { data: "shrills", fallback: 5 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.22, 0.06], sizeMode: "sin",
                    color: 0xB08CFF, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "settle", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 22 }, shape: { kind: "ring", radius: { data: "lane", fallback: 0.7 } },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [10, 16], size: [0.2, 0.06],
                    color: 0x7CC24E, alpha: [0.55, 0], light: "full", maxParticles: 30
                }
            ]
        },
        crack: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "rasp", bind: "source", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "shrills", fallback: 5 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.9, gravity: 0.01,
                    lifetime: [10, 18], size: [0.18, 0.03], spin: 40,
                    color: 0x9BBF6A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        immune: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shrug", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.2, 0.06],
                    color: 0xEFFBD8, alpha: [0.55, 0], light: "full", maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "gone", bind: "point", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.01,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x7CC24E, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_grasswhistle", 1, GrassWhistleDefinition);
