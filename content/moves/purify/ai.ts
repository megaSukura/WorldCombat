/**
 * 净化 的伙伴 AI 用途：这是一口送给「又伤又病」的伙伴的单点救助，抽走异常的同时给自己回一口。
 *
 * 什么局面有意义：附近有一个带着有害状态效果的伙伴（不含自己——这招治的是别人）。
 * 对谁出手：默认那个又伤又病的伙伴；**也可以对着敌人放**——那是把自己的缺血和「拿掉对手负面」做成一次交易，
 *   所以只在 AI 自己也掉到 ai.selfBelow 以下、且对手身上被缠住的项数不超过 ai.enemyStatus 时才愿意出手。
 * 候选之间怎么排：伙伴生命低于 0.4 时 priority 抬到 100，抢在共享交战次序前先救；自身缺血时 62，其余 42；
 *   对敌人的交易只给 28，绝不高过救助伙伴或普通输出。
 * 够不到怎么办：reach 就是本招射程，共享任务先走近再抽；敌方交易同样受 ai.maxChase 限制。
 * 配置：deep（深引／轻引）在参数层改变回复与手感；ai.selfBelow 与 ai.enemyStatus 控制对敌交易的放手程度。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_purify/harmful", (world, actor) => CombatStatus.hasHarmful(world, actor));
    const purifySelfBelow = PokemonSkills.number("ai.selfBelow", "自救阈值", 0.3, 0.9, 0.05);
    purifySelfBelow.help = "自己生命低于该比例时，伙计才允许把净化用在对手身上换一口生机；调低更克制，调高则一缺血就愿意做这笔交易。";
    const purifyEnemyStatus = PokemonSkills.number("ai.enemyStatus", "可换病痛", 1, 3, 1);
    purifyEnemyStatus.help = "对手身上被缠住的有害状态不超过这么多项时，才值得把他的病痛拿走换自己的回复；调低只碰轻微中招的对手，调高愿意替更病重的对手祛病。";

    PokemonSkills.addPreferences("purify", { deep: false, helpFriends: true, ai: { healBelow: 0.9, selfBelow: 0.55, enemyStatus: 1 } },
        [purifySelfBelow, purifyEnemyStatus]);

    function purifyAfflicted(context: WorldBehavior.Context, target: Entity): boolean {
        return fact<boolean>(context, "world_combat:move_purify/harmful", target) === true;
    }

    /** 对敌交易是否划算：自身掉血够多、这笔回复补得回来，且拿走的对手负面项数够少。 */
    function purifyEnemyWorth(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Entity): boolean {
        const self = source(context);
        if (ratio(self) > ai<number>(capability, "selfBelow", 0.55)) return false;
        const missing = self.maximum - self.health;
        if (!(missing > 0)) return false;
        if (missing < target.maximum * 0.2) return false;
        return statuses(context, target).length <= ai<number>(capability, "enemyStatus", 1);
    }

    registerUse("purify", {
        protocols: ["world_combat:heal", "world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted || !target) return false;
            const self = source(context);
            if (String(target.ref) === String(self.ref) || target.health <= 0) return false;
            // Willingness to engage, not the hit range: a curable target the shared task can still walk to is not filtered out.
            if (distance(self.point, target.point) > ai<number>(capability, "maxChase", 12)) return false;
            if (!purifyAfflicted(context, target)) return false;
            return target.friendly || purifyEnemyWorth(context, capability, target);
        },
        accepts: function (context, capability, target) {
            if (target.health <= 0 || String(target.ref) === String(source(context).ref)) return false;
            return target.friendly || purifyEnemyWorth(context, capability, target);
        },
        priority: function (context, capability, target) {
            if (!target || String(target.ref) === String(source(context).ref)) return 0;
            if (target.friendly) {
                if (ratio(target) < 0.4) return 100;
                return ratio(source(context)) < ai<number>(capability, "selfBelow", 0.55) ? 62 : 42;
            }
            return purifyEnemyWorth(context, capability, target) ? 28 : 0;
        }
    });
}
