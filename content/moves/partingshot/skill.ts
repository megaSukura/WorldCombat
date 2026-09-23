/**
 * 抛下狠话 / partingshot 的出手方式。
 *
 * 核心念头：转身离开时甩下一句带刺的话——话像一支暗色的镖飞出去，扎进对手心里，把他的攻击与特攻各削几级，
 *   自己趁机背离他退开。狠话是这招的身份：**削的是对手的输出，不是它的血**。
 *
 * 两幕：
 *   起（barb，提交前）：嘴边聚起一缕暗话的碎点，只播预告。
 *   抛（launch → drain／whiff，提交后）：一句狠话朝目标飞过去；扎中活体就把它的物攻与特攻各削 `drop` 级、
 *     挂上共享身份 `world_combat:status/parting_shot`，然后施法者背离对手退开 `withdraw`；被让开就一直飞到落空，
 *     落空不退（话没送到，自己还得站着）。
 *
 * 与同族分开：接棒递好处、瞬间移动只挪自己、临别礼物以命相换；只有抛下狠话**远远地削掉对手的输出再走**，
 *   是一支会飞的减法。提交前只观察、只 present；削级、退步与粒子都在提交后写。
 */
namespace PokemonSkills {
    /** 背离 awayFrom 退开 distance；优先瞬移到落点，失败就一步步位移。返回实际移动量。 */
    function partingshotStep(world: CombatWorld, actor: CombatActor, awayFrom: CombatPoint, distance: number): number {
        const body = world.observe(actor);
        if (body === null || !(distance > 0)) return 0;
        const from = body.position();
        const flat = WorldCombat.point(from.x() - awayFrom.x(), 0, from.z() - awayFrom.z());
        if (flat.length() < 0.01) return 0;
        const step = flat.unit().scale(distance);
        const feet = WorldCombat.point(from.x(), from.y() - body.height() / 2, from.z());
        if (world.teleport(actor, feet.plus(step))) return distance;
        return world.displace(actor, step);
    }

    define({
        id: partingshotId,
        cooldownParameter: "recharge",
        name: "Parting Shot",
        description: "朝对手甩下一句带刺的狠话：扎中后把它的攻击与特攻各削几级，自己趁机退开。和后备宝可梦的替换仍在接共享入口。",
        uses: ["把对手的输出削下去再脱身", "在自己要撤时顺手废掉追兵的手", "先射一句狠话再拉开距离"],
        kind: "enemy",
        range: 8,
        maxRange: 14,
        prepare: 6,
        active: 2,
        recover: 6,
        cooldown: 70,
        style: "barb",
        defaults: { venom: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [flag("venom", "毒舌")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[partingshotId], detail: { values: config } };
            return {
                radius: p(partingshotId, "reach", context), geometry: "line", style: "barb", color: 0x6A3FA0,
                label: config && config.venom ? "抛下狠话·毒舌" : "抛下狠话"
            };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[partingshotId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(partingshotId, "tempo", context)),
                recover: Math.round(p(partingshotId, "aftercast", context)),
                cooldown: Math.round(p(partingshotId, "recharge", context)),
                active: 2,
                range: p(partingshotId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_partingshot:barb", partingshotScene, 1, action.origin(),
                JSON.stringify({ moment: "barb", venom: config && config.venom ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const drop = Math.max(1, Math.min(2, Math.round(p(partingshotId, "drop", action))));
            const mark = Math.max(60, Math.round(p(partingshotId, "markTicks", action)));
            const motes = Math.max(8, Math.round(p(partingshotId, "motes", action)));
            const speed = p(partingshotId, "flight", action);
            const withdraw = p(partingshotId, "withdraw", action);
            const scale = Math.max(0.5, Math.min(1.3, 0.55 + motes / 70));
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            WorldFeedback.emit(world, partingshotScene, 1, origin,
                { moment: "launch", motes: motes, drop: drop, scale: scale }, 22);
            world.sound("minecraft:entity.evoker.cast_spell", origin, 14, "{}");

            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.28,
                appearance: { sprite: "cobblemon:generic/exclamation", scale: scale, tint: 0x6A3FA0, glow: true },
                impact: function (current, hit) {
                    const scope = current.world(), victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        const at = hit.position();
                        WorldFeedback.emit(scope, partingshotScene, 1, at, { moment: "whiff", motes: motes, scale: scale }, 18);
                        finish(current); return;
                    }
                    NativeEffects.boost(scope, victim, "atk", -drop);
                    if (scope.valid(victim)) NativeEffects.boost(scope, victim, "spa", -drop);
                    if (scope.valid(victim)) MobEffects.apply(scope, victim, partingshotEffect, mark, 0);
                    const struck = scope.observe(victim);
                    if (struck !== null) {
                        WorldFeedback.emit(scope, partingshotScene, 1, struck.position(),
                            { moment: "drain", target: String(victim.ref()), motes: motes, drop: drop, scale: scale,
                                intensity: Math.max(0.7, Math.min(2, 0.7 + drop * 0.5)) }, 26);
                        WorldFeedback.text(scope, struck.position().plus(WorldCombat.point(0, 1.15, 0)), partingshotText, [drop], 28);
                        partingshotStep(scope, self, struck.position(), withdraw);
                        const flat = origin.minus(struck.position());
                        const direction = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
                        WorldFeedback.emit(scope, partingshotScene, 1, origin,
                            { moment: "step", direction: [direction.x(), 0, direction.z()], withdraw: withdraw, scale: scale }, 20);
                    }
                    scope.sound("minecraft:entity.illusioner.cast_spell", hit.position(), 14, "{}");
                    finish(current);
                }
            }, function (current) {
                WorldFeedback.emit(current.world(), partingshotScene, 1, current.origin(),
                    { moment: "whiff", motes: motes, scale: scale }, 18);
                WorldFeedback.text(current.world(), current.origin().plus(WorldCombat.point(0, 1.2, 0)), partingshotMissText, [], 20);
                finish(current);
            });
        }
    });
}
