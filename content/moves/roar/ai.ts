/**
 * 吼叫 / roar —— 伙伴 AI 用途。
 *
 * 什么局面下出手：一声绕身一圈的逐退，所以先看身周。`ready` 要求 `ai.maxChase`（默认 6）格内至少站着
 *   `ai.minFoes`（默认 1）个可见、敌对的敌人，否则整招不参与选择——圈里没人白吼。
 * 什么时候最想出手：圈里人越多 priority 越高；自己血量偏低时再加一段——被围住时一次把一圈人逐开，
 *   比继续对拼更值。
 * 对谁出手：绕身放，不挑目标；`accepts` 只排除友方、已死、不可见和已经带着「溃退」身份的目标（再次吼
 *   在溃退窗口里是浪费）。
 * 够不到怎么办：reach 就是声浪半径，共享任务会先把身位收进圈内再吼。
 * 放完之后：圈内敌人失去目标并被逐出交战圈，伙伴交回共享顺序。
 * `ai.leaveStation`：驻守中的伙伴是否愿意离位去吼（默认关闭，只在原地够得到时出手）。
 */
namespace CompanionBehavior {
    function roarCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context), nearby = context.facts.nearby as Entity[];
        const limit = ai<number>(item, "maxChase", 6);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    registerUse("roar", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        ready: function (context, item) {
            return item.data.ready !== false && roarCount(context, item) >= ai<number>(item, "minFoes", 1);
        },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 6);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            return !status(context, target, "routed");
        },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target) return 0;
            let base = 40 + Math.min(20, roarCount(context, item) * 7);
            if (ratio(source(context)) < 0.5) base += 6;
            return Math.min(88, base);
        }
    });

    PokemonSkills.addPreferences("roar", { ai: { maxChase: 6, minFoes: 1, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "吼叫距离", 2, 12, 1),
        PokemonSkills.number("ai.minFoes", "圈内最少人数", 1, 6, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
