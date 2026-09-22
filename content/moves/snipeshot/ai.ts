/**
 * 狙击 / snipeshot 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记超远距离的单体点射。目标可见、敌对、存活，在 `ai.maxChase`（默认 20）以内就出手；
 *   够不到时交给共享接近逻辑先收身位。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.preferCrowd`（默认开）打开时，
 *   目标身边还站着别的敌人会让它更愿意出手——穿前排直取后排正好是这招的长处；`ai.finishLow`（默认关）
 *   打开时残血目标排得更前。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：水弹只结算锁定目标，伙伴交回共享顺序。
 */
namespace CompanionBehavior {
    function snipeshotWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 20);
    }

    /** 目标近旁（3 格内）还站着几个别的敌人；穿前排直取后排是这招的长处。 */
    function snipeshotCrowd(context: WorldBehavior.Context, target: Entity): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= 3) count++;
        }
        return count;
    }

    registerUse("snipeshot", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return snipeshotWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !snipeshotWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(source(context).point, target.point);
            if (distance > item.data.range) return 6;
            let score = 20;
            if (ai<boolean>(item, "preferCrowd", true) && snipeshotCrowd(context, target) >= 1) score += 10;
            if (ai<boolean>(item, "finishLow", false) && ratio(target) < 0.4) score += 10;
            return score;
        }
    });

    PokemonSkills.addPreferences("snipeshot", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("deadeye"), "屏息狙击", "boolean", {
            help: "开启（屏息狙击）：起手 +4 刻、射程 +3 格、威力 ×1.15、冷却 +6 刻，打得更远更重但出手更慢。关闭（速射狙击）：出手更快、冷却更短，但射程与单发稍逊。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 28, step: 1,
            help: "超过这个距离就不主动瞄准，先走近；越大越愿意在超远处先手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.preferCrowd"), "瞄准有掩护的目标", "boolean", {
            help: "开启：目标身边还站着别的敌人时更愿意出手——这一枪穿过前排直取后排；关闭则只按普通远程攻击排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一枪收尾；关闭则所有目标同价。"
        })
    ]);
}
