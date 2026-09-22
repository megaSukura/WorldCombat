/**
 * 流星光束 / meteorbeam 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 20）格内。陨石走抛物线，
 *   所以不需要视线——这一点和日光束/电光束相反。
 * 对谁出手：`ai.overCover`（默认开）打开时，如果自己与目标之间被方块挡住，反而抬高优先级：
 *   隔着掩体砸过去正是这颗陨石最值的时候；关闭则不看掩体，只按普通远程攻击排序。
 * 优先级：`ai.boostFirst`（默认开）打开时，自己特攻还没满段就抬价——先攒下这 1 级再去打别的；
 *   目标贴到 `ai.minRange` 以内时压价，避免站着拉星。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程之后再抛。
 * 放完接什么：交回共享交战计划；特攻提升留在身上，由共享战斗计划继续使用。
 */
namespace PokemonSkills {
    /** 自己与目标之间是否有方块遮挡；有遮挡说明这一颗正好可以越过掩体。 */
    function meteorbeamCovered(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        return !CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    /** 只读、回调内缓存的特攻能力等级（宝可梦读原生等级，其他生物读 CombatStages）。 */
    

    function meteorbeamSpaStage(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const stage = CompanionBehavior.stage(context, target, "spa");
        return typeof stage === "number" ? stage : 0;
    }

    CompanionBehavior.registerUse("meteorbeam", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 20);
        },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 26;
            if (CompanionBehavior.ai<boolean>(capability, "boostFirst", true) && meteorbeamSpaStage(context, self) < 4) score += 10;
            if (CompanionBehavior.ai<boolean>(capability, "overCover", true) && meteorbeamCovered(context, target)) score += 16;
            if (distance < CompanionBehavior.ai<number>(capability, "minRange", 4)) score -= 8;
            return score;
        }
    });

    const meteorbeamDeep = field(pathOf("deep"), "深空形态", "boolean", {
        help: "开启（深空）：聚星多抬 1 级特攻（共 +2 级）、落点更大，但聚星更久（×1.3）、抛出的直接威力 ×0.85、冷却多 5 刻；关闭：聚星更快、抛出更重，但只 +1 级特攻、落点较小。"
    });
    const meteorbeamChase = number("ai.maxChase", "考虑距离", 5, 28, 1);
    meteorbeamChase.help = "超过这个距离就不主动起手，先走近；越大越愿意在更远处先抛一颗。";
    const meteorbeamMin = number("ai.minRange", "最近起手距离", 0, 10, 1);
    meteorbeamMin.help = "目标进到这个距离以内时压低出手优先级，避免站着拉星被打断；调到 0 表示贴身也照抛。";
    const meteorbeamBoostFirst = flag("ai.boostFirst", "先攒特攻");
    meteorbeamBoostFirst.help = "开启：自己特攻还没到 +4 级时抬价，先把这 1 级特攻攒下来；关闭则不特意为增益出手。";
    const meteorbeamOverCover = flag("ai.overCover", "越过掩体");
    meteorbeamOverCover.help = "开启：自己和目标之间被方块挡住时反而优先出手——陨石走抛物线，掩体挡不住它；关闭则不看掩体，只按普通远程攻击排序。";

    addPreferences("meteorbeam", { deep: false, ai: { maxChase: 20, minRange: 4, boostFirst: true, overCover: true } },
        [meteorbeamDeep, meteorbeamChase, meteorbeamMin, meteorbeamBoostFirst, meteorbeamOverCover]);
}
