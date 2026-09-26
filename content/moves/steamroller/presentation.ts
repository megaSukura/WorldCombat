/**
 * 疯狂滚压 / steamroller 的客户端表现。
 *
 * 一句话：身体揉成一团、脚边尘圈收紧，随后一团球贴着地面滚出去，球下被压出一道平痕、两侧扬起草屑与土屑，
 * 压到的人身上炸开一圈钝击虫粉、被推着往前；被压懵的人头顶再冒星。
 * 色相家族：草黄与虫绿（impact_bug 0xB6C24A／ground_bugs／earth 0x8C7448），中性尘（tinydust），近白高光只给命中那一下。
 * 拍子：起（curl 团身）→ 滚（roll 掠地留痕）→ 压（crush 崩尘）／空（whiff 空滚）→ 懵（stagger）。
 * 范围：roll 的 `path` 随真实滚过的段落逐拍变长（从起点到当前本体），画面铺出的就是已经压过的那条线；
 *   crush 绑在真正被压到的目标身上。
 * 运动：curl 的尘向里收；roll 的草屑贴地向外抛、土屑带重力；crush 的虫粉向目标外炸。
 * 数：roll 与 crush 的量绑定 `data.dirt`（物攻派生），`data.scale`（碾压半宽派生）决定球的体积，
 *   `data.tread`（压痕块数派生）决定贴地草屑密度，`data.intensity`（威力派生）抬命中亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SteamrollerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        curl: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "tighten", bind: "source", offset: [0, 0.1, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [6, 12], size: [0.14, 0.04],
                    color: 0x8C7448, alpha: [0.55, 0], light: "world", maxParticles: 36
                },
                {
                    name: "motes", bind: "source", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "cylinder", radius: 0.55, length: 0.15 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.06, 0.02],
                    color: 0x9AA06A, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        roll: {
            duration: 50,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "swept", bind: "path", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    shape: { kind: "polygon" }, rate: { data: "tread", fallback: 16 }, direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, drag: 0.94,
                    lifetime: [8, 16], size: [0.11, 0.03],
                    color: 0x8C7448, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "bugs", bind: "path", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    shape: { kind: "polygon" }, rate: { data: "dirt", fallback: 16 }, direction: "shape", speed: [0.04, 0.18],
                    lifetime: [6, 12], size: [0.1, 0.03],
                    color: 0xB6C24A, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "ball", bind: "source", offset: [0, 0.16, 0], height: 0.2, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: 22, shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.02, 0.1], spin: 20,
                    lifetime: [5, 10], size: { data: "scale", fallback: 1 },
                    color: 0xA8B24E, alpha: [0.7, 0], light: "world", maxParticles: 56
                }
            ]
        },
        crush: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "pressed", bind: "target", offset: [0, 0.15, 0], height: 0.3, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 42
                },
                {
                    name: "crumbs", bind: "target", offset: [0, 0.1, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dirt", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.38 }, direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [9, 18], size: [0.06, 0.02],
                    color: 0x9AA06A, alpha: [0.55, 0], light: "world", maxParticles: 70
                }
            ]
        },
        stagger: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "daze", bind: "target", offset: [0, 0, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 9, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.22 }, direction: "outward", speed: [0.02, 0.1], spread: 20,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xE8F0A0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 28
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "unroll", bind: "point", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] }, direction: "outward", speed: [0.04, 0.15],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x9A927E, alpha: [0.45, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_steamroller", 1, SteamrollerDefinition);
