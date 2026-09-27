/**
 * 牵手 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：共享的「伤者」感官挑出一个生命低于 ai.healBelow 的友方（含自己）；牵手会同时治疗两个人，
 *   所以自己或伙伴任一方缺血都值得考虑。
 * 对谁出手：受伤的伙伴（kind friend）；够不到先交给共享接近逻辑。
 * 放完之后：链子替两人慢慢匀体力，伙伴交回共享顺序继续战斗；已经牵着手的人不重复牵。
 * 配置：tight 切换紧握／松开；ai.healBelow 决定多低才牵手。
 */
namespace CompanionBehavior {
    const holdhandsBelow = PokemonSkills.number("ai.healBelow", "牵手阈值", 0.3, 0.95, 0.05);
    holdhandsBelow.help = "自己或伙伴生命低于该比例就考虑牵手；调低更倾向硬撑，调高则一掉血就牵。";

    PokemonSkills.addPreferences("holdhands", { tight: false, helpFriends: true, ai: { healBelow: 0.8 } }, [holdhandsBelow]);

    registerUse("holdhands", {
        protocols: ["world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            const self = source(context), below = ai<number>(capability, "healBelow", 0.8);
            if (ratio(self) < below) return true;
            if (!target) return true;
            if (String(target.ref) === String(self.ref) || !target.friendly || target.health <= 0) return false;
            if (status(context, target, "holdhands")) return false;
            return ratio(target) < below;
        },
        accepts: function (context, _capability, target) {
            const self = source(context);
            return target.friendly && target.health > 0 && String(target.ref) !== String(self.ref)
                && !status(context, target, "holdhands");
        },
        // 排序只看双方真实缺血：两人都掉得多收益更高，任一方濒危直接抬进急档。
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = source(context);
            if (!target.friendly || String(target.ref) === String(self.ref) || target.health <= 0) return 0;
            if (status(context, target, "holdhands")) return 0;
            const below = ai<number>(capability, "healBelow", 0.8);
            const s = ratio(self), t = ratio(target), worst = Math.min(s, t);
            if (worst >= below) return 0;
            const missing = Math.max(0, 1 - s) + Math.max(0, 1 - t);
            const score = 40 + Math.round(missing * 30);
            return worst < 0.35 ? Math.max(score, 100) : score;
        }
    });
}
