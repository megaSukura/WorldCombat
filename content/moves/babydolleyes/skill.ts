/**
 * 圆瞳 / babydolleyes 的出手方式。
 *
 * 核心念头：睁大一双圆眼睛盯住对手，它举起的手先软下来——这一眼**足够快，抢在对手之前落下**。
 *
 * 两幕（一击完成）：
 *   睁眼（windup，提交前只观察与预告，可被打断，不花代价；起手极短，落成原生的 +1 先制）。
 *   看软（提交后）：一个看得见的目标挂共享身份 world_combat:status/charmed 的 world_combat:babydoll_eyes，
 *     再 NativeEffects.boost 下降攻击；两圈圆瞳在施法者眼前张开，一道眼波沿视线落到对手身上。
 * 视线：要求 world.clear 通视；被掩体挡住时只播 blocked，不掉任何东西。
 * 反制：躲到掩体后、或用距离换掉这一次；只有单体，也拦不住另一边的敌人。
 *
 * 与同族分开：叫声是一圈听得见的范围、撒娇是贴身的深卸或远距的飞吻；圆瞳是**单体的、最快的先手一眼**，
 * 卸得不多但几乎总能先落下。
 */
namespace PokemonSkills {
    function babydolleyesAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    WorldCombat.effect(babydolleyesMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.glints !== "number" || !isFinite(value.glints) || value.glints <= 0) throw new Error("Invalid babydolleyes mark: glints");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(babydolleyesMark, "start", function () { });
    WorldCombat.effectHandler(babydolleyesMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function babydolleyesMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, babydolleyesMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }

    define({
        id: babydolleyesId,
        name: "圆瞳",
        description: "睁大圆眼睛凝视一个看得见的对手，压低它的攻击；起手极短，几乎总能先落下。改变凝视方式可以卸得更深，但会慢一些。",
        uses: ["被追上来的物攻威胁逼住时先压低它", "在它出手前抢一记先手削弱", "配合队友把一只近身威胁的出手压软"],
        kind: "enemy",
        range: 4,
        maxRange: 7,
        prepare: 5,
        active: 1,
        recover: 4,
        cooldown: 70,
        style: "gaze",
        defaults: { stare: false },
        fields: [flag("stare", "凝视")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[babydolleyesId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(1, Math.round(p(babydolleyesId, "tempo", context))),
                recover: Math.round(p(babydolleyesId, "recover", context)),
                cooldown: Math.round(p(babydolleyesId, "recharge", context)),
                active: 1,
                range: p(babydolleyesId, "gazeRange", context)
            };
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(babydolleyesId, "gazeRange", pokemon) : 4, geometry: "line", style: "gaze",
                color: 0xF7A8C4, label: config && config.stare ? "圆瞳·凝视" : "圆瞳" };
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_babydolleyes:windup", babydolleyesScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", stare: config && config.stare ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(2, Math.round(p(babydolleyesId, "drop", action))));
            const soften = Math.max(60, Math.round(p(babydolleyesId, "softenTicks", action)));
            const glints = Math.max(8, Math.round(p(babydolleyesId, "glints", action)));
            const stare = !!(config && config.stare);
            sound(action, "minecraft:entity.cat.purr");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, babydolleyesScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (!world.clear(origin, point)) {
                WorldFeedback.emit(world, babydolleyesScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, babydolleyesAbove(point), babydolleyesBlockedText, [], 28);
                done(action);
                return;
            }
            MobEffects.apply(world, target, babydolleyesEffect, soften, 0);
            NativeEffects.boost(world, target, "atk", -drop);
            world.effect(babydolleyesMark, target, JSON.stringify({ glints: glints }), soften);
            WorldFeedback.emit(world, babydolleyesScene, 1, point,
                { moment: "gaze", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                    drop: drop, glints: glints, stare: stare ? 1 : 0, scale: stare ? 1.25 : 1 }, 30);
            WorldFeedback.text(world, babydolleyesAbove(point), babydolleyesGazeText, [drop], 34);
            done(action);
        }
    });

    // 心软存续期间，目标头顶持续浮起被看软的眼波。
    WorldCombat.on("world_combat:move_babydolleyes/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== babydolleyesEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = babydolleyesMarkOf(world, actor);
        WorldFeedback.keep(world, "world_combat:move_babydolleyes/linger/" + String(actor.ref()), babydolleyesScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), glints: mark ? mark.glints : 12 }, 22);
    });
}
