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
 *   添柴（随时，由世界事件驱动）：火在的这段时间里，每挨一记**敌方直接攻击**（原生近战／弹体或 authored
 *       招式，`DamageSemantics.directOffense`）就把攻击烧旺 perHit 档（封顶 rageCap），实际涨了几档以
 *       `NativeEffects.boost` 的返回值为准；自己下一次出手时火焰收进身体（committed，emit consume），
 *       自然烧尽才散成余烬（mob_effect_removed, cause=expired，emit fade）。友方、自己与中毒／灼烧等 DOT 不养怒。
 *
 * 状态归真实 carrier：这一次姿态的 perHit／cap／fed 放在一个绑定怒火载体的托管效果里（`rageStanceEffect`），
 *   刷新换新 anchor、驱散随载体一起收；守卫的守炉火光也由它 `onEffect` 承载，不留下失效锚或残火。
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

    /** 这一次姿态的配置与累计预算；随怒火载体的当前 revision 绑定。 */
    interface RageStance { anchor: MobEffects.Anchor; perHit: number; cap: number; ticks: number; fed: number; }

    /** 与当前怒火载体匹配的这一次姿态；没有（未点起、被替换、被驱散）返回 null。 */
    function rageStance(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, rageStanceEffect);
        for (let i = 0; i < views.length; i++) {
            const value: RageStance = JSON.parse(String(views[i].data()));
            if (value && MobEffects.matches(world, actor, value.anchor)) return views[i];
        }
        return null;
    }

    /** 守炉火光：绑在这座姿态自己的托管效果上，随它更新、随载体一起收。 */
    function ragePulse(effect: CombatEffect, state: RageStance): void {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor);
        if (body === null) return;
        const stages = state.fed || 0;
        WorldFeedback.onEffect(world, effect.id(), "rage:aura:" + String(actor.ref()), rageScene, 1, body.position(),
            { moment: "aura", target: String(actor.ref()), stages: stages, lift: 0.25 + stages * 0.16,
                plumes: Math.round(6 + stages * 3), bright: Math.min(0.9, 0.25 + stages * 0.08) });
    }

    WorldCombat.effect(rageStanceEffect, 1, 24000, "actor", function (json) {
        const value: RageStance = JSON.parse(json || "{}");
        if (!value || !MobEffects.validAnchor(value.anchor)) throw new Error("Invalid rage stance anchor");
        if (!(value.perHit >= 1) || !isFinite(value.perHit)) throw new Error("Invalid rage stance perHit");
        if (!(value.cap >= 1) || !isFinite(value.cap)) throw new Error("Invalid rage stance cap");
        if (!(value.ticks >= 1) || !isFinite(value.ticks)) throw new Error("Invalid rage stance ticks");
        if (!(value.fed >= 0) || !isFinite(value.fed)) throw new Error("Invalid rage stance fed");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(rageStanceEffect, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state: RageStance = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.anchor)) { effect.end(); return; }
        ragePulse(effect, state);
        effect.schedule("beat", "beat", 10, "{}");
    });
    WorldCombat.effectHandler(rageStanceEffect, "beat", function (effect) {
        const world = effect.world(), actor = effect.target(), state: RageStance = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.anchor)) { effect.end(); return; }
        ragePulse(effect, state);
        effect.schedule("beat", "beat", 10, "{}");
    });
    WorldCombat.effectHandler(rageStanceEffect, "operation:world_combat:move_rage/stoke", function (effect) {
        const request: { anchor: MobEffects.Anchor; fed: number; ticks: number } = JSON.parse(effect.input());
        if (!request || !MobEffects.validAnchor(request.anchor) || !(request.fed >= 0) || !(request.ticks > 0)) return;
        const world = effect.world(), actor = effect.target(), state: RageStance = JSON.parse(effect.state());
        if (!world.valid(actor)) { effect.end(); return; }
        // 火续满时长会让原生换一次 carrier revision：姿态立刻跟到最新 anchor，不留失效锚。
        state.anchor = request.anchor;
        state.fed = Math.round(request.fed);
        state.ticks = Math.round(request.ticks);
        effect.state(JSON.stringify(state));
        effect.remaining(state.ticks);
        if (MobEffects.matches(world, actor, state.anchor)) ragePulse(effect, state);
    });
    WorldCombat.effectHandler(rageStanceEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        freeMovement: true,
        id: rageId,
        cooldownParameter: "recharge",
        name: "Rage",
        description: "先抡一记很轻的怒气，同时给自己点起一座红炉：火还烧着的时候，每挨一记外来伤害就把攻击烧旺一档，火越旺攻击越高；自己下一次出手时火焰熄灭，涨起来的攻击留着。适合先开火、再迎着对手对拼。",
        uses: ["先给自己点起怒火、再迎着对手打", "挨打时把攻击一档档烧旺",
               "在近身缠斗里滚出越来越高的物攻"],
        kind: "aim",
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

            // 开火：先点起怒火，这一记打不打得中都算数。重开先收掉旧姿态的旧表现，不叠第二份、不留失效锚。
            world.effects(self, rageStanceEffect).forEach(function (view) {
                world.operation(view.id(), "world_combat:dispel", "{}");
            });
            const carrier = MobEffects.apply(world, self, rageEffect, ticks, 0);
            if (carrier !== null) {
                const mark = world.effect(rageStanceEffect, self,
                    JSON.stringify({ anchor: MobEffects.anchor(carrier), perHit: perHit, cap: cap, ticks: ticks, fed: 0 }), ticks);
                if (mark === 0) {
                    world.removeMobEffect(self, rageEffect, carrier.key());
                } else if (body !== null) {
                    WorldFeedback.emit(world, rageScene, 1, body.position(),
                        { moment: "ignite", target: String(self.ref()), cap: cap, perHit: perHit,
                            plumes: 14, bright: 0.5 }, 30);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), rageIgniteText,
                        [Math.round(ticks / 20)], 26);
                    world.sound("minecraft:entity.hoglin.angry", body.position(), 16, "{}");
                }
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
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, rageId, power,
                            { damage: damageSpec(rageId, "tantrum"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.hitDisplace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, rageScene, 1, hit.position(),
                            { moment: "strike", target: String(victim.ref()), scale: scale,
                                power: Math.round(power * 10) / 10 }, 24);
                        if (landed) WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.05, 0)), rageHitText, [], 22);
                    }
                    done(current);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < p(rageId, "minimumMove", current) || travelled >= length) {
                    miss(current, current.origin());
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });

    // 添柴：带着怒火挨了一记**敌方直接攻击**，就烧旺实际涨到的档数；到顶或被拒绝不虚记、不冒火光。
    WorldCombat.on("world_combat:move_rage/stoke", "world_combat:damage_applied", "", function (event) {
        const victim = event.target(), source = event.actor();
        if (victim === null || source === null) return;
        if (String(source.key()) === String(victim.key())) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        // 直接攻击：敌方原生近战／弹体，或 authored 招式伤害；友方、自损、中毒／灼烧等周期伤与变化招式都不养怒。
        if (!DamageSemantics.directOffense(data)) return;
        const world = event.world();
        if (!world.valid(victim) || !CombatStatus.has(world, victim, "rage")) return;
        if (world.allied(source, victim)) return;
        const stance = rageStance(world, victim);
        if (stance === null) return;
        const state: RageStance = JSON.parse(String(stance.data()));
        const fed = state.fed || 0;
        if (fed >= state.cap) return;
        // 以真实等级差记账：特性拒绝、外部已顶到 +6 或任何被改写的增量都留在实际值上。
        const gain = NativeEffects.boost(world, victim, "atk", Math.min(state.perHit, state.cap - fed));
        if (!(gain > 0)) return;
        // 火续满时长：刷新原生应用，姿态随后跟到最新 revision。
        world.marker(victim, rageEffect, state.ticks, 0);
        const refreshed = world.mobEffect(victim, rageEffect);
        if (refreshed === null) return;
        world.operation(stance.id(), rageStokeOperation,
            JSON.stringify({ anchor: MobEffects.anchor(refreshed), fed: fed + gain, ticks: state.ticks }));
        const stages = fed + gain;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, rageScene, 1, body.position(),
            { moment: "stoke", target: String(victim.ref()), stages: stages, gain: gain,
                lift: 0.3 + stages * 0.16, plumes: Math.round(10 + stages * 5), bright: Math.min(1, 0.35 + stages * 0.1) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), rageStokeText, [gain, stages], 24);
        world.sound("minecraft:entity.hoglin.attack", body.position(), 14, "{}");
    });

    // 出手即熄火：带着怒火提交了任何一手，火焰收进身体（涨起来的攻击等级留着）。
    WorldCombat.on("world_combat:move_rage/consume", "world_combat:committed", "", function (event) {
        const actor = event.actor();
        if (actor === null) return;
        const world = event.world();
        if (!world.valid(actor) || !CombatStatus.has(world, actor, "rage")) return;
        const stance = rageStance(world, actor);
        const stages = stance === null ? 0 : (JSON.parse(String(stance.data())).fed || 0);
        const body = world.observe(actor);
        if (body !== null) WorldFeedback.emit(world, rageScene, 1, body.position(),
            { moment: "consume", target: String(actor.ref()), stages: stages,
                plumes: Math.round(10 + stages * 4), bright: Math.min(1, 0.4 + stages * 0.1) }, 24);
        // 驱散载体：守炉火光由姿态自己的托管效果随 carrier 一起收。
        CombatStatus.cure(world, actor, "rage");
    });

    // 火灭：姿态随载体结束即时收束；只有自然烧尽（cause=expired）才补一簇余烬，收火/驱散不留残火。
    WorldCombat.on("world_combat:move_rage/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rageEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新/替换：旧应用被移除而新应用仍在——不是真的结束。
        if (MobEffects.read(world, actor, rageEffect) !== null) return;
        world.effects(actor, rageStanceEffect).forEach(function (view) {
            world.operation(view.id(), "world_combat:dispel", "{}");
        });
        if (String(data.cause) !== "expired") return;
        const body = world.observe(actor);
        if (body !== null) WorldFeedback.emit(world, rageScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()), plumes: 10 }, 22);
    });
}
