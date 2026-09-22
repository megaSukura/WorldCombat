/**
 * 充电 / Charge 的客户端表现。
 *
 * 一句话：施法者身周的电花从四面收进身体 → 一声闷响，一圈电弧贴着身体亮起来并持续噼啪 → 电招兑现的瞬间，
 *         这股电从身上炸成一圈冲击与电花，然后一切安静退去。
 * 色相家族：electric yellow 0xFFD84A 作主体；暖白 0xFFF3C4 作高光；只在放电强调层留一点青白 0xAFF2FF。
 * 起击收：起 gather 12t ／击 charged 30t ／持 aura 续期 ／击 discharge 26t ／收 fade 22t。
 * 持续状态：aura 低密度绕身，颜色压暗，透过它看得清目标。
 * 机制驱动：聚电数量 sparks、电晕半径 aura、放电规模 burst 都来自本招算出的参数（放电按命中招式威力折算）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * gather 主体 electricity_white  球面向内聚          0.16-0.06 10-18 0.9→0   ≤60
 * gather 细节 accessory_spark    环上浮向心          0.06-0.02 8-16  0.8→0   ≤60
 * charged 强调 electricity_yellow 球面外散            0.2-0.05  10-20 1→0     ≤50
 * charged 细节 glowingsparkle_yellow 环外散          0.08-0.02 8-16  0.9→0   ≤60
 * aura 主体 electricity_white    球面贴附、慢上浮    0.12-0.04 20-34 0.45→0  ≤40
 * aura 细节 accessory_spark      环内上浮            0.05-0.01 16-28 0.5→0   ≤40
 * discharge 强调 electricity_yellow 球面外爆＋drag   0.28-0.06 12-24 1→0     ≤90
 * discharge 细节 smallsparkle    球面外散            0.06-0.01 8-16  0.9→0   ≤90
 * discharge 轮廓 mediumring      环外扩、sin         0.4-0.9   12-20 0.6→0   ≤20
 * fade 主体 glowingsmoke_cyan    球面上浮            0.16-0.4  16-30 0.3→0   ≤30
 * fade 细节 tinydust             环上浮              0.05-0.01 12-24 0.3→0   ≤30
 */
const ChargeSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "intake", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 22, interval: 2, repeats: 4 }, shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "inward", speed: [0.06, 0.14],
                    lifetime: [10, 18], size: [0.16, 0.06],
                    color: 0xFFD84A, alpha: [0.9, 0], light: "full", maxParticles: 60 },
                { name: "gather_spark", bind: "source", offset: [0, 0.05, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: 30, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xFFF3C4, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 60 }
            ]
        },
        charged: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                { name: "flash", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "sparks", fallback: 24 } }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.2], drag: 0.9,
                    lifetime: [10, 20], size: [0.2, 0.05],
                    color: 0xFFD84A, alpha: [1, 0], light: "full", maxParticles: 50 },
                { name: "burstdetail", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 24 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60 }
            ]
        },
        aura: {
            exit: { drain: 30 },
            emitters: [
                { name: "body_arc", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "sparks", fallback: 20 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "up", speed: [0.005, 0.02], spin: 20,
                    lifetime: [20, 34], size: [0.12, 0.04],
                    color: 0xFFD84A, alpha: [0.45, 0], alphaMode: "sin", light: "full", maxParticles: 40 },
                { name: "aura_spark", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: 14, shape: { kind: "ring", radius: { data: "aura", fallback: 0.45 } },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [16, 28], size: [0.05, 0.01],
                    color: 0xFFF3C4, alpha: [0.5, 0], alphaMode: "sin", light: "full", maxParticles: 40 }
            ]
        },
        discharge: {
            duration: 26,
            exit: { stop: 12, drain: 24 },
            emitters: [
                { name: "blast", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "burst", fallback: 48 } }, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.12, 0.3], drag: 0.88,
                    lifetime: [12, 24], size: [0.28, 0.06],
                    color: 0xFFD84A, alpha: [1, 0], light: "full", maxParticles: 90 },
                { name: "blast_detail", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "burst", fallback: 48 } }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xAFF2FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 90 },
                { name: "blast_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 4 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [12, 20], size: [0.4, 0.9], sizeMode: "sin",
                    color: 0xFFF3C4, alpha: [0.6, 0], light: "full", maxParticles: 20 }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                { name: "dissipate", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 30], size: [0.16, 0.4],
                    color: 0x8FE8FF, alpha: [0.3, 0], light: "world", maxParticles: 30 },
                { name: "last_spark", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 24], size: [0.05, 0.01],
                    color: 0xFFF3C4, alpha: [0.3, 0], light: "full", maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_charge", 1, ChargeSceneDefinition);
