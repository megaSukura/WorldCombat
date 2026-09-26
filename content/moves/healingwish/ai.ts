/**
 * 治愈之愿 的伙伴 AI 用途：这是最后一手——把自己的命换成伙伴的一次重生。
 *
 * 什么局面有意义：自己已经跌破 ai.sacrificeBelow（默认 0.25，反正要死），且 ai.reach 以内有一个受伤到 ai.allyBelow
 *   以下、或带着有害状态效果的伙伴。两个条件同时成立才把它当作紧急行动（priority 100），抢在撤退与共享交战次序之前先许愿。
 * 对谁出手：只有自己（kind self，愿望留在自己倒下的地方）；不接受别的目标。
 * 够不到怎么办：伙伴在 ai.reach 之外就先不许愿（愿望等不到人）。伙伴都已健康干净时也不许。
 * 放完之后：自己倒下，愿望独立留在原地等待；伙伴被治好，愿望散去。
 * 不默认频繁自杀：只有自己濒危、又确有一个重要受伤伙伴可接近时才推荐；轻伤伙伴不触发，避免白白送命。
 * 配置：broadcast（广愿／专愿）在参数层改变愿望半径、停留与回复；ai.sacrificeBelow、ai.allyBelow 与 ai.reach 是这套出手计划自己的选项。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_healingwish/harmful", (world, actor) => CombatStatus.hasHarmful(world, actor));
    const healingwishBelow = PokemonSkills.number("ai.sacrificeBelow", "献身阈值", 0.1, 0.5, 0.05);
    healingwishBelow.help = "自己生命低于该比例且附近有需要救助的伙伴时，伙计才愿意把命交出去；调低更倾向硬撑，调高则一残血就许愿。";
    const healingwishAllyBelow = PokemonSkills.number("ai.allyBelow", "救助尺度", 0.3, 0.9, 0.05);
    healingwishAllyBelow.help = "伙伴生命低于该比例（或带着有害状态）时才算值得许愿的重要伤员；调低只为重伤伙伴献身，调高也愿为轻伤的伙伴留下愿望。";
    const healingwishReach = PokemonSkills.number("ai.reach", "许愿尺度", 2, 8, 1);
    healingwishReach.help = "伙伴离自己这个距离以内才值得为他许愿；调小只在贴身时献身，调大愿意为稍远的伙伴留下愿望。";

    PokemonSkills.addPreferences("healingwish", { broadcast: false, ai: { sacrificeBelow: 0.25, allyBelow: 0.5, reach: 4 } },
        [healingwishBelow, healingwishAllyBelow, healingwishReach]);

    function healingwishAllyNeeds(context: WorldBehavior.Context, target: Entity, below: number): boolean {
        if (ratio(target) < below) return true;
        return fact<boolean>(context, "world_combat:move_healingwish/harmful", target) === true;
    }

    /** 最近的一个「重要」伤员距离；没有合格伙伴返回 Infinity。 */
    function healingwishWorthy(context: WorldBehavior.Context, within: number, below: number): boolean {
        const self = source(context);
        return (context.facts.nearby as Entity[]).some(function (other) {
            return other.friendly && other.health > 0 && String(other.ref) !== String(self.ref)
                && distance(self.point, other.point) <= within && healingwishAllyNeeds(context, other, below);
        });
    }

    registerUse("healingwish", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            if (ratio(source(context)) > ai<number>(capability, "sacrificeBelow", 0.25)) return false;
            return healingwishWorthy(context, ai<number>(capability, "reach", 4), ai<number>(capability, "allyBelow", 0.5));
        },
        accepts: function (context, _capability, target) { return String(target.ref) === String(source(context).ref); },
        priority: function (context, capability) {
            if (context.facts.mounted) return 0;
            if (ratio(source(context)) > ai<number>(capability, "sacrificeBelow", 0.25)) return 0;
            return healingwishWorthy(context, ai<number>(capability, "reach", 4), ai<number>(capability, "allyBelow", 0.5)) ? 100 : 0;
        }
    });
}
