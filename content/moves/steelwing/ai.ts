/**
 * 钢翼 / steelwing 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 7）格内；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）；这是横扫，站位比目标身份更重要——
 *   `ai.preferCrowd`（默认开）在目标身边挤着别人时抬价，一扇扫开一片。
 * 为什么先出手：`ai.braceUp`（默认开）在自己防御还没到 +4 级时抬价，先把防御磨硬再去吃伤害。
 * 放完之后：防御等级留在身上，交回共享交战计划继续交战。
 */
namespace PokemonSkills {
    /** 自己 `reach` 范围内实打实挤着几个敌人，用来读「一片人」；只是候选排序的读法，不改变命中判定。 */
    function steelwingCrowd(context: WorldBehavior.Context, self: CompanionBehavior.Entity, reach: number): number {
        const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
        let count = 0;
        for (let index = 0; index < nearby.length && count < 6; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || String(other.ref) === String(self.ref)) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= reach) count++;
        }
        return count;
    }

    /** 只读、回调内缓存的防御能力等级（宝可梦读原生等级，其他生物读 CombatStages）。 */
    

    CompanionBehavior.registerUse("steelwing", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)
                && steelwingCrowd(context, self, capability.data.range) >= 2) score += 14;
            if (CompanionBehavior.ai<boolean>(capability, "braceUp", true)) {
                const stage = CompanionBehavior.stage(context, self, "def");
                if ((typeof stage === "number" ? stage : 0) < 4) score += 8;
            }
            return score;
        }
    });

    addPreferences("steelwing", {}, [
        field(pathOf("glide"), "滑翔扫", "boolean", {
            help: "开启：先向前滑一段再横扫，扇面更宽、击退更远、升防更稳，但起手与冷却更久，也可能为扫人而滑进敌阵；关闭（原地扫）：站着把身前扫开，更快更便宜、扇面略窄。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "对手离自己这么远以内才主动横扫；调大愿意主动凑上去扫一片。"
        }),
        field(pathOf("ai.preferCrowd"), "优先扫一片", "boolean", {
            help: "开启：目标身边还挤着别人时优先横扫，一扇扫开一片；关闭则只按普通近战排序。"
        }),
        field(pathOf("ai.braceUp"), "先磨防御", "boolean", {
            help: "开启：自己防御还没到 +4 级时抬价，先把翼面磨硬再去吃伤害；关闭则不特意为增益出手。"
        })
    ]);
}
