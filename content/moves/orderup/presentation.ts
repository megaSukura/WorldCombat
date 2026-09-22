/**
 * 上菜 / orderup 的客户端表现。
 *
 * 一句话：托手成盘、盘中亮起一点暖金，随后以潇洒的身段踏前半步拍下一记；若身边跟着小个子伙伴，
 * 一盘「菜」会先亮起，再化作对应能力的光环套上施法者（分餐式再向队友散开）。
 * 色相家族：暖金与米白（托盘的礼数与拍击）为底，玫瑰色只做点缀；能力光环按提升的能力取红／蓝／黄之一的窄色。
 * 拍子：起（windup 托盘聚金）→ 端（serve 落面与礼花）→ 供（dish 能力光环）→ 碎（break 碎片）→ 空（miss）。
 * 范围：serve 用 path 画出服务端走廊判定的同一组四个顶点；dish 的光环半径按 shareRadius、碎壁碎片按碎壁半径铺开。
 * 运动：暖金向盘中收，拍下是短促外爆，碎片向外散，能力光环从脚边扩开再收拢。
 * 数：`data.power`（下手威力）绑定落面礼花量，`data.stages`（增益级数）绑定能力光环的环数，
 * `data.wards`（震碎的屏障层数）绑定碎片波数，`data.scale`（下手半宽 / 0.45）放落面范围。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const OrderupDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "tray", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    rate: 16, shape: { kind: "circle", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xF0C86A, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "note", bind: "source", offset: [0, 0.9, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.18, 0.04],
                    color: 0xE8A0B0, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 18
                }
            ]
        },
        serve: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "lane", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" },
                    rate: 30, direction: "shape", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0xF0D9A0, alpha: [0.28, 0], light: "full", maxParticles: 90
                },
                {
                    name: "impact", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "power", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.45 } },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [7, 13], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xF4E4C0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "crumbs", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.45 } },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFF0C0, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 50
                }
            ]
        },
        dish: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "present", bind: "target", offset: [0, 0.8, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/present",
                    burst: { count: 6, at: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 22], size: [0.3, 0.08],
                    color: 0xF0C86A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "aura", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "stages", fallback: 2 }, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.4, 0.14], sizeMode: "sin",
                    color: 0xF0D060, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "spark", bind: "target", offset: [0, 0.8, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 16, at: 2 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [14, 22], size: [0.12, 0.02],
                    color: 0xFFF0C0, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        break: {
            duration: 22,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "shards", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "wards", fallback: 0 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.24], spread: 26,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xBFD8F0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.1, 0.22],
                    lifetime: [10, 16], size: [0.4, 0.14], sizeMode: "sin",
                    color: 0xDCEFFF, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "spill", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xB0A080, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_orderup", 1, OrderupDefinition);
