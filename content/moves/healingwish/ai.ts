/**
 * 治愈之愿 的伙伴 AI 用途：这是最后一手——把自己的命换成伙伴的一次重生。
 *
 * 什么局面有意义：自己已经跌破 ai.sacrificeBelow（默认 0.25，反正要死），且 ai.reach 以内有一个「受伤或有主异常」
 *   的伙伴。两个条件同时成立才把它当作紧急行动（priority 100），抢在撤退与共享交战次序之前先许愿。
 * 对谁出手：只有自己（kind self，愿望留在自己倒下的地方）；不接受别的目标。
 * 够不到怎么办：伙伴在 ai.reach 之外就先不许愿（愿望等不到人）。伙伴都已健康干净时也不许。
 * 放完之后：自己倒下，愿望独立留在原地等待；伙伴被治好，愿望散去。
 * 配置：broadcast（广愿／专愿）在参数层改变愿望半径、停留与回复；ai.sacrificeBelow 与 ai.reach 是这套出手计划自己的选项。
 */
namespace CompanionBehavior {
    const healingwishBelow = PokemonSkills.number("ai.sacrificeBelow", "献身阈值", 0.1, 0.5, 0.05);
    healingwishBelow.help = "自己生命低于该比例且附近有需要救助的伙伴时，伙计才愿意把命交出去；调低更倾向硬撑，调高则一残血就许愿。";
    const healingwishReach = PokemonSkills.number("ai.reach", "许愿尺度", 2, 8, 1);
    healingwishReach.help = "伙伴离自己这个距离以内才值得为他许愿；调小只在贴身时献身，调大愿意为稍远的伙伴留下愿望。";

    PokemonSkills.addPreferences("healingwish", { broadcast: false, ai: { sacrificeBelow: 0.25, reach: 4 } },
        [healingwishBelow, healingwishReach]);

    function healingwishAllyNeeds(context: WorldBehavior.Context, target: Entity): boolean {
        if (ratio(target) < 0.85) return true;
        for (let index = 0; index < PokemonSkills.healingwishMalaise.length; index++)
            if (status(context, target, PokemonSkills.healingwishMalaise[index])) return true;
        return false;
    }

    function healingwishWorthy(context: WorldBehavior.Context, within: number): boolean {
        const self = source(context);
        return (context.facts.nearby as Entity[]).some(function (other) {
            return other.friendly && other.health > 0 && String(other.ref) !== String(self.ref)
                && distance(self.point, other.point) <= within && healingwishAllyNeeds(context, other);
        });
    }

    registerUse("healingwish", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            if (ratio(source(context)) > ai<number>(capability, "sacrificeBelow", 0.25)) return false;
            return healingwishWorthy(context, ai<number>(capability, "reach", 4));
        },
        accepts: function (context, _capability, target) { return String(target.ref) === String(source(context).ref); },
        priority: function (context, capability) {
            if (context.facts.mounted) return 0;
            if (ratio(source(context)) > ai<number>(capability, "sacrificeBelow", 0.25)) return 0;
            return healingwishWorthy(context, ai<number>(capability, "reach", 4)) ? 100 : 0;
        }
    });
}
