/**
 * 换场 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者脚下先结出一圈品红的法阵，接着一道念力从法阵向外扫过战场、把所有被圈住的领域用光带连起来；
 *   每处领域在归属翻转时绽放一次，法阵在念力走完一圈后收束；没有可换的领域时只留下一声空响。
 *
 * 色相家族：品红（0xE07AD8）为主体，近白（0xFBE3F6）做高光与法阵边缘；没有第二个色相。
 * 层次：结阵（起手，环向里收）／扫场与连点（念力沿路径扫过 + 大环铺开）／翻转（每处领域各绽一次）／空。
 * 起击收：sigil（结阵）→ swap（扫场并连起各领域）→（无领域时）empty。
 * 范围：`swap` 的 `data.path` 是服务端给出的各领域中心（固定点），光带连到的每一处就是被换的领域；
 *   大环绑落点、fit none，半径按 `data.scale`（实际换场半径 / 4）推出，画出来的圈就是法阵波及的范围。
 * 运动：念力从落点向外扫开、沿路径连起各点；领域处向上绽放；无领域时空环收缩。
 * 数：法阵圈数绑 `data.waves`（等级派生），光点数绑 `data.motes`（特攻派生），
 *   实际被换的领域数 `data.fields`（以及收到的 taken、交出的 given）决定亮度 `data.intensity`。
 */
const CourtChangeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        sigil: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "sigil_ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 16, shape: { kind: "ring", radius: 1.2 },
                    direction: "inward", speed: [0.04, 0.12], spin: 8,
                    lifetime: [10, 16], size: [0.3, 0.6], sizeMode: "index",
                    color: 0xE07AD8, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "sigil_mote", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 14, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFBE3F6, alpha: [0.7, 0], light: "full", maxParticles: 34
                }
            ]
        },
        swap: {
            duration: 44,
            exit: { stop: 18, drain: 28 },
            emitters: [
                {
                    name: "swap_ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering2",
                    burst: { count: { data: "waves", fallback: 2 }, interval: 7 },
                    shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [18, 28], size: [0.6, 1.1], sizeMode: "index",
                    color: 0xFBE3F6, alpha: [0.55, 0], light: "full", maxParticles: 44
                },
                {
                    name: "swap_thread", bind: "path", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    shape: { kind: "polyline" }, rate: 120, direction: "shape", speed: [0.03, 0.12], trail: { minDistance: 0.12 },
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xE07AD8, alpha: [0.9, 0], light: "full", maxParticles: 200
                },
                {
                    name: "swap_bloom", bind: "path", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    shape: { kind: "polyline" }, rate: 26, direction: "shape", speed: [0.05, 0.18],
                    lifetime: [12, 22], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xE07AD8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "swap_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 24 } }, shape: { kind: "ring", radius: 3.2 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.94,
                    lifetime: [16, 28], size: [0.06, 0.01],
                    color: 0xE07AD8, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        },
        empty: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "empty_ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.3, 0.06],
                    color: 0xFBE3F6, alpha: [0.3, 0], light: "world", maxParticles: 18
                },
                {
                    name: "empty_mote", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xE07AD8, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_courtchange", 1, CourtChangeDefinition);
