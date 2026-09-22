/**
 * 薄雾炸裂 / mistyexplosion 的客户端表现。
 *
 * 一句话：施法者身上先滚满粉雾、身体发亮，随后整片薄雾贴地向外炸开成一圈粉白光环，把圈里的人蒙住；
 *   雾不散，原地留下一层缓慢翻涌的残雾。
 * 色相家族：粉白到浅金（largeobscure_pink／obscuringsmoke／glowingsparkle_pink／aura_white／impact_fairy），
 *   与三誓约的橙红、黄绿、青蓝在色相上分开；金色只出现在强调层的小面积上。
 * 拍子：起（swell，提交前收雾发亮）→ 击（bloom 雾环炸开 + hit 命中点）→ 留（mist 残雾）。
 * 范围：swell／bloom／mist 的环半径 = `data.scale` × 参考 4.4 格（bloom）／4.4（swell）／3.6（mist），
 *   玩家看到的那圈雾就是实际波及范围。
 * 运动：swell 向内收拢；bloom 贴地向外炸开并略微上浮（雾比火慢）；mist 低低地翻滚、不遮挡视线以外的东西。
 * 数：`data.count`（由特攻派生）决定雾絮与光点数量，`data.intensity`（威力 / 120）决定亮度与密度，
 *   `data.boosted` 在薄雾上加重一层金色光点。
 * 参照节：视觉语言第二、三、四、五、七、九节；残雾是持续状态，按第五节「少而稳」写。
 */
const MistyexplosionDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        swell: {
            duration: 18,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "gather_mist", bind: "source", offset: [0, 0.7, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                    rate: 24, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [10, 18], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFC6E2, alpha: [0.6, 0], light: "world", maxParticles: 130
                },
                {
                    name: "body_glow", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFE0F0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 70
                }
            ]
        },
        bloom: {
            duration: 36,
            exit: { stop: 22, drain: 26 },
            emitters: [
                {
                    name: "mist_ring", bind: "point", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                    burst: { count: { data: "count", fallback: 90 }, interval: 2, repeats: 6 },
                    shape: { kind: "circle", radius: 4.4 },
                    direction: "outward", speed: [0.08, 0.4],
                    lifetime: [14, 26], size: [0.5, 0.1], sizeMode: "index",
                    color: 0xFFB6DC, alpha: [0.55, 0], gravity: -0.005, drag: 0.94, light: "world", maxParticles: 420
                },
                {
                    name: "impact", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "sphere", radius: 4.4 },
                    direction: "shape", speed: [0.06, 0.28],
                    lifetime: [8, 14], size: [0.45, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 120
                },
                {
                    name: "shimmer", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "count", fallback: 60 }, interval: 3, repeats: 4 },
                    shape: { kind: "circle", radius: 4.4 },
                    direction: "up", speed: [0.04, 0.22],
                    lifetime: [14, 26], size: [0.16, 0.02],
                    color: 0xFFE8F6, alpha: [0.9, 0], gravity: -0.01, light: "full", bloom: 0.6, maxParticles: 280
                },
                {
                    name: "gold", bind: "point", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "count", fallback: 40 }, interval: 4, repeats: 3 },
                    shape: { kind: "circle", radius: 4.4 },
                    direction: "up", speed: [0.05, 0.25],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xFFF0B0, alpha: [0.85, 0], light: "full", maxParticles: 200
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 7, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.4, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7
                },
                {
                    name: "motes", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "count", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.35],
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xFFE0F0, alpha: [0.9, 0], light: "full"
                }
            ]
        },
        mist: {
            duration: 34,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "lost_mist", bind: "point", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 20, shape: { kind: "circle", radius: 3.6 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [20, 36], size: [0.4, 0.7],
                    color: 0xE8B6D0, alpha: [0.22, 0], light: "world", maxParticles: 120
                },
                {
                    name: "drifting", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 6, shape: { kind: "circle", radius: 3.4 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [18, 30], size: [0.08, 0.02],
                    color: 0xFFD7EE, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mistyexplosion", 1, MistyexplosionDefinition);
