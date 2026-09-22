/**
 * 摇晃舞 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、存活、敌对的威胁在 `ai.maxChase`（默认 8）以内，而且舞圈内（`danceRadius`）
 *   至少站着 `ai.minFoes`（默认 1）个敌人；顾友关闭时，圈里还不能有自己的队友——这一舞会把盟友一起晃晕。
 * 什么时候最想出手：圈里的敌人越多越优先（每个 +8，最多到 96），它是被围住时用来一次打散一圈的招式。
 * 对谁出手：最近的威胁；舞以自身为中心，走近到波及半径以内再放。
 * 够不到怎么办：reach 就是本招半径，共享任务把身位收进半径后再起势。
 * 放完之后：一圈人被带进节奏、开始摇晃走位；交回共享交战计划继续打。
 * 配置 careful（顾友）：开启后不会把队友卷进来，代价是半径与时长更小、起手与冷却更长。
 */
namespace PokemonSkills {
    /** 半径内符合条件的目标数；friendly 为 true 时数友方（不含自己），否则数非友方。 */
    function teeterdanceCount(context: WorldBehavior.Context, item: WorldBehavior.Capability, friendly: boolean): number {
        const self = CompanionBehavior.source(context), radius = item.data.range;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.health <= 0 || other.ref === self.ref || other.friendly !== friendly) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= radius) count++;
        }
        return count;
    }

    function teeterdanceWants(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        if (context.facts.mounted) return false;
        const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
        if (!threat || threat.health <= 0 || !threat.visible) return false;
        if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(item, "maxChase", 8)) return false;
        if (teeterdanceCount(context, item, false) < CompanionBehavior.ai<number>(item, "minFoes", 1)) return false;
        const careful = !!(item.data.config && item.data.config.careful === true);
        return careful || teeterdanceCount(context, item, true) === 0;
    }

    CompanionBehavior.registerUse(teeterdanceId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            return teeterdanceWants(context, item);
        },
        accepts: function (_context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !teeterdanceWants(context, item)) return 0;
            return Math.min(96, 30 + teeterdanceCount(context, item, false) * 8);
        }
    });

    addPreferences(teeterdanceId, {}, [
        field(pathOf("ai.maxChase"), "起势距离", "number", { min: 2, max: 14, step: 1,
            help: "威胁进入这个距离内才考虑起舞；调大愿意先冲进去再跳。" }),
        field(pathOf("ai.minFoes"), "晃到人数", "number", { min: 1, max: 5, step: 1,
            help: "舞圈内至少站着这么多敌人才起舞；调 1 见一个就晃，调大只被围住时才放。" })
    ]);
}
