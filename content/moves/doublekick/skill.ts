/**
 * 二连踢 / doublekick —— 出手方式。
 *
 * 核心念头：站定身形，两只脚交替踢——第一脚贴地低扫把对手挑离地面，第二脚顺势前踹把它送出去。两脚方向不同，
 *   所以挨打的人先离地、再被踹飞；它是近身、接触、两拍，出手快、能连用，是「用身体把对手拨出站位」的一招。
 *
 * 幕：
 *   起（raise，提交前）：单脚站定、另一只脚抬起，脚边尘土扬起（`action.present`，可打断、不花 PP）。
 *   一（hook，提交后）：第一脚沿身前 `span` 度扇面、`reach` 格内判定；命中的非友方各吃一记 `hook` 接触伤害，
 *       并被沿踢击方向挑起 `lift` 格。
 *   二（finisher）：隔 `gap` 刻第二脚，同样扇面内结算 `finisher`，命中的人被向前踹开 `push` 格。
 *   收（settle）：收腿落回站姿。
 *
 * 与同族分开：双尾扫是原地左右横扫、往两侧推；三连踢是同一方向连踢三脚；双光束是两道远程眼束。
 *   只有二连踢是**一脚挑、一脚踹**的两拍近身攻势，反制方式是卡住两脚之间的空当或绕到扇面之外。
 */
namespace PokemonSkills {
    /** 身前扇面的竖直判定带：踢击贴地，只够到站立身位。 */
    const doublekickBand = { below: 1.0, above: 2.0 };

    define({
        id: doublekickId,
        name: "Double Kick",
        description: "The user attacks by kicking the target twice in a row using two feet.",
        uses: ["一脚挑起、一脚踹飞的近身两拍", "把贴身的对手踢出站位", "对付会站桩的对手反复打节奏"],
        kind: "enemy",
        range: 2.7,
        maxRange: 3.8,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 16,
        style: "kick",
        defaults: { alternate: true, ai: { maxChase: 6 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[doublekickId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(doublekickId, "tempo", context)),
                recover: Math.round(p(doublekickId, "recover", context)),
                cooldown: Math.round(p(doublekickId, "recharge", context)),
                active: 0,
                range: p(doublekickId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("doublekick:raise:" + action.id(), doublekickScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", windup: prepare, alternate: config && config.alternate === true ? 1 : 0,
                    dust: Math.max(6, Math.round(p(doublekickId, "dust", action))) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[doublekickId], detail: { values: config } };
            return {
                radius: p(doublekickId, "reach", context), geometry: "cone", style: "kick", color: 0xE8B87A,
                label: config && config.alternate === true ? "二连踢·挑起" : "二连踢·连踢"
            };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const alternate = !!(config && config.alternate === true);
            const gap = Math.max(1, Math.round(p(doublekickId, "gap", action)));
            const hook = p(doublekickId, "hook", action);
            const finisher = p(doublekickId, "finisher", action);
            const reach = Math.max(1.6, action.range());
            const span = p(doublekickId, "span", action);
            const lift = alternate ? p(doublekickId, "lift", action) : 0;
            const push = p(doublekickId, "push", action);
            const dust = Math.max(8, Math.round(p(doublekickId, "dust", action)));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function kick(current: CombatAction, index: number): void {
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const origin = body.position();
                const heading = aim(current);
                const flat = WorldCombat.point(heading.x(), 0, heading.z());
                const direction = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
                const power = index === 0 ? hook : finisher;
                const intensity = Math.max(0.5, Math.min(2, power / 40));
                WorldFeedback.emit(scope, doublekickScene, 1, origin,
                    { moment: index === 0 ? "hook" : "finisher", index: index + 1, reach: reach, span: span, dust: dust,
                        intensity: intensity, direction: [direction.x(), direction.y(), direction.z()], alternate: alternate ? 1 : 0 }, 20);
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, reach, span, doublekickBand),
                    function (victim, facts) {
                        const segment = index === 0 ? "hook" : "finisher";
                        if (!hurt(current, victim, doublekickId, power, { damage: damageSpec(doublekickId, segment), contact: true })) return;
                        hits++;
                        if (!scope.valid(victim)) return;
                        if (index === 0 && lift > 0) {
                            scope.displace(victim, WorldCombat.point(direction.x() * 0.15, lift, direction.z() * 0.15));
                        } else if (index === 1) {
                            scope.displace(victim, direction.scale(push));
                        }
                        const at = scope.observe(victim);
                        const point = at === null ? facts.position() : at.position();
                        WorldFeedback.emit(scope, doublekickScene, 1, point,
                            { moment: index === 0 ? "hit1" : "hit2", target: String(victim.ref()), index: index + 1,
                                dust: dust, lift: lift, push: push, intensity: intensity }, 20);
                        scope.sound("cobblemon:impact.fighting", point, 14, "{}");
                        if (index === 0 && lift > 0)
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), doublekickLiftText, [], 18);
                        if (index === 1)
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), doublekickLaunchText, [], 18);
                    });
                if (hits === 0)
                    WorldFeedback.emit(scope, doublekickScene, 1, origin.plus(direction.scale(reach * 0.6)),
                        { moment: "whiff", index: index + 1, reach: reach, span: span, dust: Math.round(dust * 0.6) }, 16);
                if (index === 0) { current.after(gap, function (next: CombatAction) { kick(next, 1); }); return; }
                WorldFeedback.emit(scope, doublekickScene, 1, origin, { moment: "settle", reach: reach, span: span, dust: dust }, 16);
                finish(current);
            }

            sound(action, "minecraft:entity.player.attack.weak");
            kick(action, 0);
        }
    });
}
