/**
 * 火之舞 / fierydance 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 5）格内；它是贴着身体旋舞的短程范围招，
 *   更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见；`ai.preferCrowd`（默认开）在目标身边还挤着**可见**的别人时抬价——
 *   两片火翼能分别扫到身周两侧；看不见的（隔墙的）不计入，不会隔着墙凑人数起舞。
 * 为什么先出手：`ai.blazeFirst`（默认开）在自己特攻还没到 +4 级时抬价，先舞起来再打。
 * 放完之后：特攻等级留在身上，交回共享交战计划继续交战；舞期间共享接近逻辑仍按当前目标小步走位。
 */
namespace PokemonSkills {
    /** 自己 `outer` 范围内看得见、还挤着几个敌人，用来读「一圈人」；只是候选排序的读法，不改变命中判定。 */
    function fierydanceCrowd(context: WorldBehavior.Context, self: CompanionBehavior.Entity, reach: number): number {
        const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
        let count = 0;
        for (let index = 0; index < nearby.length && count < 6; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || !other.visible || String(other.ref) === String(self.ref)) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= reach) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("fierydance", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
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
                && fierydanceCrowd(context, self, capability.data.range) >= 2) score += 14;
            if (CompanionBehavior.ai<boolean>(capability, "blazeFirst", true)) {
                const stage = CompanionBehavior.stage(context, self, "spa");
                if ((typeof stage === "number" ? stage : 0) < 4) score += 8;
            }
            return score;
        }
    });

    addPreferences("fierydance", {}, [
        field(pathOf("spiral"), "旋舞", "boolean", {
            help: "开启：两片火翼卷到更大外圈、命中后一次升两级特攻，但每次翼击更轻、起手、收招与冷却更久；关闭（聚焰）：每次更重、更快更便宜、外圈略小，命中只升一级特攻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才起舞；这是贴着身体的范围招，调大也常常要先贴近。"
        }),
        field(pathOf("ai.preferCrowd"), "优先围一圈", "boolean", {
            help: "开启：目标身边还挤着看得见的别人时优先起舞，两片火翼分扫身周两侧；隔墙看不见的不计入。关闭则只按普通近战排序。"
        }),
        field(pathOf("ai.blazeFirst"), "先舞特攻", "boolean", {
            help: "开启：自己特攻还没到 +4 级时抬价，先把火势舞起来；关闭则不特意为增益出手。"
        })
    ]);
}
