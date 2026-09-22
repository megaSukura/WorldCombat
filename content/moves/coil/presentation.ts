/**
 * 盘蜷 / coil 的客户端表现。
 *
 * 一句话：施术者把身体一圈圈盘紧 → 能量环从身外一圈圈向里收拢、紫光越收越密 → 收到底后猛地向外一撑，
 *   一圈亮环荡开、紫白点四散；此后盘势还在的时间里，脚边一直有一圈极淡的紫环缓缓起伏。
 * 色相家族：紫罗兰 0x8A6FD8 为环与主体，深靛 0x5B4B9E 作脚下与余韵，近白 0xE6DEFF 只落在强调与细节层。
 * 拍子：起（draw 0–14t）→ 盘（coil 0–40t，每 2 刻收一圈）→ 撑（rise 0–32t）→ 存（hum 持续）→ 收（fade）。
 * 范围：本招作用在自己身上；draw/coil/hum/fade 绑 `source` 随体型缩放，rise 额外有一层绑 `point` 的地面环，
 *   半径按 `data.scale`（实际盘绕半径 / 1.0）推出，画出的圈就是盘势撑开的位置。
 * 运动：draw 紫光向内聚拢；coil 环一层层向里收、粒子随环收紧；rise 亮环向外一推到底；hum 环极慢起伏；fade 环向下散去。
 * 数：收紧的圈数绑 `data.coils`（防御与等级派生），撑定强调层绑 `data.gain`（本次实际抬起的级数派生）；盘得越厚、抬得越多，画面越密。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const CoilDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 14,
            exit: { stop: 5, drain: 11 },
            emitters: [
                {
                    name: "draw_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 10, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [9, 15], size: [0.3, 0.08],
                    color: 0x8A6FD8, alpha: [0.5, 0], light: "full", maxParticles: 30
                },
                {
                    name: "draw_mote", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.07, 0.02], sizeMode: "sin",
                    color: 0xE6DEFF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        coil: {
            duration: 40,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "coil_rings", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 1, at: 1, interval: 2, repeats: { data: "coils", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [9, 16], size: [0.26, 0.06], sizeMode: "index",
                    color: 0x8A6FD8, alpha: [0.78, 0], light: "full", maxParticles: 80
                },
                {
                    name: "coil_pull", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "coils", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.65 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [8, 15], size: [0.06, 0.02],
                    color: 0x5B4B9E, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        rise: {
            duration: 32,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "rise_ring", bind: "source", offset: [0, 0.08, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [12, 20], size: [0.4, 0.9], sizeMode: "index",
                    color: 0x8A6FD8, alpha: [0.8, 0], light: "full", maxParticles: 24
                },
                {
                    name: "rise_point_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.07, 0.2],
                    lifetime: [14, 22], size: [0.5, 1.0], sizeMode: "index",
                    color: 0xE6DEFF, alpha: [0.75, 0], light: "full", maxParticles: 12
                },
                {
                    name: "rise_spark", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "gain", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [11, 20], size: [0.09, 0.02], sizeMode: "index",
                    color: 0xE6DEFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 2.5, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.006, 0.02],
                    lifetime: [20, 34], size: [0.24, 0.06], sizeMode: "sin",
                    color: 0x8A6FD8, alpha: [0.24, 0], alphaMode: "sin", light: "full", maxParticles: 16
                },
                {
                    name: "hum_mote", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.003, 0.012],
                    lifetime: [16, 28], size: [0.05, 0.01], sizeMode: "sin",
                    color: 0xE6DEFF, alpha: [0.26, 0], alphaMode: "sin", light: "world", maxParticles: 18
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fade_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "down", speed: [0.02, 0.06], gravity: 0.02,
                    lifetime: [12, 20], size: [0.24, 0.05],
                    color: 0x5B4B9E, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_coil", 1, CoilDefinition);
