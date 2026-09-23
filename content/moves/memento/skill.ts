/**
 * 临别礼物 / Memento — 执行组织。
 *
 * 核心念头：把自己的存在当作礼物送出去——当场倒下，在倒下的地方炸开一团漆黑的遗念，缠住身边看得见的敌人；
 *   遗念留下来继续把礼物一份份送出去：踏进它范围的敌人攻击与特攻各被夺走数级。
 *
 * 出手：一段可被打断的起手（windup）后提交；提交即结清 PP 与冷却。
 * 命中：以自身为圆心 giftRadius 的圈内、看得见的非友方各挂共享的 world_combat:memento_grief
 *       （身份 world_combat:status/grieving）。
 * 结果：施法者把当前生命全部交出去（濒死）；随后在原地放出遗念（WorldBodies 持久实体）。
 *       遗念由它自己承担「礼物」：对范围内每个尚未被哀悼的非友方各降一次攻击与特攻（各 drop 级），
 *       并持续为范围内的人续上哀悼。哀悼的人出手会迟疑（概率失手）。
 *       能力等级下降按共享阶梯保留；哀悼身份在身时，招式发动与原生普通攻击各有一次失手判定。
 * 落空：圈内一个非友方都没有时，礼物没送出去，施法者不倒——这是原生 selfdestruct: "ifHit" 的意思。
 * 反制：走出礼物半径、躲到掩体后就不会被罩到；遗念只在一小块地方，把敌人从它旁边引开即可。
 */
namespace PokemonSkills {
    const MementoSlowed = 0.2;

    function mementoAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 给一个目标挂上哀悼身份并播命中表现；真正的攻击/特攻削减由遗念承担（见下）。 */
    function mementoGrieve(world: CombatWorld, target: CombatActor, drop: number, grief: number, darkness: number): void {
        MobEffects.apply(world, target, mementoEffect, grief, 0);
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, mementoScene, 1, body.position(),
            { moment: "grief", target: String(target.ref()), drop: drop, darkness: darkness }, 28);
        WorldFeedback.text(world, mementoAbove(body.position()), "world_combat.move.memento.text.grief", [drop], 34);
    }

    // 招式在提交时判一次，原生普通攻击在命中时判一次；脚本伤害不重复掷骰。
    CombatStatus.actions.define({
        id: "world_combat:move/memento/grief",
        apply: function (context) {
            const attempt = context.phase === "commit" || context.phase === "damage" && DamageSemantics.read(context.metadata).attack;
            if (!attempt || !context.world.valid(context.actor)) return;
            if (!CombatStatus.has(context.world, context.actor, "grieving")) return;
            context.failures.grieving = MementoSlowed;
        }
    });

    function mementoState(brain: CombatEffect): any { return JSON.parse(brain.state()); }

    /** 遗念每 4 刻：浮在倒下处；对新进入范围的非友方各送一份削减、给所有人续上哀悼。 */
    function mementoHaunt(brain: CombatEffect): void {
        var world = brain.world(), state = mementoState(brain), at = world.observe(brain.target());
        if (at === null) return;
        var point = at.position();
        WorldFeedback.keep(world, "memento:" + String(brain.target().ref()), mementoScene, 1, point,
            { moment: "remnant", target: String(brain.target().ref()), radius: state.radius, scale: state.radius / 2.6,
                darkness: state.darkness }, 20);
        var marked = state.marked || (state.marked = {});
        var actors = world.query(point, state.radius, false), changed = false;
        for (var i = 0; i < actors.length; i++) {
            var actor = actors[i];
            if (world.friendly(actor)) continue;
            var facts = world.observe(actor);
            if (facts === null || !world.clear(point, facts.position())) continue;
            var ref = String(actor.ref());
            if (!marked[ref]) {
                marked[ref] = true; changed = true;
                NativeEffects.boost(world, actor, "atk", -state.drop);
                if (world.valid(actor)) NativeEffects.boost(world, actor, "spa", -state.drop);
                var body = world.observe(actor);
                if (body !== null) {
                    WorldFeedback.emit(world, mementoScene, 1, body.position(),
                        { moment: "grief", target: ref, drop: state.drop, darkness: state.darkness }, 28);
                    WorldFeedback.text(world, mementoAbove(body.position()), "world_combat.move.memento.text.grief", [state.drop], 34);
                }
            }
            if (world.valid(actor)) MobEffects.apply(world, actor, mementoEffect, state.renew, 0);
        }
        if (changed) brain.state(JSON.stringify(state));
    }

    WorldBodies.define(mementoRemnant, {
        schema: 1,
        maxTicks: 400,
        start: function (brain) { mementoHaunt(brain); },
        resume: function (brain) { mementoHaunt(brain); },
        tick: { every: 4, handler: function (brain) { mementoHaunt(brain); } },
        end: function (brain) {
            var world = brain.world(), at = world.observe(brain.target());
            if (at) world.presentFor("memento:end:" + String(brain.target().ref()), mementoScene, 1, at.position(),
                JSON.stringify({ moment: "fade", target: String(brain.target().ref()) }), 24);
        }
    });

    define({
        id: mementoId,
        cooldownParameter: "recharge",
        name: "临别礼物",
        description: "牺牲自己，在倒下处留下遗念。遗念压低附近敌人的攻击与特攻，并让它们出手时可能失手；范围内没有敌人时不会牺牲。",
        uses: ["残血时把围上来的强敌一起废掉", "用一条命换取对手主力的输出崩盘", "在自己必死的一刻把遗念留在原地继续施压"],
        kind: "self",
        range: 3.5,
        maxRange: 4.5,
        prepare: 12,
        active: 1,
        recover: 0,
        cooldown: 240,
        style: "farewell",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mementoId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(mementoId, "tempo", context)),
                recover: 0,
                cooldown: Math.round(p(mementoId, "recharge", context)),
                active: 1,
                range: p(mementoId, "giftRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("memento-windup", mementoScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()) }));
            return prepare;
        },
        indicator: function () { return { radius: 3.0, geometry: "circle", style: "farewell", color: 0x5B2A86, label: "临别礼物" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const drop = Math.max(1, Math.min(3, Math.round(p(mementoId, "drop", action))));
            const radius = Math.max(1.5, p(mementoId, "giftRadius", action));
            const grief = Math.max(60, Math.round(p(mementoId, "griefTicks", action)));
            const remnantTicks = Math.max(60, Math.round(p(mementoId, "remnantTicks", action)));
            const remnantRadius = Math.max(1.2, p(mementoId, "remnantRadius", action));
            const darkness = Math.max(12, Math.round(p(mementoId, "darkness", action)));
            let caught = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(origin, 0, radius), function (actor, facts) {
                if (!world.clear(origin, facts.position())) return;
                mementoGrieve(world, actor, drop, grief, darkness);
                caught++;
            });
            sound(action, "minecraft:entity.wither.spawn");
            if (caught <= 0) {
                WorldFeedback.emit(world, mementoScene, 1, origin, { moment: "wasted", target: String(self.ref()) }, 20);
                WorldFeedback.text(world, mementoAbove(origin), "world_combat.move.memento.text.wasted", [], 30);
                done(action);
                return;
            }
            // 先把遗念放出来（它属于自己、承担礼物），再让自己倒下——倒下后动作作用域不再可用。
            WorldBodies.spawn(world, origin,
                { size: [0.5, 0.5], health: 6, gravity: false, pushable: false, invulnerable: true, silent: true,
                    knockbackResistance: 1, glow: true, appearance: { sprite: "cobblemon:generic/fire/wisp", scale: 1.1, tint: 0x5B2A86, glow: true } },
                mementoRemnant,
                { drop: drop, grief: grief, renew: Math.max(40, Math.round(grief * 0.6)), radius: remnantRadius,
                    darkness: darkness, marked: {}, caught: caught },
                remnantTicks);
            WorldFeedback.emit(world, mementoScene, 1, origin,
                { moment: "farewell", target: String(self.ref()), drop: drop, caught: caught, darkness: darkness, scale: radius / 3.0 }, 34);
            WorldFeedback.text(world, mementoAbove(origin), "world_combat.move.memento.text.farewell", [caught, drop], 34);
            const last = world.observe(self);
            if (last !== null) world.health(self, -last.health(), "world_combat:memento_cost");
            done(action);
        }
    });
}
