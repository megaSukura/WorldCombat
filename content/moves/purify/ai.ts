/**
 * 净化 的伙伴 AI 用途：这是一口送给「又伤又病」的伙伴的单点救助，抽走异常的同时给自己回一口。
 *
 * 什么局面有意义：附近有一个生命低于 ai.healBelow、且身上带着有害状态效果的伙伴（不含自己——这招治的是别人）。
 * 对谁出手：那个又伤又病的伙伴；不接受自己，也不接受敌人（AI 只把它当救助用；玩家可以对着对手放，那是取舍）。
 * 候选之间怎么排：伙伴生命低于 0.4 时 priority 抬到 100，抢在共享交战次序前先救；其余 42。
 * 够不到怎么办：reach 就是本招射程，共享任务先走近再抽。
 * 配置：deep（深引／轻引）在参数层改变回复与手感；ai.healBelow 决定多伤才算需要救。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_purify/harmful", (world, actor) => CombatStatus.hasHarmful(world, actor));
    const purifyHealBelow = PokemonSkills.number("ai.healBelow", "救助阈值", 0.3, 0.95, 0.05);
    purifyHealBelow.help = "伙伴生命低于该比例且带着异常时，伙计才把这招排进救助计划；调低更倾向继续输出，调高一有病痛就去抽。";

    PokemonSkills.addPreferences("purify", { deep: false, helpFriends: true, ai: { healBelow: 0.9 } }, [purifyHealBelow]);

    function purifyAfflicted(context: WorldBehavior.Context, target: Entity): boolean {
        return fact<boolean>(context, "world_combat:move_purify/harmful", target) === true;
    }

    registerUse("purify", {
        protocols: ["world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted || !target) return false;
            const self = source(context);
            if (String(target.ref) === String(self.ref) || !target.friendly || target.health <= 0) return false;
            // Willingness to engage, not the hit range: a curable ally the shared task can still walk to is not filtered out.
            if (distance(self.point, target.point) > ai<number>(capability, "maxChase", 12)) return false;
            return purifyAfflicted(context, target);
        },
        accepts: function (context, _capability, target) {
            return target.friendly && target.health > 0 && String(target.ref) !== String(source(context).ref);
        },
        priority: function (context, _capability, target) {
            if (!target || !target.friendly || String(target.ref) === String(source(context).ref)) return 0;
            return ratio(target) < 0.4 ? 100 : 42;
        }
    });
}
