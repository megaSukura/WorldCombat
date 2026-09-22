/**
 * 胜利之舞 / victorydance 的客户端表现。
 *
 * 一句话：脚边聚起金光、舞者立定行礼 → 每一步把脚步踏进地面、荡开一圈金环 → 终拍一顶桂冠在头顶升起，
 * 金色星点沿冠冕上浮；此后只要还在打，冠冕就一次次往上亮一下。
 * 色相家族：凯旋金 0xFFD75A 为主体，古铜 0xB07A2A 作脚下与余韵，近白 0xFFF3C8 只落在强调层。
 * 拍子：起（salute 0–16t）→ 踏（stamp 每拍 0–22t）→ 立冠（crown 0–36t）→ 冠（lit 持续）→ 续（rally）→ 落（fade）。
 * 范围：crown 的地环绑脚点、fit none，半径按 `data.scale`（实际冠冕半径 / 1.2）推出；stamp 的环贴脚下。
 * 运动：salute 金光自脚边聚起；stamp 金环向外扩张；crown 冠冕在头顶张开、星点上浮；lit 缓慢环绕。
 * 数：桂叶数量绑 `data.laurels`（攻防速之和与等级派生），踏步拍数绑 `data.beats`、当前第几拍绑 `data.index`；
 *   rally 的强度绑 `data.intensity`（延续后的剩余比例）。越强的个体画面里的金叶越密。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const VictoryDanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        salute: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "salute_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 12, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [9, 15], size: [0.34, 0.09],
                    color: 0xFFD75A, alpha: [0.5, 0], light: "full", maxParticles: 34
                },
                {
                    name: "salute_mote", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xFFF3C8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        stamp: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stamp_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 4, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 16], size: [0.36, 0.8], sizeMode: "index",
                    color: 0xFFD75A, alpha: [0.65, 0], light: "full", maxParticles: 18
                },
                {
                    name: "stamp_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "laurels", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.1], gravity: 0.03,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xB07A2A, alpha: [0.55, 0], light: "world", maxParticles: 70
                }
            ]
        },
        crown: {
            duration: 36,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "crown_ring", bind: "point", fit: "none", offset: [0, 0.07, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 1.2 },
                    direction: "outward", speed: [0.07, 0.2],
                    lifetime: [14, 22], size: [0.5, 1.05], sizeMode: "index",
                    color: 0xFFF3C8, alpha: [0.8, 0], light: "full", maxParticles: 12
                },
                {
                    name: "crown_stars", bind: "source", offset: [0, 0.75, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "laurels", fallback: 20 } },
                    shape: { kind: "ring", radius: { data: "crown", fallback: 1.2 } },
                    direction: "up", speed: [0.04, 0.14], spin: 24,
                    lifetime: [14, 24], size: [0.18, 0.05], sizeMode: "index",
                    color: 0xFFD75A, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 140
                },
                {
                    name: "crown_halo", bind: "source", offset: [0, 0.85, 0], height: 0.65,
                    particle: "world_combat_core:cobblemon/balls/capturestar",
                    burst: { count: 8, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "crown", fallback: 1.2 } },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [16, 28], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0xFFF3C8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        lit: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "lit_crown", bind: "source", offset: [0, 0.8, 0], height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "laurels", fallback: 10 }, shape: { kind: "ring", radius: { data: "crown", fallback: 1.2 } },
                    direction: "up", speed: [0.004, 0.018], spin: 14,
                    lifetime: [22, 38], size: [0.09, 0.02],
                    color: 0xFFD75A, alpha: [0.32, 0], alphaMode: "sin", light: "full", maxParticles: 34
                },
                {
                    name: "lit_dust", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.003, 0.012],
                    lifetime: [20, 34], size: [0.05, 0.01],
                    color: 0xFFF3C8, alpha: [0.2, 0], alphaMode: "sin", light: "world", maxParticles: 26
                }
            ]
        },
        rally: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "rally_ring", bind: "source", offset: [0, 0.1, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [12, 20], size: [0.45, 0.95], sizeMode: "index",
                    color: 0xFFD75A, alpha: [0.8, 0], light: "full", maxParticles: 22
                },
                {
                    name: "rally_star", bind: "source", offset: [0, 0.7, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "laurels", fallback: 16 } },
                    shape: { kind: "sphere_surface", radius: { data: "crown", fallback: 1.2 } },
                    direction: "up", speed: [0.05, 0.16], spin: 18,
                    lifetime: [12, 22], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFFF3C8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 90
                }
            ]
        },
        fade: {
            duration: 30,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "fall_laurel", bind: "source", offset: [0, 0.7, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "down", speed: [0.02, 0.06], gravity: 0.02,
                    lifetime: [16, 28], size: [0.08, 0.01],
                    color: 0xB07A2A, alpha: [0.6, 0], light: "world", maxParticles: 50
                },
                {
                    name: "last_halo", bind: "source", offset: [0, 0.85, 0], height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [14, 26], size: [0.06, 0.01],
                    color: 0xFFF3C8, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_victorydance", 1, VictoryDanceDefinition);
