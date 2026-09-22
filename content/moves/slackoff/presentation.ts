/**
 * 偷懒 / Slack Off 的粒子语言。
 *
 * 一句话：它一屁股瘫坐下去，脚边扬起一圈慵懒的尘土，接着头顶慢慢冒起一串睡意的气泡；缓过来时抖一抖起身。
 * 色相家族：土黄 0xC9A66B 作瘫坐尘，暖白 0xFFF0D0 作高光，睡意蓝 0x8FA6C4 只出现在气泡层。
 * 拍子：起（windup）／摊（flop）／睡（loaf，持续整段倦怠）／起（rise）。
 * 范围：作用于自己，绑 source（fit body）；瘫坐尘环半径随 data.scale（体型派生），玩家看得出是这具身体摊下。
 * 机制驱动：flop 的尘土数绑定 data.dust（体重派生）；loaf 的气泡速率绑定 data.snores、整段时长随 data.loaf（倦怠时长）——
 *   身板越沉，瘫坐越重、气泡越密、倦得越久。
 */
const SlackoffDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "sink", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "circle", radius: 0.45 }, direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC9A66B, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        flop: {
            duration: 28,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "thud", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } }, direction: "outward", speed: [0.06, 0.18], drag: 0.9,
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0xC9A66B, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "squash", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2 }, shape: { kind: "circle", radius: { data: "scale", fallback: 1 } }, direction: "outward", speed: [0.03, 0.08],
                    lifetime: [12, 20], size: [0.26, 0.6],
                    color: 0xFFF0D0, alpha: [0.6, 0], light: "full", maxParticles: 12
                },
                {
                    name: "huff", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xFFF0D0, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        loaf: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "zzz", bind: "source", offset: [0, 0.75, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    rate: { data: "snores", fallback: 6 }, shape: { kind: "sphere", radius: 0.35 }, direction: "up", speed: [0.006, 0.02],
                    lifetime: [22, 36], size: [0.14, 0.03],
                    color: 0x8FA6C4, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "bubble", bind: "source", offset: [0, 0.6, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    rate: 4, shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.004, 0.014],
                    lifetime: [20, 32], size: [0.08, 0.02],
                    color: 0xDCE6F0, alpha: [0.45, 0], light: "world", maxParticles: 20
                },
                {
                    name: "breath", bind: "source", offset: [0, 0.25, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.005, 0.02],
                    lifetime: [14, 22], size: [0.05, 0.01],
                    color: 0xC9A66B, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        rise: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "shake", bind: "source", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.45 }, direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFF0D0, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_slackoff", 1, SlackoffDefinition);
