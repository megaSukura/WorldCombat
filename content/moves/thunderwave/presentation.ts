/**
 * 电磁波 / Thunder Wave 的客户端表现。
 *
 * 一句话：施法者指尖攒起一小团电，一放电，一条折来折去却笔直打向目标的黄色电光沿直线炸开，
 *   在被打到的人身上缠成一圈麻花一样的电花，然后缓缓收掉。
 * 色相家族：电黄（0xF2E24A）与冷白（0xFFFDE8）为全部主体，浅青绿（0xC8F0A0）只做细节小点。没有第二个色相。
 * 拍子：起（windup，攒电）→ 击（bolt 电线沿直线炸开）→ 收（jolt 缠身电花 / blocked·shielded·immune 消散）。
 * 范围：bolt 的发射器绑在 `data.path` 上，顶点就是判定用的那条直线——画出来的形状就是电流真正走的那条线；
 *   blocked 在墙面上消散，shielded 在挡线的同伴身上消散，玩家一眼能看出是谁吃掉了这一记。
 * 运动：电流沿直线朝目标爬；`joltSpeed` 越大，火花撒得越密（`flux` 为每秒撒多少点）。
 * 数：服务端把 `arcs`（电弧条数）与 `intensity`（麻痹越久越亮）交给下面的发射器，画面里的数量和强度与机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ThunderWaveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [6, 12], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0xFFFDE8, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "gather_spark", bind: "source", offset: [0, 0.05, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: 8, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.05, 0.01],
                    color: 0xF2E24A, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        bolt: {
            duration: 22,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "core_line", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 6 }, interval: 1, repeats: 3 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: { data: "intensity", fallback: 1 },
                    lifetime: [4, 9], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xFFFDE8, alpha: [1, 0], light: "full", bloom: 0.6
                },
                {
                    name: "arc_detail", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: { data: "flux", fallback: 36 }, trail: { minDistance: 0.1 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.12],
                    lifetime: [5, 11], size: [0.06, 0.01],
                    color: 0xF2E24A, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "branch_spark", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "arcs", fallback: 6 }, interval: 2, repeats: 2 },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.03, 0.16], spread: 45,
                    lifetime: [6, 13], size: [0.07, 0.01],
                    color: 0xC8F0A0, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        jolt: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "jolt_flash", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: { data: "intensity", fallback: 0.2 },
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "jolt_cling", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "arcs", fallback: 8 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: { data: "intensity", fallback: 0.16 },
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0xF2E24A, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "jolt_ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "arcs", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.24, 0.1],
                    color: 0xC8F0A0, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        shielded: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "shield_drain", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 12 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFFFDE8, alpha: [0.85, 0], light: "full", maxParticles: 24
                }
            ]
        },
        blocked: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "wall_burst", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xFFFDE8, alpha: [0.9, 0], light: "full", maxParticles: 30
                },
                {
                    name: "wall_smoke", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.14, 0.24],
                    color: 0x6E7C88, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        },
        immune: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "immune_repel", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 12 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xE8FAFF, alpha: [0.7, 0], light: "full", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thunderwave", 1, ThunderWaveDefinition);
