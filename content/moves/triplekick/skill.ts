/**
 * 三连踢 / triplekick 的出手方式。
 *
 * 核心念头：正面站定，朝对手一脚接一脚地踢——第一脚轻、第二脚重、第三脚最重，全打在身前同一条窄线上；
 * 任一脚踢空这串就停。它的身份是「直、快、准」：与三旋击的分别在于三连踢不转身、只扫一条贴地的窄走廊。
 *
 * 三拍：
 *   起（windup，提交前）：重心下沉，脚边尘土扬起，正对目标。
 *   踢（kick，提交后）：每脚沿身前 `reach` 长、`halfWidth` 半宽的走廊判定，走廊里的非友方各吃一记 `kick`，
 *       第 n 脚威力 = kick × (1 + ramp × 已踢脚数)；命中把人顶开 `push` 格。每脚结算一次，间隔 `gap`。
 *   收（whiff / done）：任一脚掷空或走廊里没有对手，这串就停；三脚踢满自然收势。
 */
namespace PokemonSkills {
    /** 一脚走廊的四个角：origin 起、朝 direction 长 reach、半宽 half；判定与表现共用同一组顶点。 */
    function triplekickLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: triplekickId,
        cooldownParameter: "recharge",
        name: "Triple Kick",
        description: "A consecutive three-kick attack that becomes more powerful with each successful hit.",
        uses: ["朝前的窄走廊连踢三脚", "每中一脚，下一脚更重", "贴地快踢，冷却短"],
        kind: "enemy",
        range: 2.3,
        maxRange: 3.6,
        prepare: 5,
        active: 0,
        recover: 5,
        cooldown: 24,
        maximumTicks: 140,
        style: "kick",
        defaults: { drive: false, ai: { maxChase: 4 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(triplekickId, "reach", pokemon), geometry: "line", style: "kick", color: 0xE8B87A,
                label: config && config.drive === true ? "抽射三连踢" : "快踢三连踢" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[triplekickId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(triplekickId, "tempo", context)),
                recover: Math.round(p(triplekickId, "recover", context)),
                cooldown: Math.round(p(triplekickId, "recharge", context)),
                active: skills[triplekickId].active,
                range: p(triplekickId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_triplekick:windup", triplekickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", drive: config && config.drive === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const target = action.target();
            if (body === null || target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const kick = p(triplekickId, "kick", action);
            const kicks = Math.max(1, Math.round(p(triplekickId, "kicks", action)));
            const ramp = p(triplekickId, "ramp", action);
            const reach = p(triplekickId, "reach", action);
            const halfWidth = p(triplekickId, "halfWidth", action);
            const gap = Math.max(1, Math.round(p(triplekickId, "gap", action)));
            const accuracy = p(triplekickId, "accuracy", action);
            const push = p(triplekickId, "push", action);
            const sparks = Math.max(6, Math.round(p(triplekickId, "sparks", action)));
            const scale = Math.max(0.6, Math.min(2.4, halfWidth / 0.4));
            const up = WorldCombat.point(0, 1.1, 0);
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function step(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const selfBody = scope.observe(current.actor());
                const victim = scope.actor(targetRef);
                const victimBody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (selfBody === null || victimBody === null) { finish(current); return; }
                if (index >= kicks) { finish(current); return; }
                const origin = selfBody.position();
                current.face(victimBody.position(), 20, 20);
                let heading = victimBody.position().minus(origin);
                if (heading.length() < 0.05) heading = current.direction();
                const power = kick * (1 + ramp * index);
                const intensity = Math.max(0.6, Math.min(2.4, power / 12));
                const lane = triplekickLane(origin, heading, reach, halfWidth);

                if (scope.random() >= accuracy) {
                    WorldFeedback.emit(scope, triplekickScene, 1, origin,
                        { moment: "whiff", path: lane, index: index, kicks: kicks, scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(up), triplekickMissText, [index + 1], 24);
                    finish(current);
                    return;
                }

                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(origin, heading, reach, halfWidth, { below: 1.2, above: 2.0 }),
                    function (victimActor, facts) {
                        if (hurt(current, victimActor, triplekickId, power, { damage: damageSpec(triplekickId, "kick"), contact: true })) {
                            hits++;
                            if (scope.valid(victimActor)) scope.displace(victimActor, WorldCombat.point(heading.x(), 0, heading.z()).scale(push));
                            WorldFeedback.emit(scope, triplekickScene, 1, facts.position(),
                                { moment: "hit", target: String(victimActor.ref()), index: index, kicks: kicks,
                                    power: Math.round(power * 10) / 10, sparks: sparks, scale: scale, intensity: intensity }, 20);
                        }
                    });
                WorldFeedback.emit(scope, triplekickScene, 1, origin,
                    { moment: "kick", path: lane, index: index, kicks: kicks, power: Math.round(power * 10) / 10,
                        direction: [heading.x(), heading.y(), heading.z()], sparks: sparks, scale: scale, intensity: intensity }, 18);
                sound(current, "minecraft:entity.player.attack.weak");
                if (hits === 0) {
                    WorldFeedback.text(scope, origin.plus(up), triplekickMissText, [index + 1], 24);
                    finish(current);
                    return;
                }
                WorldFeedback.text(scope, origin.plus(up), triplekickRiseText, [index + 1, Math.round(power)], 22);
                index++;
                if (index >= kicks) { finish(current); return; }
                current.after(gap, step);
            }

            sound(action, "cobblemon:impact.fighting");
            step(action);
        }
    });
}
