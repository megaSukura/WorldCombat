/**
 * 吐丝 的伙伴 AI 用途：这招自己的一套出手计划——留住跑得快的、削弱高速目标。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没被丝缠住、速度也没到 −6 底线。
 *   缠足模式下可以只对正在逃跑的威胁出手（ai.runnersOnly），把它留住；
 *   结网模式作为普通单体控制：不再用「身边挤着几个敌人」给一发单目标弹加群控分；能不能堵住通道
 *   由玩家按地形选点，AI 只按威胁本身排序。
 * 对谁出手：当前威胁；已被缠住或速度已到底线的跳过，避免对控制免疫的硬目标连续空放。
 * 够不到怎么办：reach 就是吐丝距离，超出先走近；丝有飞行时间，掩体挡住时交回共享接近逻辑。
 * 放完之后：目标缠绕期间降低速度（缠足还带一段独立定身）；没缠住时丝黏在它真实撞上的表面，伙伴交回共享顺序。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("stringshot", { ai: { maxChase: 8, runnersOnly: false, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.flag("ai.runnersOnly", "只缠逃者"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function stringshotWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 8)) return false;
        if (status(context, threat, "silked")) return false;
        if (stage(context, threat, "spe") <= -6) return false;
        if (!item.data.config || item.data.config.silk !== true) {
            if (ai<boolean>(item, "runnersOnly", false) && !fleeing(context, threat)) return false;
        }
        return true;
    }

    registerUse("stringshot", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || stringshotWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !stringshotWants(context, item, target)) return 0;
            // 结网是普通单体控制，不再因附近人数加分。
            if (item.data.config && item.data.config.silk === true) return 45;
            return fleeing(context, target) ? 90 : 45;
        }
    });
}
