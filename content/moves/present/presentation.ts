/**
 * 礼物 / present 的客户端表现。
 *
 * 一句话：掌心托起的礼盒沿一条低弧飞向落点（盒身跟着缎带与纸屑），当着落点那个人打开——多数时候炸出一圈
 * 红色纸屑与冲击（机关，打伤圈内非友方），偶尔散出粉色的糖与爱心（糖果，反而治好了落点旁那个人）。
 *
 * 色相家族：礼盒红金（0xE05050／0xFFD166）为主体（开盒、机关）；糖果粉（0xFF9AC1／0xFFD0E4）只用于
 *   掷中糖果这一个结果——两种结果各有一套颜色，是这招的核心信息，故允许第二色相。
 * 拍子：起 windup（托盒系带）→ 掷 throw（盒身飞行＋纸屑尾迹）→ 开 open（盒盖弹开）＋ 机关 trap（弹簧拳套＋短弹簧线，
 *   只在机关档）／炸 blast（红金纸屑）／甜 candy（糖体、粉光与心）／受治 treat（糖与心落在真正被治好的人身上）／空 empty。
 * 分支由服务端决定：机关档同一开盒刻播 trap，糖果档播 candy；treat 是治疗对象处的独立回执。
 * 范围：open / blast 的范围用服务端传的 `data.scale`（机关半径 / 参考半径）放大，落点与圈内就是会被炸到的地。
 * 运动：盒子沿低弧飞（实物外观），纸屑在开盒点向外迸开、糖与心向上飘；`tier` 越重，冲量越大。
 * 数：`data.motes`（物攻与等级换算）决定纸屑数量，`data.tier`（1.5／1／0.65 档）决定爆炸的尺寸与强度，
 *   `data.healed`（实际治疗量）决定糖果层的光量。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PresentDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "ribbon", bind: "source", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFFD166, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 26
                },
                {
                    name: "dust", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    rate: 4, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04], spin: 40,
                    lifetime: [10, 16], size: [0.14, 0.04],
                    color: 0xE05050, alpha: [0.6, 0], light: "world", maxParticles: 14
                }
            ]
        },
        throw: {
            duration: 36,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "trail", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "shape", speed: [0.01, 0.05], spin: 60,
                    lifetime: [8, 14], size: [0.11, 0.03],
                    color: 0xFFD166, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        open: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "box", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/present",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "up", speed: [0, 0.02],
                    lifetime: [16, 22], size: [0.7, 0.5], spriteFrom: "age", sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [1, 0.2], light: "full", bloom: 0.2, maxParticles: 2
                },
                {
                    name: "pop", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.2], spin: 40,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0xFFD166, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        blast: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "paper", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.32], drag: 0.94, spin: 60,
                    lifetime: [10, 18], size: [0.18, 0.05], sizeMode: "index",
                    color: 0xE05050, alpha: [0.95, 0], light: "world", maxParticles: 80
                },
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "ring", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.16], spread: 8,
                    lifetime: [10, 16], size: [0.26, 0.12],
                    color: 0xFFD166, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        trap: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    // 弹簧拳套：机关档才播的盒口主形，与开盒同一刻弹出。
                    name: "fist", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/fist",
                    burst: { count: 1, at: 0 }, shape: { kind: "point" },
                    direction: "up", speed: [0.1, 0.2],
                    lifetime: [7, 11], size: [0.55, 0.45], spriteFrom: "age", sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [1, 0.15], light: "full", bloom: 0.2, maxParticles: 2
                },
                {
                    // 短弹簧线：沿盒口向上的一小截，数量随盒屑派生。
                    name: "spring", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "line", length: 0.6 },
                    direction: "up", speed: [0.0, 0.03],
                    lifetime: [5, 9], size: [0.08, 0.02],
                    color: 0xFFD166, alpha: [0.9, 0], light: "full", maxParticles: 12
                }
            ]
        },
        candy: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    // 糖体：糖果档才有的盒口主形，粉糖从盒里弹出。
                    name: "candy_body", bind: "point", fit: "none", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: 1, at: 0 }, shape: { kind: "point" },
                    direction: "up", speed: [0.04, 0.1],
                    lifetime: [16, 22], size: [0.45, 0.3], sizeMode: "linear",
                    color: 0xFF9AC1, alpha: [1, 0.3], light: "full", bloom: 0.3, maxParticles: 2
                },
                {
                    name: "sugar", bind: "point", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [12, 20], size: [0.1, 0.01],
                    color: 0xFFD0E4, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "hearts", bind: "point", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "healed", fallback: 8 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.95,
                    lifetime: [14, 22], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0xFF9AC1, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "glow", bind: "point", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 8, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.18, 0.4],
                    color: 0xFFD0E4, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        treat: {
            // 受治疗者回执：糖与心绑在真正被治好的人身上，不再停在盒点。
            duration: 30,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "treat_body", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: 1, at: 0 }, shape: { kind: "point" },
                    direction: "up", speed: [0.05, 0.12],
                    lifetime: [16, 24], size: [0.5, 0.32], sizeMode: "linear",
                    color: 0xFF9AC1, alpha: [1, 0.3], light: "full", bloom: 0.3, maxParticles: 2
                },
                {
                    name: "treat_sugar", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [12, 20], size: [0.1, 0.01],
                    color: 0xFFD0E4, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "treat_hearts", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "healed", fallback: 8 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.95,
                    lifetime: [14, 22], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0xFF9AC1, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_present", 1, PresentDefinition);
