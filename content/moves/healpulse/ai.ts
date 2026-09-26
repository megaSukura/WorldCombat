/**
 * 治愈波动 的伙伴 AI：这是一口会赶路的远距离救助，只送给别人、送给自己没有意义。
 *
 * 何时考虑：共享的「伤者」感官挑出一个生命低于 ai.healBelow（默认 0.75）的友方，且它在 ai.maxChase（默认 12）以内。
 * 对谁出手：那个受伤的伙伴；不接受自己、也不接受敌人——这是送给别人的波。
 * 候选之间怎么排：生命低于 0.4 的急危者抬到 100 以上，且越近越先（波到得越快、越不容易被抢在前面打倒）；
 *   其余按距离递减，靠近的优先。急危近友因此排在普通补血之前。
 * 够不到怎么办：reach 就是本招射程，共享任务先走近再送；波在路上的飞行时间由本招的机制承担。
 * 放完之后：伙伴拿到这一口，伙伴交回共享顺序继续战斗。
 * 配置：overcharge 切换超载／轻吐；ai.healBelow 与 ai.maxChase 调救助阈值与愿意跑多远送。
 */
namespace CompanionBehavior {
    const healpulseBelow = PokemonSkills.number("ai.healBelow", "救助阈值", 0.3, 0.95, 0.05);
    healpulseBelow.help = "伙伴生命低于该比例才把波动排进救助计划；调低更倾向继续输出，调高一有人掉血就去救。";
    const healpulseChase = PokemonSkills.number("ai.maxChase", "递波距离", 4, 24, 1);
    healpulseChase.help = "伙伴离自己这个距离以内才考虑递波；调小只在身边时救，调大愿意跨一段距离去送。";

    PokemonSkills.addPreferences("healpulse", { overcharge: false, helpFriends: true, ai: { healBelow: 0.75, maxChase: 12 } }, [healpulseBelow, healpulseChase]);

    registerUse("healpulse", {
        protocols: ["world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = source(context);
            if (String(target.ref) === String(self.ref) || !target.friendly || target.health <= 0) return false;
            if (distance(self.point, target.point) > ai<number>(capability, "maxChase", 12)) return false;
            return ratio(target) < ai<number>(capability, "healBelow", 0.75);
        },
        accepts: function (context, _capability, target) {
            const self = source(context);
            return target.friendly && target.health > 0 && String(target.ref) !== String(self.ref);
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = source(context);
            if (!target.friendly || String(target.ref) === String(self.ref)) return 0;
            const near = Math.max(0, 12 - Math.min(12, distance(self.point, target.point)));
            return ratio(target) < 0.4 ? 100 + near : 42 - Math.max(0, 12 - near);
        }
    });
}
