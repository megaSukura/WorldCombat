/** 真实牺牲确认后留下遗念；敌我名单在施法者仍活着时冻结。 */
namespace PokemonSkills {
    const MementoSlowed = 0.2;
    
    const MementoGiftReference = 3.0;
    const MementoRemnantReference = 2.6;

    const mementoGriefText = "world_combat.move.memento.text.grief";
    const mementoFarewellText = "world_combat.move.memento.text.farewell";
    const mementoWastedText = "world_combat.move.memento.text.wasted";
    const mementoHauntText = "world_combat.move.memento.text.haunt";
    const mementoFailedText = "world_combat.move.memento.text.failed";
    const mementoSpentText = "world_combat.move.memento.text.spent";

    function mementoAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    
    function mementoGrieve(world: CombatWorld, target: CombatActor, grief: number, darkness: number): boolean {
        const applied = MobEffects.apply(world, target, mementoEffect, grief, 0);
        if (applied === null || !applied.tagged(mementoSpot)) return false;
        const body = world.observe(target);
        if (body === null) return true;
        WorldFeedback.emit(world, mementoScene, 1, body.position(),
            { moment: "grief", target: String(target.ref()), darkness: darkness }, 28);
        WorldFeedback.text(world, mementoAbove(body.position()), mementoGriefText, [], 34);
        return true;
    }

    
    function mementoDrain(world: CombatWorld, target: CombatActor, drop: number, darkness: number): boolean {
        const atk = NativeEffects.boost(world, target, "atk", -drop);
        const spa = world.valid(target) ? NativeEffects.boost(world, target, "spa", -drop) : 0;
        if (atk === 0 && spa === 0) return false;
        const body = world.observe(target);
        if (body === null) return true;
        WorldFeedback.emit(world, mementoScene, 1, body.position(),
            { moment: "grief", target: String(target.ref()), drop: drop, darkness: darkness }, 28);
        WorldFeedback.text(world, mementoAbove(body.position()), mementoHauntText, [drop], 34);
        return true;
    }


    CombatStatus.actions.define({
        id: "world_combat:move/memento/grief",
        apply: function (context) {
            const attempt = context.phase === "commit" || context.phase === "damage" && DamageSemantics.read(context.metadata).attack;
            if (!attempt || !context.world.valid(context.actor)) return;
            if (!CombatStatus.has(context.world, context.actor, "grieving")) return;
            context.failures.grieving = MementoSlowed;
        }
    });


    function mementoWatch(brain: CombatEffect): void {
        if (DeferredSacrifice.waiting(brain)) return;
        const world = brain.world(), state = JSON.parse(brain.state()), point = MementoDeparture.point(state.centre);
        const region = WorldGeometry.ring(point, 0, state.radius);
        state.targets.forEach((entry: any) => {
            const target = world.actor(entry.ref), facts = target && world.valid(target) ? world.observe(target) : null;
            if (!target || !facts || !MementoDeparture.inside(region, facts) || !world.clear(point, facts.position())) return;
            if (!state.marked[entry.ref]) {
                state.marked[entry.ref] = true;
                mementoDrain(world, target, state.drop, state.darkness);
            }
            if (world.valid(target)) MobEffects.apply(world, target, mementoEffect, state.renew, 0);
        });
        brain.state(JSON.stringify(state));
        brain.schedule("watch", "watch", 4, "{}");
    }
    WorldBodies.define(mementoRemnant, {
        schema: 2, maxTicks: 400,
        migrate: (_version, json) => json,
        start: brain => { brain.schedule("watch", "watch", 1, "{}"); },
        resume: mementoWatch,
        handlers: { watch: mementoWatch },
        end: function (brain) {
            DeferredSacrifice.forget(brain);
            const state = JSON.parse(brain.state());
            if (!state.active) return;
            const world = brain.world(), at = world.observe(brain.target());
            if (at) WorldFeedback.emit(world, mementoScene, 1, MementoDeparture.point(state.centre), { moment: "fade" }, 24);
        },
        observedDeath: function (brain, death) {
            const state = DeferredSacrifice.confirm(brain, death);
            if (!state) return;
            brain.remaining(state.ticks);
            const world = brain.world(), point = MementoDeparture.point(state.centre);
            world.configure(brain.target(), JSON.stringify({ size: [.5, .5], glow: true,
                appearance: { sprite: "cobblemon:generic/fire/wisp", scale: 1.1, tint: 0x5B2A86, glow: true } }));
            let caught = 0;
            const gift = WorldGeometry.ring(point, 0, state.giftRadius);
            state.targets.forEach((entry: any) => {
                const target = world.actor(entry.ref), facts = target && world.valid(target) ? world.observe(target) : null;
                if (target && facts && entry.gift && MementoDeparture.inside(gift, facts)
                    && world.clear(point, facts.position()) && mementoGrieve(world, target, state.grief, state.darkness)) caught++;
            });
            WorldFeedback.emit(world, mementoScene, 1, point, { moment: "farewell", caught: caught,
                darkness: state.darkness, scale: state.giftRadius / MementoGiftReference }, 34);
            WorldFeedback.text(world, mementoAbove(point), mementoFarewellText, [caught], 34);
            world.sound("minecraft:entity.wither.spawn", point, 18, "{}");
            WorldFeedback.onEffect(world, brain.id(), "memento:remnant", mementoScene, 1, point,
                { moment: "remnant", target: String(brain.target().ref()), radius: state.radius,
                    scale: state.radius / MementoRemnantReference, darkness: state.darkness });
            mementoWatch(brain);
        }
    });
    define({
        id: mementoId,
        cooldownParameter: "recharge",
        name: "临别礼物",
        description: "牺牲自己，在倒下处留下遗念。初次哀悼范围内可见的敌人，之后遗念持续照看施放时已认定的敌人，夺走仍在附近者的攻击与特攻，并让它们出手时可能失手；范围内没有敌人、或遗念无法留下时不会牺牲。",
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
        indicator: function (config, pokemon) { return { radius: pokemon ? p(mementoId, "giftRadius", pokemon) : 3.0, geometry: "circle", style: "farewell", color: 0x5B2A86, label: "临别礼物" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            const centre = body.position(), radius = Math.max(1.5, p(mementoId, "giftRadius", action));
            const remnantRadius = Math.max(1.2, p(mementoId, "remnantRadius", action));
            const gift = WorldGeometry.ring(centre, 0, radius), targets: any[] = [];
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, Math.max(radius, remnantRadius)), (target, facts) => {
                if (world.clear(centre, facts.position())) targets.push({ ref: String(target.ref()), gift: MementoDeparture.inside(gift, facts) });
            });
            if (!targets.some(entry => entry.gift)) {
                WorldFeedback.text(world, mementoAbove(centre), mementoWastedText, [], 30);
                done(action); return;
            }
            const grief = Math.max(60, Math.round(p(mementoId, "griefTicks", action)));
            const ticks = Math.max(60, Math.round(p(mementoId, "remnantTicks", action)));
            const state = { centre: [centre.x(), centre.y(), centre.z()], targets: targets, marked: {},
                giftRadius: radius, radius: remnantRadius, grief: grief, renew: Math.max(40, Math.round(grief * .6)),
                ticks: ticks, drop: Math.max(1, Math.min(3, Math.round(p(mementoId, "drop", action)))),
                darkness: Math.max(12, Math.round(p(mementoId, "darkness", action))) };
            if (!DeferredSacrifice.arm(action, centre, mementoRemnant, state, ticks, done, "world_combat:memento_cost")) {
                WorldFeedback.text(world, mementoAbove(centre), mementoFailedText, [], 30);
                done(action);
            }
        }
    });
}
