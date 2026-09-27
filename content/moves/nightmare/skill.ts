/**
 * 恶梦 / nightmare —— 执行组织。
 *
 * 核心念头：只对**已经睡熟**的人下手。几层黑影压下去，倒数一段；倒数走完时若它仍是同一场睡眠、施术者还在射程内，
 *   就从它身上抽走一口最大生命——固定比例，不看防御与相性。这一口抽下去，疼痛会把人从睡眠里拽醒，而恶梦正随那一下醒来散去。
 *   它借别人的睡眠窗口打一记延迟的收割，不再把人按在睡眠里；想让恶梦再来一次，得等对方重新睡下并重新下咒。
 *
 * 三幕：
 *   起（windup，提交前）：施法者掌心聚起一团黑影，只播预告。
 *   咒（seal → curse，提交后）：给睡者挂上本单元的载体 world_combat:nightmare（共享身份 world_combat:status/nightmare），
 *     并起一个绑定效果 world_combat:nightmare_bind（源为施法者、目标为睡者），记录倒数与**当时那场睡眠的载体身份**。
 *   候（countdown）：绑定效果每几刻确认一次——睡者还睡着、恶梦印记仍归本次所有、施术者仍在；同时续上逐渐压低的梦影表现。
 *   收（payoff）：倒数到点时再确认一次；全部成立就抽走一口并按实际扣血播收割与碎影，否则梦影直接消散。
 *
 * 反制：清掉恶梦本身（牛奶／清状态）、把施术者打倒或逼离射程、或让睡者被任意伤害打醒，恶梦都会散。
 *   睡眠刷新／替换等于换了一场梦，作废旧倒数；重新睡不继承。Boss 若免疫睡眠便始终不满足「已睡」的前置，无法被下咒。
 */
namespace PokemonSkills {
    function nightmareAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }
    function nightmareSleepAnchor(world: CombatWorld, victim: CombatActor): MobEffects.Anchor | null {
        const carrier = CombatStatus.representative(world, victim, "sleep");
        return carrier === null ? null : MobEffects.anchor(carrier);
    }
    function nightmareSleepMatches(world: CombatWorld, victim: CombatActor, data: any): boolean {
        return typeof data.sleepId === "string" && data.sleepId.length > 0
            && MobEffects.matches(world, victim, { id: data.sleepId, key: data.sleepKey });
    }

    // 恶梦绑定：源为施法者、目标为睡者，携带倒数与本次收割数值。它只在睡者仍睡着、原睡眠载体未变、施术者仍在时收割一次。
    WorldCombat.effect(nightmareBind, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["countdown", "drain", "shades", "reach"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid nightmare bind: " + key);
        });
        if (value.countdown < 1 || value.drain <= 0 || value.reach <= 0) throw new Error("Invalid nightmare bind");
        if (typeof value.caster !== "string") throw new Error("Invalid nightmare bind: caster");
        if (typeof value.sleepId !== "string" || typeof value.sleepKey !== "string") throw new Error("Invalid nightmare bind: sleep");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(nightmareBind, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        data.start = world.tick();
        // 托管恶梦印记的所有权：印记被刷新／替换／清除时这份租约失效，本效果随之退场。
        data.lease = MobEffects.bind(world, victim, nightmareEffect);
        effect.state(JSON.stringify(data));
        effect.schedule("watch", "watch", 1, "{}");
        effect.schedule("payoff", "payoff", Math.max(1, Math.round(data.countdown)), "{}");
    });
    WorldCombat.effectHandler(nightmareBind, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 每刻确认一次：睡者还在、恶梦印记仍归本次所有、仍是同一场睡眠、施术者还在。任一不成立就消散。
    WorldCombat.effectHandler(nightmareBind, "watch", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || !MobEffects.present(world, data.lease)) { effect.end(); return; }
        if (!nightmareSleepMatches(world, victim, data) || !CombatStatus.behaves(world, victim, "sleep")
            || !world.valid(effect.source())) { effect.end(); return; }
        const body = world.observe(victim), source = world.observe(effect.source());
        if (body === null || source === null || body.position().minus(source.position()).length() > data.reach + .5) {
            effect.end(); return;
        }
        if (body !== null) {
            const remaining = Math.max(0, data.countdown - (world.tick() - data.start));
            const progress = Math.max(0, Math.min(1, 1 - remaining / Math.max(1, data.countdown)));
            const ring = Math.max(0.35, 1.5 - progress * 0.9) * Math.max(0.5, Math.min(1.6, data.shades / 12));
            WorldFeedback.onEffect(world, effect.id(), "nightmare:count", nightmareScene, 1, body.position(),
                { moment: "countdown", target: String(victim.ref()), shades: Math.max(4, Math.round(data.shades)),
                    remaining: remaining, total: data.countdown, ring: Math.round(ring * 100) / 100,
                    progress: Math.round(progress * 100) / 100, intensity: Math.round((1 + progress) * 100) / 100 });
        }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(nightmareBind, "payoff", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || !MobEffects.present(world, data.lease)
            || !nightmareSleepMatches(world, victim, data) || !CombatStatus.behaves(world, victim, "sleep")
            || !world.valid(effect.source())) { effect.end(); return; }
        const body = world.observe(victim), source = world.observe(effect.source());
        if (body === null || source === null) { effect.end(); return; }
        // 施术者离得太远时这一口收割不到：梦影消散，不结算伤害。
        if (body.position().minus(source.position()).length() > data.reach + 0.5) { effect.end(); return; }
        const amount = Math.max(1, Math.floor(body.maxHealth() * Math.max(0.05, data.drain)));
        const loss = -world.health(victim, -amount, "world_combat:nightmare");
        if (loss > 0) {
            // intensity 由本次实际扣血占最大生命的比例换算，缩放收割各发射器的密度与亮度。
            const intensity = Math.max(0.5, Math.min(2.2, loss / Math.max(1, body.maxHealth() * 0.12)));
            WorldFeedback.emit(world, nightmareScene, 1, body.position(),
                { moment: "harvest", target: String(victim.ref()), shades: Math.max(4, Math.round(data.shades)),
                    intensity: Math.round(intensity * 100) / 100 }, 26);
            WorldFeedback.text(world, nightmareAbove(body.position()), "world_combat.move.nightmare.text.drain", [Math.round(loss * 10) / 10], 24);
            world.sound("minecraft:particle.soul_escape", body.position(), 12, "{}");
        }
        // 这一抽本身就是伤害：共享的「受伤即醒」把人弄醒；无论如何此次恶梦都到此为止。
        effect.end();
    });
    // 恶梦收场：此刻还睡着＝梦影消散（fade）；已经被弄醒＝醒来切断全部黑影（wake）。
    WorldCombat.effectHandler(nightmareBind, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) return;
        const body = world.observe(victim);
        if (body === null) return;
        if (CombatStatus.behaves(world, victim, "sleep")) {
            WorldFeedback.emit(world, nightmareScene, 1, body.position(), { moment: "fade", target: String(victim.ref()) }, 24);
        } else {
            WorldFeedback.emit(world, nightmareScene, 1, body.position(), { moment: "wake", target: String(victim.ref()) }, 24);
            WorldFeedback.text(world, nightmareAbove(body.position()), "world_combat.move.nightmare.text.wake", [], 24);
        }
    });

    // 恶梦印记被外部清掉（牛奶／清状态）时收回绑定；绑定自己的 end 负责退场表现。
    WorldCombat.on("world_combat:move_nightmare/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== nightmareEffect) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        const binds = world.effects(victim, nightmareBind);
        for (let i = 0; i < binds.length; i++) world.operation(binds[i].id(), "world_combat:dispel", "{}");
    });

    define({
        id: nightmareId,
        cooldownParameter: "recharge",
        name: "Nightmare",
        description: "趁对手睡熟给它压上恶梦：黑影倒数一段，走完时若它仍是同一场睡眠且在射程内，就一次抽走一份最大生命，这一抽的疼痛会把它弄醒，恶梦也随醒来散去。只对睡着的目标生效，伤害按最大生命比例结算、不经过防御与相性；提前被打醒、被驱散、睡者重新入睡或施术者离开射程，恶梦都会立即消散。Boss 免疫睡眠便无法被下咒。",
        uses: ["收割自己或队友制造的睡眠窗口", "在睡者身上打出一记不看防御的重击", "逼对手花资源解掉恶梦或来保护睡者"],
        kind: "enemy",
        range: 8,
        maxRange: 14,
        prepare: 12,
        active: 1,
        recover: 10,
        cooldown: 90,
        style: "nightmare",
        defaults: { deep: false },
        fields: [
            field(pathOf("deep"), "深梦", "boolean", {
                help: "开启：一次收割 ×1.15，但倒数更慢（+15 刻，约 45 刻）、起手 +2 刻、冷却 +6 刻，用来压得更重；关闭（浅梦）：一次收割 ×0.85，但倒数更快（约 30 刻），趁睡眠窗口更早结清。"
            })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[nightmareId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(nightmareId, "tempo", context)),
                recover: Math.round(p(nightmareId, "aftercast", context)),
                cooldown: Math.round(p(nightmareId, "recharge", context)),
                active: 1,
                range: p(nightmareId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (!CombatStatus.behaves(world, target, "sleep")) return "not-asleep";
            if (CombatStatus.has(world, target, "nightmare")) return "already-nightmared";
            if (body.position().minus(action.origin()).length() > action.range() + 0.3) return "out-of-range";
            return world.clear(action.origin(), body.position()) ? "" : "no-line";
        },
        windup: function (action, config, prepare) {
            action.present("nightmare:windup:" + action.id(), nightmareScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[nightmareId], detail: { values: config } };
            return { radius: pokemon ? p(nightmareId, "reach", context) : 8, geometry: "line", style: "nightmare", color: 0x4B2A6B,
                label: config && config.deep === true ? "恶梦·深梦" : "恶梦·浅梦" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target) || !CombatStatus.behaves(world, target, "sleep")) {
                WorldFeedback.emit(world, nightmareScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const body = world.observe(target);
            const at = body === null ? action.targetPosition() : body.position();
            const origin = action.origin();
            const countdown = Math.max(1, Math.round(p(nightmareId, "countdown", action)));
            const drain = Math.max(0.05, p(nightmareId, "drain", action));
            const shades = Math.max(4, Math.round(p(nightmareId, "shades", action)));
            const radius = Math.max(0.2, p(nightmareId, "sealRadius", action));
            const reach = Math.max(1, p(nightmareId, "reach", action));
            const ref = String(target.ref());
            const anchor = nightmareSleepAnchor(world, target);
            sound(action, "minecraft:entity.evoker.prepare_attack");
            // seal 是一条连接施术者与睡者的真实影线（非沿线飞行）；curse 的梦印半径随 sealRadius 放大。
            WorldFeedback.emit(world, nightmareScene, 1, origin,
                { moment: "seal", path: [String(action.actor().ref()), ref], target: ref,
                    shades: shades, scale: Math.max(0.6, Math.min(1.8, radius / 0.5)) }, 28);
            if (MobEffects.apply(world, target, nightmareEffect, countdown + 10, 0) === null) {
                WorldFeedback.emit(world, nightmareScene, 1, at, { moment: "immune", target: ref }, 20);
                WorldFeedback.text(world, nightmareAbove(at), "world_combat.move.nightmare.text.immune", [], 24);
                done(action);
                return;
            }
            const existing = world.effects(target, nightmareBind);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            world.effect(nightmareBind, target,
                JSON.stringify({ countdown: countdown, drain: drain, shades: shades, caster: String(action.actor().ref()), reach: reach,
                    sleepId: anchor === null ? "" : anchor.id, sleepKey: anchor === null ? "" : anchor.key }), countdown + 20);
            WorldFeedback.emit(world, nightmareScene, 1, at, { moment: "curse", target: ref, shades: shades, remaining: countdown }, 28);
            WorldFeedback.text(world, nightmareAbove(at), "world_combat.move.nightmare.text.curse", [Math.round(countdown / 20 * 10) / 10], 28);
            sound(action, "minecraft:entity.evoker.cast_spell");
            done(action);
        }
    });
}
