/**
 * 传递礼物 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把手里那件东西托到胸前，暖光沿一条缎带铺成的线飞到空手的伙伴身上，落进它的道具位，
 *   伙伴身上亮起一圈接收的金光。
 *
 * 色相家族：礼物金（0xF2C66A）画缎带与光点，暖白（0xFFF2CC）做高光，缎带粉（0xE8A0B8）只落在缎带的小面积上。
 * 层次：起（windup 托起）／托（offer 手心亮）／飞（stream 沿 path 直线）／收（receive 接收光）／
 *   落空（empty 空手、full 对方有物、sealed 被查封、refused 被拒）。
 * 起击收：windup 14t → offer 20t → stream 26t → receive 26t；落空各 22t。
 * 范围：这是一个点到点的递送，画面沿 data.path 的连线走，不铺开面积。
 * 运动：缎带与光点从施法者手心沿直线飞向伙伴，末端收拢落定；接收时在伙伴身上向外散开一圈金光。
 * 数：缎带数绑 data.ribbons（特攻派生），沿途光点绑 data.motes（等级派生），接收光尘绑 data.shine（亲密度派生）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BestowDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "windup_glow", bind: "source", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "ribbons", fallback: 10 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xF2C66A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        offer: {
            duration: 20,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "offer_core", bind: "source", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.93,
                    lifetime: [10, 18], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xFFF2CC, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "offer_ribbon", bind: "source", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    rate: 8, shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.02, 0.1],
                    gravity: 0.01, drag: 0.92,
                    lifetime: [12, 20], size: [0.1, 0.02], spin: 12,
                    color: 0xE8A0B8, alpha: [0.8, 0], light: "full", maxParticles: 26
                }
            ]
        },
        stream: {
            duration: 26,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "stream_ribbon", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: { data: "ribbons", fallback: 10 }, trail: { minDistance: 0.26 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.03, 0.12],
                    lifetime: [7, 12], size: [0.14, 0.02],
                    color: 0xF2C66A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "stream_motes", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 8 }, trail: { minDistance: 0.18 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.02, 0.09], spread: 20,
                    gravity: 0.01, drag: 0.94,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFF2CC, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "stream_confetti", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    rate: 12, trail: { minDistance: 0.24 }, shape: { kind: "polyline" }, direction: "shape", speed: [0.02, 0.1],
                    gravity: 0.012, drag: 0.93, spin: 16,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xE8A0B8, alpha: [0.75, 0], light: "full", maxParticles: 60
                }
            ]
        },
        receive: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "receive_burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "shine", fallback: 6 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.93,
                    lifetime: [10, 20], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xFFF2CC, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "receive_star", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 8, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.1], gravity: -0.002, drag: 0.95,
                    lifetime: [14, 24], size: [0.12, 0.03], spin: 8,
                    color: 0xF2C66A, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "receive_present", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/present",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.3, 0.7], sizeMode: "sin",
                    color: 0xE8A0B8, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        empty: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "empty_puff", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 }, direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.16, 0.28], color: 0x9AA0A8, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        },
        full: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "full_bump", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.16, 0.04], color: 0xF2C66A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        sealed: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "sealed_reject", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.1, 0.02], color: 0x8C6BD8, alpha: [0.6, 0], light: "full", maxParticles: 22
                }
            ]
        },
        refused: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "refused_dust", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.07, 0.01], color: 0x9AA0A8, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bestow", 1, BestowDefinition);
