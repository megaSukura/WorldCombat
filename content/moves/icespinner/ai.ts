/**
 * 冰旋 / icespinner —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活、**站在地上**，且在 `ai.maxChase`（默认 7）格内；够不到交给共享接近逻辑。
 *   它是一记贴地旋转冲撞，空中的对手不在候选里。
 * 对谁出手：`ai.clearTerrain`（默认开）打开时，身上带着任一场地身份（共享身份 world_combat:status/<场地名>，
 *   读法与其他状态一致）的目标排最前——旋过去顺手把场地刮掉；否则按普通近战排序。
 * 够不到怎么办：reach 就是本招实际冲距，先走近。
 * 放完之后：交回共享交战计划；冲过的冰面与刮掉的场地都是它留下的结果。
 */
namespace PokemonSkills {
    const icespinnerTerrains = ["electricterrain", "grassyterrain", "mistyterrain", "psychicterrain"];

    function icespinnerOnTerrain(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        for (let i = 0; i < icespinnerTerrains.length; i++)
            if (CompanionBehavior.status(context, target, icespinnerTerrains[i])) return true;
        return false;
    }

    function icespinnerWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible || target.grounded === false) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
    }

    CompanionBehavior.registerUse(icespinnerId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return icespinnerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && target.grounded !== false;
        },
        priority: function (context, capability, target) {
            if (!target || !icespinnerWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 16 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "clearTerrain", true) && icespinnerOnTerrain(context, target)) score += 22;
            return score + Math.round(CompanionBehavior.ratio(target) * 5);
        }
    });

    addPreferences(icespinnerId, { ai: { maxChase: 7, clearTerrain: true } }, [
        field(pathOf("slick"), "冰面", "boolean", {
            help: "开启：冲距 ×1.25、冲速 ×1.2、冰面存留 ×1.5、击退 ×0.7，滑得远、留得久；代价是本击 ×0.85。关闭（碎冰）：本击 ×1.15、刮除半径 ×1.3、击退 ×1.4，旋得更狠，代价是冲距 ×0.8、冰面存留 ×0.6、起手 +2 刻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "目标离自己这么远以内才旋过去；调大愿意主动逼近更远的目标。"
        }),
        field(pathOf("ai.clearTerrain"), "优先刮场地", "boolean", {
            help: "开启：身上带着场地身份的目标优先，旋过去顺手把场地刮掉；关闭则只按普通近战排序。"
        })
    ]);
}
