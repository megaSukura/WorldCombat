/**
 * 生命水滴 的伙伴 AI：这一发以自己为心、贴地铺开，谁在圈里就被扫一口。
 *
 * 什么局面有意义：共享的「伤者」感官挑出一个生命低于 ai.healBelow（默认 0.82）的自己或伙伴，且它在
 *   ai.maxChase（默认 12）以内。
 * 对谁出手：那个伤者；自己受伤也可以。水波以自身为心，所以伙伴必须被罩进半径。
 * 够不到怎么办：approachTarget 指向伤者，由共享任务把身体带进 radius 内再放（自己施放、先靠近伙伴）。
 * 候选之间怎么排：伤者生命低于 0.35 时 priority 抬到 100，抢在共享交战次序前先救；其余 45。
 * 配置：surge 在参数层换「水足而慢」与「水细而快」；ai.healBelow / ai.maxChase 是救助阈值与愿意跑多远。
 */
namespace CompanionBehavior {
    const lifedewBelow = PokemonSkills.number("ai.healBelow", "救助阈值", 0.3, 0.95, 0.05);
    lifedewBelow.help = "自己或伙伴生命低于该比例才把生命水滴排进救助计划；调低更倾向继续输出，调高一有人掉血就放。";
    const lifedewChase = PokemonSkills.number("ai.maxChase", "施救距离", 3, 20, 1);
    lifedewChase.help = "伤者离自己这个距离以内才考虑放水波；调小只在身边时救，调大愿意靠过去。";

    PokemonSkills.addPreferences("lifedew", {}, [lifedewBelow, lifedewChase]);

    registerUse("lifedew", {
        protocols: ["world_combat:heal"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return false;
            const self = source(context);
            if (!target.friendly || target.health <= 0) return false;
            if (String(target.ref) !== String(self.ref) && distance(self.point, target.point) > ai<number>(item, "maxChase", 12)) return false;
            return ratio(target) < ai<number>(item, "healBelow", 0.82);
        },
        accepts: function (_context, _item, target) { return target.friendly && target.health > 0; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (_context, _item, target) {
            if (!target) return 0;
            return ratio(target) < 0.35 ? 100 : 45;
        }
    });
}
