/**
 * 金属爪 / metalclaw 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 为什么先出手：这是一记养势的近战——只读探针读到自己物攻等级未满（`ai.buildUp`，默认开）时 priority 抬到 28，
 *   先把物攻垫起来；已经磨到 +4 以上就降到 18，不再为加攻抬价，交回共享交战计划去用更重的招。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）；爪程很短，够不到先贴近。
 * 放完之后：物攻等级留在身上，下一记物理招经共享结算更重；不再抢着连打。
 */
namespace PokemonSkills {
    /** 只读、回调内缓存的物攻能力等级（宝可梦读原生等级，其他生物读 CombatStages）。 */
    

    CompanionBehavior.registerUse("metalclaw", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "buildUp", true)) return 18;
            const stage = CompanionBehavior.stage(context, self, "atk");
            return (typeof stage === "number" ? stage : 0) < 4 ? 28 : 18;
        }
    });

    addPreferences("metalclaw", {}, [
        field(pathOf("hone"), "重爪式", "boolean", {
            help: "开启：只劈一记但更重、磨利几率更高、击退更远、爪程更深，但起手与冷却更久；关闭（连爪式）：两记各掷一次磨利，更快更便宜、单记更轻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才出爪；爪程很短，调大也常常要先贴近。"
        }),
        field(pathOf("ai.buildUp"), "先磨物攻", "boolean", {
            help: "开启：自己物攻还没磨到 +4 级时优先出爪把攻击垫起来；关闭则按普通近战排序，把它当成一记便宜的补刀。"
        })
    ]);
}
