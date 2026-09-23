/**
 * 愤怒 / rage 的出手方式。
 *
 * 核心念头：先抡一记很轻的怒气，同时给自己点起一座红炉——炉子烧着的时候，每一次挨打都往里添柴，
 *   攻击一档一档烧旺；等自己下一次出手，炉火熄灭，涨起来的攻击就留着用。正确用法是开着火让对方打，
 *   再趁涨起来的攻击补一记。它是唯一「靠挨打变强」的一招。
 *
 * 三幕：
 *   起（windup，提交前）：脚下浮起暗红火星，怒气在攒（present windup）。
 *   开火（execute 起）：提交后立刻给自己挂上共享身份 `world_combat:status/rage` 的怒火，然后欺身抡出一记
 *       tantrum；打不打得中都无所谓，火已经点起来了。
 *   添柴（随时，由世界事件驱动）：火在的这段时间里，每挨一记外来伤害就把攻击烧旺 perHit 档（封顶 rageCap），
 *       画面爆出一簇上窜的火星；自己下一次出手时火焰熄灭（mob_effect_removed，emit fade）。
 *
 * 与同族分开：
 *   珍藏靠「用遍其他招」解锁、是一记重砸；愤怒靠「被击中的次数」变强、是一段自己点起的姿态。
 *   它也不像以牙还牙那样把伤害记下来还回去——愤怒涨的是攻击等级，攒的是进攻而不是报复。
 */
namespace PokemonSkills {
    const rageIgniteText = "world_combat.move.rage.text.ignite";
    const rageHitText = "world_combat.move.rage.text.hit";
    const rageStokeText = "world_combat.move.rage.text.stoke";
    const rageMissText = "world_combat.move.rage.text.miss";

    define({
        freeMovement: true,
        id: rageId,
        cooldownParameter: "recharge",
        name: "Rage",
        description: "先抡一记很轻的怒气，同时给自己点起一座红炉：火还烧着的时候，每挨一记外来伤害就把攻击烧旺一档，火越旺攻击越高；自己下一次出手时火焰熄灭，涨起来的攻击留着。适合先开火、再迎着对手对拼。",
        uses: ["先给自己点起怒火、再迎着对手打", "挨打时把攻击一档档烧旺",
               "在近身缠斗里滚出越来越高的物攻"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4.4,
        prepare: 5,
        active: 0,
        recover: 7,
        cooldown: 22,
        style: "contact",
        defaults: { fury: false, ai: { maxChase: 7, healthFloor: 35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(rageId, "collisionRadius", pokemon) * 1.4, geometry: "line", style: "contact", color: 0xB23A2E,
                label: config && config.fury === true ? "愤怒·暴怒" : "愤怒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[rageId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(rageId, "tempo", context)),
                recover: Math.round(p(rageId, "settle", context)),
                cooldown: Math.round(p(rageId, "recharge", context)),
                active: 0,
                range: p(rageId, "blink", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("rage:windup", rageScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", fury: config && config.fury === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const ticks = Math.max(1, Math.round(p(rageId, "rageTicks", action)));
            const perHit = Math.max(1, Math.round(p(rageId, "perHit", action)));
            const cap = Math.max(1, Math.round(p(rageId, "rageCap", action)));
            const body = world.observe(self);
            const direction = aim(action);
            const length = p(rageId, "blink", action);
            const step = p(rageId, "speed", action);
            const radius = p(rageId, "collisionRadius", action);
            const power = p(rageId, "tantrum", action);
            const push = p(rageId, "push", action);
            const scale = radius / 0.42;
            let travelled = 0;

            // 开火：先点起怒火，这一记打不打得中都算数。
            if (MobEffects.apply(world, self, rageEffect, ticks, 0) !== null) {
                rageIgnite(self, perHit, cap, ticks);
                if (body !== null) {
                    WorldFeedback.emit(world, rageScene, 1, body.position(),
                        { moment: "ignite", target: String(self.ref()), cap: cap, perHit: perHit,
                            plumes: Math.round(14 + cap * 3), bright: 0.6 }, 30);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), rageIgniteText,
                        [Math.round(ticks / 20)], 26);
                }
                world.sound("minecraft:entity.hoglin.angry", body === null ? action.origin() : body.position(), 16, "{}");
            }

            function miss(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, rageScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), rageMissText, [], 20);
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(p(rageId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, rageId, power,
                            { damage: damageSpec(rageId, "tantrum"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, rageScene, 1, hit.position(),
                            { moment: "strike", target: String(victim.ref()), scale: scale,
                                power: Math.round(power * 10) / 10 }, 24);
                        if (landed) WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.05, 0)), rageHitText, [], 22);
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(rageId, "minimumMove", current) || travelled >= length) {
                    miss(current, here.plus(delta));
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });

    // 添柴：带着怒火挨了一记外来伤害，就烧旺一档；到顶后火不再续。
    WorldCombat.on("world_combat:move_rage/stoke", "world_combat:damage_applied", "", function (event) {
        const victim = event.target(), source = event.actor();
        if (victim === null || source === null) return;
        if (String(source.key()) === String(victim.key())) return;
        const world = event.world();
        if (!world.valid(victim) || !CombatStatus.has(world, victim, "rage")) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0) || String(data.category) === "Status") return;
        const gain = rageStoke(world, victim);
        if (gain <= 0) return;
        rageRefresh(world, victim);
        const stages = rageFedCount(victim);
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, rageScene, 1, body.position(),
            { moment: "stoke", target: String(victim.ref()), stages: stages, gain: gain,
                plumes: Math.round(10 + stages * 5), bright: Math.min(1, 0.35 + stages * 0.1) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), rageStokeText, [gain, stages], 24);
        world.sound("minecraft:entity.hoglin.attack", body.position(), 14, "{}");
    });

    // 出手即熄火：带着怒火提交了任何一手，火焰就灭（涨起来的攻击等级留着）。
    WorldCombat.on("world_combat:move_rage/consume", "world_combat:committed", "", function (event) {
        const actor = event.actor();
        if (actor === null) return;
        const world = event.world();
        if (world.valid(actor) && CombatStatus.has(world, actor, "rage")) CombatStatus.cure(world, actor, "rage");
    });

    // 火灭（自然到点或被出手清掉）：放一簇余烬，忘掉这一次的火。
    WorldCombat.on("world_combat:move_rage/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rageEffect) return;
        const world = event.world(), actor = event.actor();
        if (world.valid(actor)) {
            const body = world.observe(actor);
            if (body !== null) WorldFeedback.emit(world, rageScene, 1, body.position(),
                { moment: "fade", target: String(actor.ref()), plumes: Math.round(8 + rageFedCount(actor) * 3) }, 22);
        }
        rageClear(actor);
    });

    // 还烧着时，每 10 刻冒一次低密度火光，让玩家看出「火还在」。
    WorldCombat.on("world_combat:move_rage/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rageEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 10 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "rage:aura:" + String(actor.ref()), rageScene, 1, body.position(),
            { moment: "aura", target: String(actor.ref()), stages: rageFedCount(actor),
                plumes: Math.round(6 + rageFedCount(actor) * 3), bright: Math.min(0.9, 0.25 + rageFedCount(actor) * 0.08) }, 12);
    });
}
