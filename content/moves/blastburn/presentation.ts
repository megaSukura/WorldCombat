/**
 * 爆炸烈焰 / blastburn 的客户端表现。
 *
 * 一句话：施法者身前把火焰压成一颗橙红热球抛向落点，落点从地面抽起一根向上的火柱、随后余下少量烟；
 * 爆完后施法者自己闷在热里，一下一下喘着气，标明过热力竭。
 * 色相家族：橙红到亮黄（flame/ember 原色、impact_fire 亮帧），烟灰与炭黑作余韵；与终极冲击的中性白灰、
 * 流星突击的翠绿在色相上分开。
 * 拍子：起（windup 0–10t，火焰收拢成球）→ 击（launch → track → blast）→ 收（exhale 起、pant 维持整段力竭）。
 * 范围：blast 的火柱与烟绑真实首碰点，柱高 = `data.column`、柱径随 `data.scale`；被墙挡住时贴原生方块面起柱。
 * 运动：热球沿低弧飞向落点（track 的 core_ball 描出球的完整轮廓），落地向上抽起、余烟随后慢慢升。
 * 数：`data.count`（由爆炸威力派生）决定火柱与核心的粒子量；`data.smoke`（由爆散半径派生）决定余烟量；
 * `data.intensity`（威力 / 150）决定亮度与密度；`data.seconds` 与 `data.puffs`（力竭秒数）决定喘息的密度。
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
                    // 慢热球的完整轮廓：紧贴投射物的一颗实心热核，让玩家看清这团火还没炸。
                    name: "core_ball", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 16, shape: { kind: "point" }, direction: "shape", speed: [0, 0.01],
                    lifetime: [4, 8], size: [0.95, 0.45], color: 0xFF7A22, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
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
            exit: { stop: 20, drain: 24 },
            emitters: [
                {
                    // 一次向上的火柱：以真实首碰点为底，柱高就是这一爆抽起的高度。
                    name: "fire_column", bind: "point", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "count", fallback: 120 }, at: 0 },
                    shape: { kind: "cylinder", radius: 0.7, length: { data: "column", fallback: 2.6 } },
                    orient: "fixed", direction: "up", fit: "world",
                    speed: [0.08, 0.3], lifetime: [10, 20], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFF8A2A, alpha: [0.9, 0], gravity: -0.02, drag: 0.94, light: "full", maxParticles: 260
                },
                {
                    name: "impact_core", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.06, 0.3],
                    lifetime: [7, 13], size: [0.5, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7
                },
                {
                    // 随后少量烟：火柱歇下去后从落点慢慢升起，不铺成一大片。
                    name: "after_smoke", bind: "point", offset: [0, 0.2, 0], height: 0, start: 6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "smoke", fallback: 24 }, at: 6, interval: 4, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [16, 28], size: [0.3, 0.6],
                    color: 0x5A5148, alpha: [0.3, 0], light: "world", maxParticles: 80
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
        // 整段过热的持续表现：duration 0 直到承载 mustrecharge 的托管效果释放；冒的是热汗与喘息，不是脚边停止符。
        pant: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "breath", bind: "source", offset: [0, 0.66, 0], height: 0.32,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "puffs", fallback: 6 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.005, 0.03],
                    lifetime: [14, 24], size: [0.16, 0.34], sizeMode: "sin",
                    color: 0x8A5A48, alpha: [0.24, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dying_ember", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 4, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [12, 20], size: [0.06, 0.02], sizeMode: "sin",
                    color: 0xB4481E, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_blastburn", 1, BlastburnDefinition);
