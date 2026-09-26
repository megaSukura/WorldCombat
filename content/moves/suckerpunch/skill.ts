/**
 * 突袭 / suckerpunch 的出手方式。
 *
 * 核心念头：在对手抬手的那一瞬间，抢在它的招式之前贴上去刺一记——对手要是没在出手，这一记就白刺。
 * 它是本族最短、最快、最赌时机的一招：没有长收势、没有铺垫，只有「读」和「刺」两个瞬间。
 *
 * 两幕：
 *   读（windup，提交前）：目光一凝、暗色聚到指上；附近有活体处在出手窗就标一条黑线准备，读不到就只是空等（present read / whiff）。
 *   刺（execute）：朝瞄准方向闪身刺出，打中的第一个活体要处在出手窗内才按 `sneak` 结算接触伤害并顶开；
 *       撞到不在出手窗的活体、被方块挡下或一路空放，这一刺落空（PP 照扣，与原作「招式失败」一致）。
 *
 * 与同族分开：快手还击只认「先制招式」并把它打断；突袭只认「任何攻击」的出手窗，抢到就是一下伤害，不打断对方。
 * 选取是 `aim`：可以赌方向空放，第一实体接触后判其资格，方块截断。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: suckerpunchId,
        cooldownParameter: "recharge",
        name: "Sucker Punch",
        description: "抢在对手出手的瞬间闪身刺出；对手此刻不在出手时这一记落空，PP 照常消耗。",
        uses: ["惩罚正在抬手的近身对手", "抢在对手重击之前先打一下", "对一直贴着打的敌人稳定输出"],
        kind: "aim",
        range: 2.8,
        maxRange: 5.4,
        prepare: 1,
        active: 0,
        recover: 6,
        cooldown: 30,
        style: "dark",
        defaults: { read: false, ai: { maxChase: 6 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(suckerpunchId, "collisionRadius", pokemon) * 1.5, geometry: "line", style: "dark", color: 0x6B5AA8,
                label: config && config.read === true ? "突袭·读招" : "突袭" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[suckerpunchId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(suckerpunchId, "tempo", context)),
                recover: Math.round(p(suckerpunchId, "settle", context)),
                cooldown: Math.round(p(suckerpunchId, "recharge", context)),
                active: 0,
                range: p(suckerpunchId, "blink", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), target = action.target();
            const window = p(suckerpunchId, "window", action);
            const reach = p(suckerpunchId, "blink", action) + 1;
            const marked = target !== null && suckerpunchArmed(world, target, window)
                ? target : suckerpunchMark(world, action.origin(), reach, window);
            action.present("suckerpunch:read", suckerpunchScene, 1, action.origin(),
                JSON.stringify({ moment: marked === null ? "whiff" : "read", windup: prepare,
                    target: marked === null ? "" : String(marked.ref()), reach: reach,
                    read: config && config.read === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p(suckerpunchId, "blink", action);
            const step = p(suckerpunchId, "speed", action);
            const radius = p(suckerpunchId, "collisionRadius", action);
            const power = p(suckerpunchId, "sneak", action);
            const push = p(suckerpunchId, "push", action);
            const window = p(suckerpunchId, "window", action);
            const count = Math.round(14 + power * 0.22);
            let travelled = 0;

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, suckerpunchScene, 1, at, { moment: "whiff", scale: radius / 0.38 }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), suckerpunchWhiffText, [], 24);
                scope.sound("minecraft:entity.wind_charge.wind_burst", at, 12, "{}");
            }

            sound(action, "cobblemon:move.suckerpunch.target");
            WorldFeedback.emit(world, suckerpunchScene, 1, action.origin(),
                { moment: "flash", scale: radius / 0.38, count: Math.round(count * 0.5) }, 14);

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim) && suckerpunchArmed(scope, victim, window)) {
                        const landed = impact(current, hit, suckerpunchId, power,
                            { damage: damageSpec(suckerpunchId, "sneak"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.hitDisplace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, suckerpunchScene, 1, hit.position(),
                            { moment: "strike", target: String(victim.ref()), count: count, scale: radius / 0.38,
                                power: Math.round(power * 10) / 10 }, 28);
                        scope.sound("cobblemon:impact.dark", hit.position(), 16, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.0, 0)), suckerpunchHitText,
                            [Math.round(power)], 24);
                    } else {
                        whiff(current, hit.position());
                    }
                    done(current);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < p(suckerpunchId, "minimumMove", current) || travelled >= length) {
                    whiff(current, current.origin());
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
