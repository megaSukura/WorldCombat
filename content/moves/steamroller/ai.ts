/**
 * 疯狂滚压 / steamroller 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 7）格以内；更远交给共享接近逻辑。
 * 它一次能碾过一整排，所以 `ai.preferRow`（默认开）在目标身旁还站着别人时把它排到前面——代价是可能为了
 * 碾一排而放过眼前真正的威胁；关闭则只按威胁本身选目标。宽碾式半径更大，更容易一次压到并排的人。
 * 放完之后：滚到哪算哪，接着交给共享顺序决定追打还是换招。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(steamrollerId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "preferRow", true)) {
                let row = 1;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 2.6) row++;
                }
                if (row >= 2) score += 18;
            }
            if (CompanionBehavior.status(context, target, "flinch")) score += 2;
            return score;
        }
    });

    addPreferences(steamrollerId, {}, [
        field(pathOf("wide"), "宽碾式", "boolean", {
            help: "开启：碾压半宽 ×1.25、推挤更远、压痕更长，更容易一次罩住并排的人；代价是滚动距离 ×0.9、速度 ×0.88、单发 ×0.94、冷却 +6 刻。关闭（默认）：疾滚式，滚得远、滚得快、单发更重，碾压面较窄。"
        }),
        field(pathOf("ai.maxChase"), "滚压距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就先走近。疯狂滚压滚得不远，设大也常常够不到。"
        }),
        field(pathOf("ai.preferRow"), "优先碾一排", "boolean", {
            help: "开启（默认）：目标身旁还站着别人时优先滚过去，一发压到多个；关闭：不为了排队而放过眼前的敌人，只按威胁本身选目标。"
        })
    ]);
}
