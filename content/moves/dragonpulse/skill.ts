/**
 * 龙之波动 / dragonpulse 的出手方式。
 *
 * 核心念头：张大嘴，把一整段龙息压成一圈圈同心波面，沿瞄准线一路推出去；波前扫过排在一条线上的敌人后
 * 不停下、继续前进——它是一条**持续前推的波**，不是一次爆炸。
 *
 * 两幕 + 收：
 *   起（windup，提交前）：口前气流向内收拢、一圈将成未成的波面在嘴前成形，只播预告、可被打断。
 *   推（execute → pulse / impact）：提交后波面从嘴前脱手（`LivingActions.projectile`），沿直线推进；
 *       每个被扫到的非友方按 `pulse` 结算一次，贯通式按 `pierce` 继续穿过后面的人，连锁式则在第一个目标处
 *       收束、按 `burstRadius` 罩开一圈对周围目标结算 `burst`。
 *   散（fade）：波推到头自然消散；一名也没扫到就是空放。
 *
 * 与同族分开：龙息是贴地、由近及远铺满的扇形；音爆是瞬时、无飞行时间的裂痕；龙之怒是固定 40 的重击。
 * 龙之波动是唯一**持续前进、按特攻缩放、能穿过成排目标**的那一击。
 */
namespace PokemonSkills {
    const dragonpulseScene = "world_combat:move_dragonpulse";
    const dragonpulseHitText = "world_combat.move.dragonpulse.text.hit";
    const dragonpulseChainText = "world_combat.move.dragonpulse.text.chain";
    const dragonpulseMissText = "world_combat.move.dragonpulse.text.miss";

    define({
        id: "dragonpulse",
        cooldownParameter: "recharge",
        name: "Dragon Pulse",
        description: "张大嘴，把一整段龙息压成一圈圈同心波面，沿瞄准线一路推出去：波前扫过成排的敌人后不停下，继续穿过后面的目标；连锁式则换成在第一个敌人处收束、罩开一圈。",
        uses: ["沿直线穿过排成一列的敌人", "中远距离的持续压制", "连锁式收束罩住挤在一起的敌人"],
        kind: "enemy",
        range: 8,
        maxRange: 15,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 34,
        style: "pulse",
        defaults: { chain: false, ai: { maxChase: 13, preferLine: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dragonpulse", "thickness", pokemon) * 2.4, geometry: "line", style: "pulse", color: 0x6FE0C8,
                label: config && config.chain === true ? "龙之波动·连锁" : "龙之波动" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dragonpulse"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dragonpulse", "tempo", context)),
                recover: Math.round(p("dragonpulse", "aftercast", context)),
                cooldown: Math.round(p("dragonpulse", "recharge", context)),
                active: 0,
                range: p("dragonpulse", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("dragonpulse:windup", dragonpulseScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", chain: config && config.chain === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const chain = !!(config && config.chain);
            const power = p("dragonpulse", "pulse", action);
            const reach = p("dragonpulse", "reach", action);
            const speed = p("dragonpulse", "flight", action);
            const thickness = p("dragonpulse", "thickness", action);
            const rings = Math.max(2, Math.round(p("dragonpulse", "rings", action)));
            const pierce = chain ? 0 : Math.max(0, Math.round(p("dragonpulse", "pierce", action)));
            const burstPower = p("dragonpulse", "burst", action);
            const burstRadius = p("dragonpulse", "burstRadius", action);
            const cap = Math.max(1, Math.round(p("dragonpulse", "maximumTargets", action)));
            const direction = aim(action);
            const scale = thickness / 0.42;
            const intensity = Math.max(0.5, Math.min(2.2, power / 76));
            const flow = Math.round(60 + rings * 26);
            const mouth = origin.plus(WorldCombat.point(0, 0.55, 0));
            let hits = 0, bloomed = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }
            /** 一名被波面扫到的目标：结算对应段并播一次命中。 */
            function strike(current: CombatAction, hit: CombatImpact, amount: number, segment: string, strength: number): void {
                const scope = current.world(), victim = hit.target();
                if (victim === null) return;
                hits++;
                impact(current, hit, "dragonpulse", amount, { damage: damageSpec("dragonpulse", segment), pulse: true });
                WorldFeedback.emit(scope, dragonpulseScene, 1, hit.position(),
                    { moment: "impact", target: String(victim.ref()), rings: rings, scale: scale, intensity: intensity * strength, hits: hits }, 24);
                WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), dragonpulseHitText, [hits], 22);
            }

            sound(action, "minecraft:entity.ender_dragon.shoot");
            WorldFeedback.emit(world, dragonpulseScene, 1, mouth,
                { moment: "release", rings: rings, scale: scale, intensity: intensity, flow: flow,
                    direction: [direction.x(), direction.y(), direction.z()] }, 20);

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/orb/energyorb", tint: 0x7FE6D0, glow: true,
                pierce: pierce,
                scale: Math.max(0.7, Math.min(1.8, scale))
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, gravity: 0, radius: thickness, direction: direction,
                lifetime: Math.max(30, Math.round(reach / Math.max(0.2, speed) + 30)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) return;
                    if (chain) {
                        if (bloomed) return;
                        bloomed = true;
                        strike(current, hit, power, "pulse", 1);
                        WorldFeedback.emit(scope, dragonpulseScene, 1, hit.position(),
                            { moment: "bloom", rings: rings, scale: burstRadius / 1.6, intensity: intensity }, 30);
                        let extra = 0;
                        const region = WorldGeometry.ring(hit.position(), 0, burstRadius, { below: 1.5, above: 3 });
                        WorldGeometry.selectEnemies(scope, region, function (other: CombatActor, facts: CombatObservation) {
                            if (extra >= cap || String(other.ref()) === String(victim.ref())) return;
                            extra++;
                            hurt(current, other, "dragonpulse", burstPower, { damage: damageSpec("dragonpulse", "burst"), pulse: true });
                            WorldFeedback.emit(scope, dragonpulseScene, 1, facts.position(),
                                { moment: "impact", target: String(other.ref()), rings: rings, scale: scale, intensity: intensity * 0.85 }, 22);
                        });
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.35, 0)), dragonpulseChainText, [extra + 1], 24);
                        sound(current, "cobblemon:impact.dragon");
                        finish(current);
                        return;
                    }
                    if (hits > pierce) return;
                    strike(current, hit, power, "pulse", 1 - Math.min(0.35, hits * 0.06));
                    sound(current, "cobblemon:impact.dragon");
                }
            }, function (current: CombatAction) {
                if (bloomed) { finish(current); return; }
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, dragonpulseScene, 1, body.position().plus(WorldCombat.point(0, 0.55, 0)), { moment: "fade", scale: scale }, 18);
                    if (hits === 0) WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), dragonpulseMissText, [], 20);
                }
                finish(current);
            });
            WorldFeedback.keep(world, "dragonpulse:flight:" + action.id(), dragonpulseScene, 1, mouth,
                { moment: "pulse", projectile: flight, rings: rings, scale: scale, intensity: intensity, flow: flow }, 90);
        }
    });
}
