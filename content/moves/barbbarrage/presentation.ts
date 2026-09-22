/**
 * 毒千针 / barbbarrage 的客户端表现。
 *
 * 一句话：身上竖起一圈针芒，一轮扇形齐射把无数毒针喷出去，扎中目标的一瞬炸开一小团毒绿，最后在目标身上落下一口毒。
 * 色相家族：毒绿与骨白（spike / caltrop / impact_poison），毒团只作小面积强调（poisonbubble / acidsplash）。
 * 拍子：起（aim 0–5t）→ 击（loose 起射、barb 续命中、stick 扎地）→ 收（venom 中毒余韵）。
 * 范围：aim/loose 贴施法者脚下与身前，barb / venom 绑命中点——扇形张角与判定由服务端给出。
 * 运动：针沿扇形各飞各的（投射物自带外观），命中向外炸开，落空的针扎在地面。
 * 数：`data.count`（本轮实际针数）决定起射那一burst 的针数，`data.intensity`（总威力 / 60）抬高每针命中的亮帧，
 * `data.scale`（单针判定 / 0.16）放大起射尘环。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const BarbbarrageDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        aim: {
            duration: 8,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "bristle", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    rate: 12, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.12, 0.04],
                    color: 0x9BE86B, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "venom_gleam", bind: "source", offset: [0, 0.75, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [6, 12], size: [0.08, 0.03], sizeMode: "sin",
                    color: 0xC6F58A, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        loose: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "volley", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "count", fallback: 4 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.42],
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xE8F5D0, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "kick", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0x8FA55B, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "toxin_cloud", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0x7ED957, alpha: [0.6, 0], drag: 0.92, light: "world", maxParticles: 80
                }
            ]
        },
        barb: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "prick", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "prick", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "shape", speed: [0.04, 0.16],
                    lifetime: [5, 10], size: [0.24, 0.04], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "shards", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xD7F0A8, alpha: [0.7, 0], gravity: 0.04, drag: 0.9, light: "full", maxParticles: 80
                }
            ]
        },
        stick: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "planted", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xCBD9A0, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        venom: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "seep", bind: "target", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 30 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x6DD400, alpha: [0.75, 0], drag: 0.92, light: "full", maxParticles: 100
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 16], size: [0.26, 0.1],
                    color: 0x7ED957, alpha: [0.55, 0], light: "full"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_barbbarrage", 1, BarbbarrageDefinition);
