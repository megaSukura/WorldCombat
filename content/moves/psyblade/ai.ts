/**
 * 精神剑 / psyblade 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在自己 `ai.maxChase`（默认 9）格以内（要贴身）；更远交给共享接近逻辑。
 * 对谁出手：`ai.seekTerrain`（默认开）打开时，自己脚下带着电场电荷（共享身份 electricterrain）会把这刀抬到
 *   高优先级——那一记 ×1.5；`ai.finishLow`（默认开）在对手残血时再抬一档，尝试收掉。够不到就靠近。
 * 放完之后：主目标被切开并被顶开，交回共享顺序决定继续贴身还是走位。
 */
namespace CompanionBehavior {
    function psybladeWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
    }

    CompanionBehavior.registerUse(PokemonSkills.psybladeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return psybladeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !psybladeWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "seekTerrain", true) && CompanionBehavior.status(context, self, "electricterrain"))
                score += 24;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) <= 0.4)
                score += 14;
            return score;
        }
    });

    const psybladeChase = PokemonSkills.number("ai.maxChase", "出手距离", 4, 16, 1);
    psybladeChase.help = "超过这个距离就不主动出手，先贴近；精神剑必须贴身，数值比远程招小。";
    const psybladeSeek = PokemonSkills.flag("ai.seekTerrain", "站在电荷上时优先");
    psybladeSeek.help = "开启：自己脚下带着电场电荷时优先挥出这一刀，因为此时威力 ×1.5；关闭则不看地形、按普通近身斩排序。";
    const psybladeFinish = PokemonSkills.flag("ai.finishLow", "收残血");
    psybladeFinish.help = "开启：对手血量低于四成时优先挥出这一记重斩，尝试收掉；关闭则不特别看血量。";

    PokemonSkills.addPreferences(PokemonSkills.psybladeId, { ai: { maxChase: 9, seekTerrain: true, finishLow: true } },
        [psybladeChase, psybladeSeek, psybladeFinish]);
}
