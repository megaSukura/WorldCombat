/**
 * 和睦相处 / Play Nice — 执行组织。
 *
 * 核心念头：当着对手的面摊开双手表示和睦，让追上来的东西先停手。手势以自身为圆心摊开，所以它不要瞄准，
 *   但要求别人看得见你——想让它成立，必须自己站进人堆里。除了降攻击，它当场平息对方的敌意，
 *   并在身份存续期间维持，是本组唯一能让人「不打你」的一招。
 *
 * 出手：短起手（windup 在身侧摊开手势）后提交，以自身为圆心摊开。
 * 命中：WorldGeometry.select 取半径内看得见、尚未被劝住的非友方，逐个挂共享的
 *       world_combat:befriended_offer（身份 world_combat:status/befriended），NativeEffects.boost 下降攻击，
 *       并把对方的 native 仇恨归零（world.target(actor, null)）；按 maxTargets 上限。
 * 维持：身份存续期间每秒再平息一次，让对方真正停手，而不是下一秒又扑上来。
 * 反制：背对、看不见手势，或者干脆离远到半径之外；它不造成伤害，也不阻止对方绕后。
 */
namespace PokemonSkills {
    function playniceAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 劝住一个人：挂身份、降攻击、平息敌意，并播命中表现与浮字。 */
    function playniceCalm(world: CombatWorld, actor: CombatActor, drop: number, calm: number, sparkles: number): void {
        MobEffects.apply(world, actor, playniceEffect, calm, 0);
        NativeEffects.boost(world, actor, "atk", -drop);
        world.target(actor, null);
        const at = world.observe(actor);
        if (at === null) return;
        WorldFeedback.emit(world, playniceScene, 1, at.position(),
            { moment: "befriend", target: String(actor.ref()), drop: drop, sparkles: sparkles }, 30);
        WorldFeedback.text(world, playniceAbove(at.position()), "world_combat.move.playnice.text.befriend", [drop], 40);
    }

    define({
        id: playniceId,
        name: "和睦相处",
        description: "当着对手摊开双手表示和睦，让它失去战斗的气力，降低攻击，并当场平息它的敌意、暂时不再动手。手势以自身为圆心摊开，必须站进人堆里、还要让对方看得见。",
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
            let caught = 0;
            WorldGeometry.select(world, WorldGeometry.ring(origin, 0, radius), function (actor, facts) {
                if (caught >= cap || facts.friendly() || !facts.visible()) return;
                if (CombatStatus.has(world, actor, "befriended")) return;
                playniceCalm(world, actor, drop, calm, sparkles);
                caught++;
            });
            WorldFeedback.emit(world, playniceScene, 1, origin,
                { moment: "offer", radius: radius, caught: caught, drop: drop, bow: bow ? 1 : 0,
                    sparkles: sparkles, scale: radius / 3.0 }, 34);
            if (caught > 0)
                WorldFeedback.text(world, playniceAbove(origin), "world_combat.move.playnice.text.offer", [caught, drop], 40);
            done(action);
        }
    });

    // 和睦期间，每秒再平息一次对方的敌意，并让头顶持续飘起暖点。
    WorldCombat.on("world_combat:move_playnice/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== playniceEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (world.tick() % 20 === 0) world.target(actor, null);
        if (world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "playnice:" + String(actor.ref()), playniceScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
