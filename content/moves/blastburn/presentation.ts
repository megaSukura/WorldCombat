/**
 * 爆炸烈焰 / blastburn 的客户端表现。
 *
 * 一句话：施法者身前把火焰压成一颗橙红热球抛向落点，落点整片炸开；爆完后施法者身上闷出暗红热气，标明过热力竭。
 * 色相家族：橙红到亮黄（flame/ember 原色、impact_fire 亮帧），烟灰与炭黑作余韵；与终极冲击的中性白灰、
 * 流星突击的翠绿在色相上分开。
 * 拍子：起（windup 0–10t，火焰收拢）→ 击（launch → track → blast）→ 收（exhale 起、recharge 维持整段力竭）。
 * 范围：blast 的爆圈与火焰层绑落点，半径 = `data.scale` × 参考 2.6 格，玩家看到的那片火就是实际波及范围。
 * 运动：热球沿低弧飞向落点（track 层贴投射物描出轨迹），落地向四面炸开、余火受重力下落。
 * 数：`data.count`（由爆炸威力派生）决定冲击与火星数量；`data.intensity`（威力 / 150）决定亮度与密度；
 * `data.seconds`（力竭秒数）决定收场热气的维持密度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BlastburnDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "gather_fire", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 22, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFF8A2A, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "heat_motes", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0xFFD56A, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        launch: {
            duration: 16,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "core", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 12], size: [0.34, 0.04],
                    color: 0xFFB13A, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 40
                }
            ]
        },
        track: {
            duration: 90,
            exit: { stop: 60, drain: 20 },
            emitters: [
                {
                    name: "trail", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 80, shape: { kind: "point" },
                    direction: "shape", speed: [0.01, 0.06], trail: { minDistance: 0.12 },
                    lifetime: [6, 12], size: [0.2, 0.04],
                    color: 0xFF7A22, alpha: [0.9, 0], light: "full", maxParticles: 260
                },
                {
                    name: "smoke_trail", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 30, shape: { kind: "point" },
                    direction: "up", speed: [0.01, 0.05], trail: { minDistance: 0.2 },
                    lifetime: [10, 18], size: [0.26, 0.5],
                    color: 0x5A5148, alpha: [0.3, 0], light: "world", maxParticles: 140
                }
            ]
        },
        blast: {
            duration: 38,
            exit: { stop: 22, drain: 24 },
            emitters: [
                {
                    name: "fire_core", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 22, at: 0 },
                    shape: { kind: "sphere", radius: 2.6 },
                    direction: "shape", speed: [0.06, 0.3],
                    lifetime: [7, 13], size: [0.5, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7
                },
                {
                    name: "blast_ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 34, at: 0, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: 2.6 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 16], size: [0.4, 0.12],
                    color: 0xFFB04A, alpha: [0.65, 0], light: "world"
                },
                {
                    name: "flames", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "count", fallback: 140 } },
                    shape: { kind: "sphere", radius: 2.6 },
                    direction: "outward", speed: [0.08, 0.4],
                    lifetime: [10, 20], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFF8A2A, alpha: [0.9, 0], gravity: -0.01, drag: 0.94, light: "full", maxParticles: 320
                },
                {
                    name: "embers", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 90 } },
                    shape: { kind: "sphere", radius: 2.6 },
                    direction: "outward", speed: [0.1, 0.5],
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0xFFD06A, alpha: [0.95, 0], gravity: 0.04, drag: 0.95, light: "full", maxParticles: 220
                }
            ]
        },
        exhale: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "heat_puff", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [12, 20], size: [0.3, 0.6],
                    color: 0x6A4038, alpha: [0.35, 0], light: "world", maxParticles: 80
                },
                {
                    name: "scorch", bind: "source", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 16], size: [0.1, 0.03],
                    color: 0xC2521E, alpha: [0.7, 0], gravity: 0.05, light: "world", maxParticles: 50
                }
            ]
        },
        recharge: {
            duration: 60,
            exit: { stop: 40, drain: 20 },
            emitters: [
                {
                    name: "overheat", bind: "source", offset: [0, 1.4, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 6, shape: { kind: "ring", radius: 0.22 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 26], size: [0.16, 0.34],
                    color: 0x8A5A48, alpha: [0.22, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dying_ember", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [12, 20], size: [0.06, 0.02],
                    color: 0xB4481E, alpha: [0.45, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_blastburn", 1, BlastburnDefinition);
