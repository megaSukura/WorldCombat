/**
 * 精神强念 / psychic —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 15）格内；够不到交给共享接近逻辑。
 * 它冷却长、代价高，是重手而非普通输出，所以只在值得的局面上用。
 * 对谁出手：`ai.focusThreat`（默认开）打开时，正在攻击自己或主人的目标排前——把它按住、带离才是
 *   这招最值的时候；`ai.fresh`（默认开）打开时，已经被定住或睡着的目标排后（再握一次白费）。
 * 够不到怎么办：reach 就是本招实际射程，先走近。
 * 放完之后：没有手动瞄准时，操纵窗口把目标朝施法者（自己这一侧）带；目标被定身与推动交给共享交战计划。
 *   对搬不动的 Boss，位移被原生抗性拒绝也不影响挤压——窗口结束仍会落一记正常伤害，随后正常战斗。
 */
namespace PokemonSkills {
    function psychicWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 15);
    }

    CompanionBehavior.registerUse(psychicId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return psychicWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !psychicWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 20 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "focusThreat", true)) {
                const owner = context.facts.owner;
                if (target.attacking === self.ref || !!owner && target.attacking === owner.ref) score += 14;
            }
            if (CompanionBehavior.ai<boolean>(capability, "fresh", true) && CompanionBehavior.protectedControl(target)) score -= 8;
            return score + Math.round(CompanionBehavior.ratio(target) * 6);
        }
    });

    addPreferences(psychicId, {}, [
        field(pathOf("hold"), "缠握", "boolean", {
            help: "开启：定身 ×1.5、挤压 ×1.25、拖拽 ×1.2、特防下降概率 ×1.3，但擒压 ×0.94、射程 ×0.85、起手 +3 刻、冷却 +6 刻，适合把目标按久一点。关闭（点握）：更远更快更重的一抓，代价是按得短、挤得轻、压特防更少见。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 24, step: 1,
            help: "超过这个距离就不主动聚念，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.fresh"), "先握没被控的", "boolean", {
            help: "开启：已经被定身或睡着的目标排后，把这只握留给还能动的对手；关闭则所有目标同价。"
        }),
        field(pathOf("ai.focusThreat"), "抓正在出手的", "boolean", {
            help: "开启：正在攻击自己或主人的目标优先，把最凶的那个按住、拖开；关闭则只按普通远程攻击排序。"
        })
    ]);
}
