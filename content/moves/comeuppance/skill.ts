/**
 * 复仇 / comeuppance 的出手方式。
 *
 * 核心念头：把最近吃下的伤害记成一笔仇，先给账主压上一枚暗记，隔一拍之后放出暗影贴着它追讨。
 *
 * 三幕：
 *   起（windup，提交前）：目标身上只浮起一道收得很紧的暗紫细指示，表示这笔仇指向了它（present mark）。
 *   候（execute 起）：账在施放时被取走；暗影在施法者自己身边聚起、盘着等一拍（stalkDelay），不是目标头顶的落伤预告。
 *   讨（launch）：暗影离手、追着账主飞；命中时按账本以 1.5 倍结算，没有账时暗记消散（whiff）。
 *
 * 与同族分开：复仇是隔空、延迟、追人的一记暗影；金属爆炸是自身为中心、即时落地的钢爆。
 */
namespace PokemonSkills {
    define({
        id: comeuppanceId,
        cooldownParameter: "recharge",
        name: "Comeuppance",
        description: "把最近一次受到的伤害记成一笔仇，隔一拍放出会自行追人的暗影，按 1.5 倍返还给选定的敌人；没有账可讨时暗记消散。",
        uses: ["挨打后隔空追讨远处的对手", "惩罚先手打中自己的远程敌人", "把承伤转成一记延迟的重击"],
        kind: "enemy",
        range: 7.5,
        maxRange: 12,
        prepare: 5,
        active: 40,
        recover: 8,
        cooldown: 33,
        style: "grudge",
        defaults: { grudge: false, ai: { maxChase: 11 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(comeuppanceId, "collisionRadius", pokemon), geometry: "line", style: "grudge", color: 0x6B4A8A,
                label: config && config.grudge === true ? "复仇·记仇" : "复仇" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[comeuppanceId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(comeuppanceId, "brace", context)),
                recover: Math.round(p(comeuppanceId, "settle", context)),
                cooldown: Math.round(p(comeuppanceId, "recharge", context)),
                active: 40,
                range: p(comeuppanceId, "shadowRange", context)
            };
        },
        windup: function (action, config, prepare) {
            const record = comeuppanceRecord(action.sense(), action.actor());
            const amount = record === null ? 0 : record.amount;
            action.present("comeuppance:mark", comeuppanceScene, 1, action.origin(),
                JSON.stringify({ moment: "mark", target: String(action.target() === null ? "" : action.target()!.ref()),
                    glyphs: Math.round(6 + Math.min(26, amount * 0.3)), grudge: config && config.grudge === true, duration: prepare,
                    scale: p(comeuppanceId, "collisionRadius", action) / 0.34 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const refund = Math.round(p(comeuppanceId, "refund", action));
            const target = action.target();
            comeuppanceConsume(self);
            if (!(refund > 0) || target === null || !world.valid(target)) {
                sound(action, "minecraft:entity.evoker.cast_spell");
                WorldFeedback.emit(world, comeuppanceScene, 1, action.targetPosition(), { moment: "whiff" }, 22);
                WorldFeedback.text(world, action.targetPosition().plus(WorldCombat.point(0, 1, 0)), comeuppanceWhiffText, [], 24);
                done(action);
                return;
            }

            const targetRef = String(target.ref());
            const delay = Math.max(1, Math.round(p(comeuppanceId, "stalkDelay", action)));
            let settled = false;
            sound(action, "minecraft:entity.evoker.cast_spell");
            // 延迟这一拍是「在施法者身边盘仇」，不是在目标头顶预演落伤：仇影先聚在自己身上等一拍。
            const selfBody = world.observe(self);
            const targetBody = world.observe(target);
            const scale = p(comeuppanceId, "collisionRadius", action) / 0.34;
            WorldFeedback.emit(world, comeuppanceScene, 1, selfBody === null ? action.origin() : selfBody.position(),
                { moment: "lurk", target: targetRef, duration: delay, scale: scale }, delay + 24);
            // 同时只给目标留一道很轻的指向环，随延迟走完自行熄灭，表示暗影正在锁定它而不是已经命中。
            if (targetBody !== null)
                WorldFeedback.emit(world, comeuppanceScene, 1, targetBody.position(),
                    { moment: "mark", target: targetRef, duration: delay, scale: scale }, delay + 8);

            function launch(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(current.actor());
                const victim = scope.actor(targetRef);
                const victimBody = victim === null ? null : scope.observe(victim);
                if (body === null || victim === null || victimBody === null || !scope.valid(victim)) {
                    WorldFeedback.emit(scope, comeuppanceScene, 1, current.targetPosition(), { moment: "whiff" }, 20);
                    done(current);
                    return;
                }
                const speed = p(comeuppanceId, "shadowSpeed", current);
                const radius = p(comeuppanceId, "collisionRadius", current);
                const scale = radius / 0.34;
                const delta = victimBody.position().minus(body.position());
                const direction = delta.length() < 0.01 ? current.direction() : delta.unit();
                const range = Math.min(current.range(), Math.max(2, delta.length() + 2));

                const appearance: any = { sprite: "cobblemon:particle/generic/orb/largesmokeorb", tint: 0x6B4A8A, glow: true, scale: 0.9 };
                appearance.homing = { target: targetRef, turn: 10, delay: 1, range: range };

                const flight: LivingActions.Flight = {
                    speed: speed, range: range, radius: radius, direction: direction, gravity: 0,
                    lifetime: Math.max(30, Math.round(range / Math.max(0.2, speed) + 30)),
                    appearance: appearance,
                    impact: function (current2: CombatAction, hit: CombatImpact, age: number) {
                        const inner = current2.world(), point = hit.position(), struck = hit.target();
                        if (struck === null || inner.friendly(struck)) {
                            WorldFeedback.emit(inner, comeuppanceScene, 1, point, { moment: "whiff", scale: scale }, 20);
                            return;
                        }
                        const landed = comeuppanceRawHit(current2, struck, refund, false);
                        WorldFeedback.emit(inner, comeuppanceScene, 1, point,
                            { moment: "strike", target: String(struck.ref()), count: Math.round(14 + refund / 2),
                                scale: scale, power: Math.round(refund * 10) / 10 }, 28);
                        inner.sound("cobblemon:impact.dark", point, 16, "{}");
                        if (landed) WorldFeedback.text(inner, point.plus(WorldCombat.point(0, 1.1, 0)), comeuppanceHitText,
                            [Math.round(refund)], 26);
                    }
                };
                const projectile = LivingActions.projectile(current, flight, function (cur: CombatAction) {
                    if (settled) { done(cur); return; }
                    settled = true;
                    done(cur);
                });
                WorldFeedback.keep(scope, "comeuppance:flight:" + current.id(), comeuppanceScene, 1, body.position(),
                    { moment: "flight", projectile: projectile, scale: scale }, flight.lifetime! + 10);
            }

            if (delay <= 1) launch(action);
            else action.after(delay, launch);
        }
    });
}
