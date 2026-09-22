/**
 * 金属爪 / metalclaw 的客户端表现。
 *
 * 一句话：双爪在身侧亮起一层冷钢光，随后左右两记短促的爪风劈向前方；劈中处炸开小片钢火星，
 *   爪刃被磨出锋口时，施法者身上升起一圈钢白磨光。
 * 色相家族：冷钢灰蓝（0xC8CEDA）与近白高光（0xF2F6FF）为主，中性尘（tinydust）只做余韵；没有第二个色相。
 * 拍子：起（windup 聚刃光）→ 劈（rake 两道爪风）→ 击（hit 钢火星）→ 磨（sharpen 升光）→ 空（miss 散尘）。
 * 范围：`rake` 用与判定同源的 `path` 画出施法者→爪程末端的同一条线，线有多长、玩家就知道能劈到多远。
 * 运动：爪风沿该线由近及远扫出，火星从命中点向外抛并受重力；磨光从脚边竖直升起。
 * 数：`data.sparks`（物攻与速度派生）绑定爪风与命中的粒子数，`data.intensity`（本次威力比例）缩放发射量，
 *   `data.stages`（实际磨起的物攻级数）绑定磨光光环的数量。
 */

const MetalclawDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "edgelight", bind: "source", offset: [0, 0.45, 0.25], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xF2F6FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.15, 0.2], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "sphere", radius: 0.25 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.05, 0.02],
                    color: 0x8C94A3, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        rake: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "clawline", bind: "path", orient: "direction", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    rate: { data: "sparks", fallback: 10 }, shape: { kind: "polyline" },
                    direction: "away", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [4, 9], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xC8CEDA, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "edge", bind: "source", offset: [0, 0.45, 0.2], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: { data: "sparks", fallback: 10 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.25 }, direction: "away", speed: [0.06, 0.2],
                    lifetime: [4, 8], size: [0.22, 0.04],
                    color: 0xF2F6FF, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "steelburst", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "sparks", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.28], spread: 18,
                    lifetime: [6, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF2F6FF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "sparks", fallback: 10 } },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.1, 0.35], gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xC8CEDA, alpha: [0.9, 0], light: "full", maxParticles: 140
                }
            ]
        },
        sharpen: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "hone_ring", bind: "source", offset: [0, 0.08, 0], height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "stages", fallback: 1 } },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.24, 0.44],
                    color: 0xF2F6FF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 16
                },
                {
                    name: "hone_up", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "stages", fallback: 1 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.08, 0.28], drag: 0.9,
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xF2F6FF, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 10 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.88,
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0x8C94A3, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_metalclaw", 1, MetalclawDefinition);
