/**
 * 线阱的客户端表现。
 *
 * 一句话：一张奶白色的丝网贴地绷起、围住自己；远射被网黏住卸掉；第一记接触撞上来时，网沿真实来向向那名敌人收束，
 * 残丝绕在它脚上、速度骤降，余网随即松开、自己脱网。
 * 色相家族：奶白／米黄为唯一色相（white／powder／tinydust／smallsparkle），灰烟与淡青环作中性衬托。
 * 拍子：起（raise 0–16t，丝线自地面抽出、向四周绷开）→ 持（hold 丝环贴脚）→ 接远伤（block 弧面黏挡）
 *      → 接触（cinch 网沿 data.path 向该敌收束）→ 缠足（punish 残丝绕脚）→ 收（fall 垂落、自身脱网）。
 * 范围：hold 的丝网环按 `data.scale`（丝网半径／1.6）铺开——画面就是被判定的那一圈。
 * 运动：起手丝线向外绷开；持网时丝面轻颤；接触时网线沿施法者→攻击者的真实连线收拢；缠足时残丝绕向脚踝。
 * 数：`data.threads`（降速级数派生）就是 punish 残丝的根数，`data.intensity`（剩余量／初始量）决定亮度，
 *      `data.scale` 放大丝网。远射 block 与接触 cinch 分别播放，不会把远伤画成抓人。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SilkTrapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 16,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "strands", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 34, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 20], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xF0E9D2, alpha: [0.9, 0], gravity: 0.02, drag: 0.9,
                    light: "world", maxParticles: 110
                },
                {
                    name: "weave", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: 18, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.1], spin: 20,
                    lifetime: [14, 26], size: [0.2, 0.03],
                    color: 0xE2D9BE, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0xFBF6E6, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        },
        hold: {
            // 持续状态：低密度丝环与少量丝屑，贴在脚边，让玩家看清目标与范围。
            emitters: [
                {
                    name: "web_ring", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 5, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [24, 40], size: [0.46, 0.46], sizeMode: "sin",
                    color: 0xE8E1C8, alpha: [0.24, 0.07], alphaMode: "sin",
                    light: "world", maxParticles: 16
                },
                {
                    name: "tremor", bind: "source", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 4, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [22, 36], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0xF4EEDA, alpha: [0.45, 0.1], alphaMode: "sin",
                    light: "world", maxParticles: 14
                }
            ]
        },
        block: {
            // 远射的伤害被网卸掉：只在接触侧弧面黏挡，不表示抓人。
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "stick", bind: "target", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 12, at: 1 }, shape: { kind: "arc", radius: 0.6, arcDegrees: 120 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.32, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.25
                },
                {
                    name: "tangle", bind: "target", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 22 },
                    shape: { kind: "arc", radius: 0.65, arcDegrees: 150 },
                    direction: "outward", speed: [0.07, 0.22], spin: 26,
                    lifetime: [10, 20], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xF0E9D2, alpha: [0.85, 0], light: "world", maxParticles: 70
                }
            ]
        },
        cinch: {
            // 第一记接触：奶白网线沿施法者→攻击者的真实线段收束过去，说明这记接触抓住了谁。
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "close_in", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 18 }, shape: { kind: "polyline" },
                    direction: "away", speed: [0.09, 0.26], spin: 24,
                    lifetime: [8, 16], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xF0E9D2, alpha: [0.95, 0], light: "full", maxParticles: 80
                },
                {
                    name: "draw", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.08, 0.22], spin: 22,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xE2D9BE, alpha: [0.9, 0], light: "world", maxParticles: 60
                }
            ]
        },
        punish: {
            // 残丝挂在攻击者脚上：根数就是降速级数派生的 threads，不再有钉地的表现。
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "threads", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "threads", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 24 },
                    direction: "shape", speed: [0.12, 0.32], spin: 24,
                    lifetime: [10, 20], size: [0.16, 0.02], sizeMode: "index",
                    color: 0xF4EEDA, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "cinch", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "inward", speed: [0.06, 0.18],
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0xE2D9BE, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "flecks", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.07, 0.22], gravity: 0.05,
                    lifetime: [10, 20], size: [0.05, 0.01],
                    color: 0xFFF8E0, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "loosen", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 28 },
                    shape: { kind: "hemisphere", radius: 0.55 },
                    direction: "down", speed: [0.04, 0.15], spin: 20,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [16, 28], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xEDE6D0, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "settle", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.04, 0.13],
                    lifetime: [14, 24], size: [0.42, 0.1],
                    color: 0xE2D9BE, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.11],
                    lifetime: [16, 30], size: [0.05, 0.01],
                    color: 0xFBF6E6, alpha: [0.5, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_silktrap", 1, SilkTrapDefinition);
