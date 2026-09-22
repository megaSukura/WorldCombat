/**
 * 唱歌 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者唇边聚起音符 → 每一句都从身上荡出一圈靛紫色声波、穿过墙与同伴往外滚，同时一串音符
 *   向上升起 → 听够的人头顶浮起 Z 和一撮困意音符；还不够的人身上只多一圈睡意环。
 *
 * 色相家族：靛紫（0x9B7BD8）为主体声波与音符，深紫（0x5A3E96）压在核心，近白紫（0xE8D9FF）只给起手与「睡下」的高光。
 * 拍子：起 windup（攒音符）→ 唱 note（声波一圈圈荡出＋音符升起）→ 眠 sleep（头顶 Z）／困 drowsy（睡意环）；余韵 linger 随时间收拢。
 * 范围：note 的声波绑在施法者身上、`fit: "none"`，按 `data.scale`（声场半径 ÷ 参考 5 格）放大定义几何，并用
 *   `data.expand`（半径 ÷ 20 刻）给一个向外速度，让波前在粒子寿命内正好走到真实声场边缘——画到哪，就唱到哪。
 * 运动：声波沿水平面向外滚、音符向上飘；drowsy 的环绑在目标身上向内收；sleep 的 Z 自下而上升起。
 * 数：`data.rings`（特攻与等级换算）决定声波与 Z 的数量与亮度；`data.stack`（已听句数）决定目标身上睡意音符的多少。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const SingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "breath", bind: "source", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "circle", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8D9FF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 22
                },
                {
                    name: "notes", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 7, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05], spin: 20,
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0x9B7BD8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 22
                }
            ]
        },
        note: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "wave", bind: "source", fit: "none", height: 0.12, offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: { data: "rings", fallback: 4 },
                    shape: { kind: "ring", radius: 0.35, rotation: [90, 0, 0] },
                    direction: "outward", speed: { data: "expand", fallback: 0.22 }, spread: 8,
                    lifetime: [18, 26], size: [0.3, 0.05], sizeMode: "linear", spin: 20,
                    color: 0x9B7BD8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "wave_core", bind: "source", fit: "none", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: { data: "rings", fallback: 3 },
                    shape: { kind: "ring", radius: 0.22, rotation: [90, 0, 0] },
                    direction: "outward", speed: { data: "expand", fallback: 0.22 }, spread: 5,
                    lifetime: [16, 24], size: [0.18, 0.04],
                    color: 0xE8D9FF, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "notes_up", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 10, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.07], spin: 24, spread: 30,
                    lifetime: [14, 24], size: [0.22, 0.04], sizeMode: "sin",
                    color: 0xB79CFF, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        drowsy: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "stack_notes", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "stack", fallback: 1 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05], spin: 20,
                    lifetime: [12, 20], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0x9B7BD8, alpha: [0.65, 0], light: "full", maxParticles: 30
                },
                {
                    name: "drowse_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.2, 0.06],
                    color: 0x5A3E96, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        sleep: {
            duration: 34,
            exit: { stop: 15, drain: 22 },
            emitters: [
                {
                    name: "zzz", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    burst: { count: { data: "rings", fallback: 5 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.22, 0.06], sizeMode: "sin",
                    color: 0xB08CFF, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "settle", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 26 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [12, 18], size: [0.3, 0.12],
                    color: 0x5A3E96, alpha: [0.55, 0], light: "full", maxParticles: 40
                }
            ]
        },
        immune: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shrug", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.2, 0.06],
                    color: 0xE8D9FF, alpha: [0.55, 0], light: "full", maxParticles: 22
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "rest_zzz", bind: "target", height: 1.0, offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    rate: 3, shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 28], size: [0.16, 0.06], sizeMode: "sin",
                    color: 0xB08CFF, alpha: [0.4, 0], light: "full", maxParticles: 14
                },
                {
                    name: "rest_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 4, shape: { kind: "ring", radius: { data: "ringRadius", fallback: 0.55 } },
                    direction: "inward", speed: [0.01, 0.03],
                    lifetime: [16, 24], size: [0.2, { data: "ringRadius", fallback: 0.55 }],
                    color: 0x9B7BD8, alpha: [0.3, 0], light: "full", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sing", 1, SingDefinition);
