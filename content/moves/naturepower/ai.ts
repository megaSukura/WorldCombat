/**
 * 自然之力 的伙伴 AI：一记贴地的远程攻击，脚下有什么就打什么。
 *
 * 出手局面：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 12）格内时按射程出手；焦点目标不受距离限制。
 *   reach 与招式射程一致（场地涌动距离 9-17 格），够不到交给共享接近逻辑。
 * 对谁出手：一切非友方活体；焦点目标优先。
 * 配置：`charged`（催发地脉）把准备拉长，换取更高威力与更远射程——AI 沿用当前配置，重击与快打都放得出来。
 */
namespace CompanionBehavior {
    registerUse("naturepower", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            return !!target && target.health > 0;
        },
        accepts: function (context, item, target) {
            var goal = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref) return true;
            return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 12);
        }
    });

    PokemonSkills.addPreferences("naturepower", { charged: false, ai: { maxChase: 12, leaveStation: false } },
        [PokemonSkills.flag("charged", "催发地脉"), PokemonSkills.number("ai.maxChase", "出手距离", 2, 32, 1),
            PokemonSkills.flag("ai.leaveStation", "驻守时离位")]);
}
