/**
 * 和睦相处 / Play Nice — 执行组织。
 *
 * 核心念头：当着对手的面摊开双手表示和睦，让追上来的东西先停手。手势以自身为圆心摊开，所以它不要瞄准，
 *   但要求别人看得见你——想让它成立，必须自己站进人堆里。除了降攻击，它当场平息对方的敌意，
 *   并在身份存续期间维持，是本组唯一能让人「不打你」的一招；代价是这份和睦很脆——一旦自己这边先动手，
 *   对方立刻翻脸，只有降下去的攻击还留着。
 *
 * 出手：短起手（windup 在身侧摊开手势）后提交，以自身为圆心摊开。
 * 命中：WorldGeometry.select 取半径内看得见、尚未被劝住的非友方，逐个降攻击（能力下降始终保留）。
 *       平息敌意交由世界 native target：成功才挂共享身份 world_combat:befriended_offer（身份
 *       world_combat:status/befriended）与一只托管效果；原生 Boss 拒绝改目标时只留一次降攻的小纹，不硬控。
 * 维持与破裂：托管效果存续期间每秒再平息一次；一旦对方受到来自施法者阵营的敌对伤害，托管的和睦结束、
 *       握手表现随之断开，对方可以重新还手，但已降的攻击等级保留。
 * 反制：背对、看不见手势，或者干脆离远到半径之外；它不造成伤害，也不阻止对方绕后。
 */
namespace PokemonSkills {
    function playniceAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 和睦破裂时用的一支托管效果：持有握手表现与「谁在劝」，并负责在存续期间维持停手。 */
    const playniceCalmMark = "world_combat:playnice_calm";

    /**
     * 劝一个人：先降攻击（能力下降始终保留），再尝试平息敌意。
     * 平息成功才挂共享身份与握手；Boss 拒绝改目标时只落降攻的小纹。返回是否真的平息住了。
     */
    function playniceCalmActor(world: CombatWorld, actor: CombatActor, drop: number, calm: number, sparkles: number): boolean {
        NativeEffects.boost(world, actor, "atk", -drop);
        const calmed = world.target(actor, null);
        const at = world.observe(actor);
        if (at === null) return false;
        if (!calmed) {
            WorldFeedback.emit(world, playniceScene, 1, at.position(),
                { moment: "downdrop", target: String(actor.ref()), drop: drop, sparkles: sparkles }, 26);
            return false;
        }
        MobEffects.apply(world, actor, playniceEffect, calm, 0);
        world.effect(playniceCalmMark, actor,
            JSON.stringify({ caster: String(world.source().ref()), drop: drop }), calm);
        WorldFeedback.emit(world, playniceScene, 1, at.position(),
            { moment: "befriend", target: String(actor.ref()), drop: drop, sparkles: sparkles }, 30);
        WorldFeedback.text(world, playniceAbove(at.position()), "world_combat.move.playnice.text.befriend", [drop], 40);
        return true;
    }

    // 托管效果只负责两件事：把「谁在劝」记下来，并在存续期间每秒再平息一次。握手表现绑在它上面。
    WorldCombat.effect(playniceCalmMark, 1, 1200000, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.caster !== "string" || !value.caster || typeof value.drop !== "number" || !isFinite(value.drop))
            throw new Error("Invalid play nice calm");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(playniceCalmMark, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_playnice/hold", playniceScene, 1, body.position(),
            { moment: "hold", target: String(actor.ref()), drop: state.drop });
        effect.schedule("keep", "keep", 20, "{}");
    });
    WorldCombat.effectHandler(playniceCalmMark, "keep", function (effect) {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor)) { effect.end(); return; }
        world.target(actor, null);
        effect.schedule("keep", "keep", 20, "{}");
    });
    WorldCombat.effectHandler(playniceCalmMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 己方先动手就把这份和睦打碎：受来自施法者阵营的敌对伤害时，结束平息、断开握手；攻击下降保留。
    WorldCombat.on("world_combat:move_playnice/break", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), victim = event.target(), attacker = event.actor();
        if (victim === null || !world.valid(victim)) return;
        const marks = world.effects(victim, playniceCalmMark);
        if (!marks.length) return;
        for (let index = 0; index < marks.length; index++) {
            const state = JSON.parse(String(marks[index].data()));
            const caster = world.actor(state.caster);
            const fromCasterSide = caster !== null && world.valid(caster)
                && (String(attacker.key()) === String(caster.key()) || world.allied(attacker, caster));
            if (!fromCasterSide) continue;
            MobEffects.consume(world, victim, playniceEffect);
            world.operation(marks[index].id(), "world_combat:dispel", "{}");
            const body = world.observe(victim);
            if (body !== null)
                WorldFeedback.emit(world, playniceScene, 1, body.position(),
                    { moment: "break", target: String(victim.ref()), drop: state.drop }, 22);
        }
    });

    define({
        id: playniceId,
        cooldownParameter: "recharge",
        name: "和睦相处",
        description: "当着对手摊开双手表示和睦，让它失去战斗的气力，降低攻击，并当场平息它的敌意、暂时不再动手。手势以自身为圆心摊开，必须站进人堆里、还要让对方看得见；这份和睦很脆，自己这边一动手就会破裂。",
        uses: ["被围住时劝停一圈近战", "让追上来的敌人先松口再脱离", "给队友争取重新站位的时间"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "friendship",
        defaults: { bow: false },
        fields: [
            flag("bow", "作揖")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[playniceId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(playniceId, "tempo", context)),
                recover: p(playniceId, "recover", context),
                cooldown: Math.round(p(playniceId, "recharge", context)),
                active: 1,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("playnice-windup", playniceScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", bow: config && config.bow ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            const bow = !!(config && config.bow);
            return { radius: bow ? 2.2 : 3.4, geometry: "circle", style: "friendship", color: 0x6FC26F,
                label: bow ? "和睦相处·作揖" : "和睦相处" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const radius = Math.max(1.4, p(playniceId, "offerRadius", action));
            const drop = Math.max(1, Math.min(3, Math.round(p(playniceId, "atkDrop", action))));
            const calm = Math.max(40, Math.round(p(playniceId, "calmTicks", action)));
            const cap = Math.max(1, Math.round(p(playniceId, "maxTargets", action)));
            const sparkles = Math.max(10, Math.round(p(playniceId, "sparkles", action)));
            const bow = !!(config && config.bow);
            sound(action, "minecraft:block.note_block.chime");
            let caught = 0, calmed = 0;
            WorldGeometry.select(world, WorldGeometry.ring(origin, 0, radius), function (actor, facts) {
                if (caught >= cap || facts.friendly() || !facts.visible()) return;
                if (CombatStatus.has(world, actor, "befriended")) return;
                caught++;
                if (playniceCalmActor(world, actor, drop, calm, sparkles)) calmed++;
            });
            WorldFeedback.emit(world, playniceScene, 1, origin,
                { moment: "offer", radius: radius, caught: caught, calmed: calmed, drop: drop, bow: bow ? 1 : 0,
                    sparkles: sparkles, scale: radius / 3.0 }, 34);
            if (caught > 0)
                WorldFeedback.text(world, playniceAbove(origin), "world_combat.move.playnice.text.offer", [caught, drop], 40);
            done(action);
        }
    });
}
