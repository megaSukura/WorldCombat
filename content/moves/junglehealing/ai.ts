/**
 * 丛林治疗 的伙伴 AI：这是以自己为心、回血并解状态的一圈藤蔓，谁在圈里就被缠一下。
 *
 * 什么局面有意义：共享的「伤者」感官挑出一个生命低于 ai.healBelow（默认 0.82）的自己或伙伴；自己若带着
 *   有害状态效果也值得唤丛林。带异常的目标优先度更高（解状态是这招独有的价值）。
 * 对谁出手：那个目标；自己也在圈里。藤蔓以自身为心，所以伙伴必须被罩进半径。
 * 够不到怎么办：approachTarget 指向目标，由共享任务把身体带进 radius 内再放。
 * 配置：deeproot 在参数层换「根深圈大」与「浅根快放」；ai.healBelow / ai.maxChase 是救助阈值与愿意跑多远。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_junglehealing/harmful", (world, actor) => CombatStatus.hasHarmful(world, actor));
    const junglehealingBelow = PokemonSkills.number("ai.healBelow", "救助阈值", 0.3, 0.95, 0.05);
    junglehealingBelow.help = "自己或伙伴生命低于该比例才把丛林治疗排进救助计划；调低更倾向继续输出，调高一有人掉血就放。";
    const junglehealingChase = PokemonSkills.number("ai.maxChase", "施救距离", 3, 20, 1);
    junglehealingChase.help = "目标离自己这个距离以内才考虑唤丛林；调小只在身边时救，调大愿意靠过去。";

    PokemonSkills.addPreferences("junglehealing", {}, [junglehealingBelow, junglehealingChase]);

    function junglehealingAfflicted(context: WorldBehavior.Context, target: Entity): boolean {
        return fact<boolean>(context, "world_combat:move_junglehealing/harmful", target) === true;
    }

    registerUse("junglehealing", {
        protocols: ["world_combat:heal"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return false;
            const self = source(context);
            if (!target.friendly || target.health <= 0) return false;
            if (String(target.ref) !== String(self.ref) && distance(self.point, target.point) > ai<number>(item, "maxChase", 12)) return false;
            return ratio(target) < ai<number>(item, "healBelow", 0.82) || junglehealingAfflicted(context, target);
        },
        accepts: function (_context, _item, target) { return target.friendly && target.health > 0; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, _item, target) {
            if (!target) return 0;
            if (junglehealingAfflicted(context, target)) return 95;
            return ratio(target) < 0.35 ? 100 : 45;
        }
    });
}
