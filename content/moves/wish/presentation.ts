/**
 * 祈愿 / Wish 的客户端表现。
 *
 * 一句话：所选落点收拢一圈祈愿的光，愿星被送上高空；随后**唯一一枚**愿星 sprite 按剩余时间从高空落到那个固定圈，
 *   倒计时就读在它的高度上；末刻接地与治疗爆发同一刻出现，圈内每个真正受益者各亮一下治疗光。
 * 色相家族：愿力金 0xFFD36A 作主体，暖白 0xFFF2C8 作高光，浅青 0xBFE6FF 只落在上升的星尾。
 * 拍子：起（windup）／升（愿星 sprite 出现）／落（愿星 sprite 按剩余时间下降）／击（land）／愈（heal 受益者）／收（fade）。
 * 范围：愿星的落点与治疗圈共用同一真实落点；圈半径由 data.radius（本招实际祝福半径）画出，实心圈就是判定圈。
 * 机制驱动：愿星的起点/落点/剩余时间来自服务端同一份数据；land 的爆发数绑定 data.burst，由实际受益者数量算出；
 *   heal 只在真实受益者身上出现。
 *
 * 唯一愿星由 `WorldCombatClient.scene` 固定绘制（没有重复生成的星点），星尘与落地爆发仍走粒子幕。
 */
const WishDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather_ring", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.34, 0.12],
                    color: 0xFFD36A, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "gather_mote", bind: "point", offset: [0, 0.3, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xFFF2C8, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        land: {
            duration: 40,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "land_burst", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: { data: "burst", fallback: 24 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.3], drag: 0.9,
                    lifetime: [14, 26], size: [0.26, 0.03],
                    color: 0xFFD36A, alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 80
                },
                {
                    name: "land_ring", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3, interval: 4 }, shape: { kind: "ring", radius: 2.6 },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [16, 28], size: [0.4, 0.9],
                    color: 0xFFF2C8, alpha: [0.7, 0], light: "full", maxParticles: 16
                },
                {
                    name: "land_mote", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 30, repeats: 2, interval: 5 }, shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [14, 26], size: [0.07, 0.01],
                    color: 0xFFF2C8, alpha: [0.85, 0], light: "full", maxParticles: 70
                }
            ]
        },
        heal: {
            duration: 28,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "heal_column", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 8, interval: 2, repeats: 2 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xFFF2C8, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "heal_ring", bind: "target", offset: [0, 0.06, 0], height: 0,
                    burst: { count: 2 }, shape: { kind: "ring", radius: 0.4 },
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    direction: "outward", speed: [0.03, 0.09],
                    lifetime: [14, 22], size: [0.34, 0.72],
                    color: 0xFFD36A, alpha: [0.7, 0], light: "full", maxParticles: 16
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_mote", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFF2C8, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wish", 1, WishDefinition);

// 唯一愿星：服务端给出真实起点（高空）、真实落点与剩余时间；客户端每帧按 serverTick 插值出星的位置。
// 落地圈由 data.radius（本招实际祝福半径）画出，与判定圈是同一半径、同一落点。
const WishStarTexture = "cobblemon:particle/moves/wish_star";
const WishStarDust = "cobblemon:particle/generic/sparkle/glowingsparkle_yellow";

function wishStarValue(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

WorldCombatClient.scene("world_combat:move_wish_star", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const start = data.start, ground = data.ground;
    if (!Array.isArray(start) || !Array.isArray(ground)) return;
    const born = wishStarValue(data.born, frame.serverTick());
    const landAt = Math.max(born + 1, wishStarValue(data.landAt, born + 1));
    const span = Math.max(1, landAt - born);
    const linear = Math.max(0, Math.min(1, (frame.serverTick() - born) / span));
    // 先悬后落：平方曲线让它大半程停在高空，末刻落到真实落点，与 land 爆发同刻。
    const progress = linear * linear;
    const radius = Math.max(1.2, wishStarValue(data.radius, 2.6));
    const x = start[0] + (ground[0] - start[0]) * progress;
    const y = start[1] + (ground[1] - start[1]) * progress;
    const z = start[2] + (ground[2] - start[2]) * progress;
    const pulse = 0.5 + 0.5 * Math.sin(frame.serverTick() * 0.25);
    // 地面圈：真实半径，越接近兑现越亮。
    const ringAlpha = Math.round(60 + 120 * progress);
    frame.ring(ground[0], ground[1] + 0.05, ground[2], radius, (ringAlpha << 24 | 0xFFD36A) | 0);
    // 星尘：沿已走过的连线留几枚次要亮尘。
    for (let index = 1; index <= 3; index++) {
        const t = Math.max(0, progress - index * 0.07);
        const dust = Math.round(150 * (1 - index * 0.22) * (1 - progress * 0.4));
        frame.sprite(WishStarDust,
            start[0] + (ground[0] - start[0]) * t, start[1] + (ground[1] - start[1]) * t, start[2] + (ground[2] - start[2]) * t,
            0.09 - index * 0.015, 0, (dust << 24 | 0xFFF2C8) | 0, 0, true);
    }
    // 唯一愿星。
    const starFrame = Math.floor(frame.serverTick() * 0.12) % 2;
    frame.sprite(WishStarTexture, x, y, z, 0.5 + 0.06 * pulse, 0, (0xF5 << 24 | 0xFFD36A) | 0, starFrame, true);
});
