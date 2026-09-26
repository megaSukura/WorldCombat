/**
 * 催眠术 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者眼眶亮起紫光、脑侧攒起一圈暗示光环 → 一条通视细线把自身与目标连起来，一道暗示波沿它真实
 *   飞过去 → 压过去的目标头顶浮起 Z 与一圈逐渐收拢的余韵环；压不过去则光环在它身上散成一撮困意的雾。
 *
 * 色相家族：靛紫（0x7D5BD8）为主体与推进光环，深紫（0x3B2A6B）只压在核心，近白紫（0xE8D9FF）只给眼与余韵高光。
 * 拍子：起 windup（攒环）→ 送 wave（细线相连、真实投射物沿它飞）→ 落 sleep（头顶 Z）／散 resist（散雾）／断 immune；余韵 linger 随时间收拢。
 * 范围：wave 的细线沿 `data.path`（自身与目标/空放落点两个真实顶点）连线，长度即真实凝视距离；飞行的前沿是真实投射物，细线本身不做沿线飞行。
 * 运动：暗示波由真实投射物承载、沿细线推进；sleep 的 Z 自下而上升起，resist 的环向外弹散。
 * 数：`data.rings`（特攻换算）决定细线密度、枪口爆发与落点 Z 的数量；`data.scale` 随落点半径缩放宽窄；`data.ringRadius`（剩余睡眠比例换算）决定余韵环大小。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HypnosisDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "eye", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 10, shape: { kind: "circle", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8D9FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "coil", bind: "source", height: 0.78,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 8, shape: { kind: "ring", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.09], spin: 30,
                    lifetime: [10, 16], size: [0.18, 0.04],
                    color: 0x7D5BD8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 26
                }
            ]
        },
        wave: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    // 通视细线：沿线采样的静态线，表示这一波要走的路线；真实飞行由投射物承担。
                    name: "thread", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    shape: { kind: "polyline" }, rate: { data: "rings", fallback: 6 },
                    direction: "shape", speed: [0.01, 0.04], spread: 6, spin: 30,
                    lifetime: [8, 14], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x7D5BD8, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    // 起手：眼眶与头侧攒出的紫光，暗示波从这里送出。
                    name: "muzzle", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "rings", fallback: 6 } }, shape: { kind: "circle", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8D9FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        sleep: {
            duration: 34,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "zzz", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    burst: { count: { data: "rings", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.22, 0.06], sizeMode: "sin",
                    color: 0xB08CFF, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "close", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 30 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [12, 18], size: [0.3, 0.12],
                    color: 0x3B2A6B, alpha: [0.6, 0], light: "full", maxParticles: 44
                }
            ]
        },
        resist: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "scatter", bind: "target", height: 0.78,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: { data: "rings", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.92,
                    lifetime: [10, 16], size: [0.16, 0.03],
                    color: 0x7D5BD8, alpha: [0.5, 0], light: "world", maxParticles: 50
                },
                {
                    name: "haze", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.2, 0.3],
                    color: 0x3B2A6B, alpha: [0.18, 0], light: "world", maxParticles: 20
                }
            ]
        },
        immune: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shield", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.22, 0.06],
                    color: 0xE8D9FF, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gone", bind: "point", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0x7D5BD8, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "rest_zzz", bind: "target", offset: [0, 0.35, 0], height: 1.0,
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
                    color: 0x7D5BD8, alpha: [0.3, 0], light: "full", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hypnosis", 1, HypnosisDefinition);
