/**
 * 牵手 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：共享的「伤者」感官挑出一个生命低于 ai.healBelow 的友方（含自己）；牵手会同时治疗两个人，
 *   所以只要队伍里有人掉血就值得考虑。
 * 对谁出手：受伤的伙伴（kind friend）；够不到先交给共享接近逻辑。
 * 放完之后：链子替两人慢慢匀体力，伙伴交回共享顺序继续战斗；已经牵着手的人不重复牵。
 * 配置：tight 切换紧握／松开；ai.healBelow 决定多低才牵手。
 */
namespace CompanionBehavior {
    const holdhandsBelow = PokemonSkills.number("ai.healBelow", "牵手阈值", 0.3, 0.95, 0.05);
    holdhandsBelow.help = "队伍里有人（含自己）生命低于该比例就考虑牵手；调低更倾向硬撑，调高则一掉血就牵。";

    PokemonSkills.addPreferences("holdhands", { tight: false, helpFriends: true, ai: { healBelow: 0.8 } }, [holdhandsBelow]);

    registerUse("holdhands", {
        protocols: ["world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, _capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = source(context);
            if (String(target.ref) === String(self.ref) || !target.friendly || target.health <= 0) return false;
            return !status(context, target, "holdhands");
        },
        accepts: function (context, _capability, target) {
            const self = source(context);
            return target.friendly && target.health > 0 && String(target.ref) !== String(self.ref)
                && !status(context, target, "holdhands");
        },
        priority: function () { return 0; }
    });
}
