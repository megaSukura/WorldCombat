/**
 * 清醒 / smellingsalts 的 AI 用途。
 *
 * 这招有两种用途，共用同一记盐拍：
 *   救队友（fortify）：近处有正麻痹的伙伴时，`ai.rescue`（默认开）下把它排成紧急救助，priority 96；
 *     队友不麻痹就完全不考虑（拍过去也没用）。
 *   打敌人（attack）：目标可见、敌对、存活且在 `ai.maxChase`（默认 6）格内才列入候选；
 *     能用这一记收尾（目标麻痹且血量偏低）时抬到 56，单纯用麻痹牵制时只给 34——别为解麻白送控制；
 *     普通拍击压到 9，让位给别的招。
 * 什么距离：reach 就是本招射程，共享任务先走近再拍；够不到交给共享接近逻辑。
 * 放完之后：交回共享计划；命中会解除目标的麻痹，这一记不负责持续压制。
 */
namespace PokemonSkills {
    function smellingsaltsRescue(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean {
        return CompanionBehavior.ai<boolean>(capability, "rescue", true);
    }

    CompanionBehavior.registerUse(smellingsaltsId, {
        protocols: ["world_combat:attack", "world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.health <= 0 || !target.visible) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return false;
            if (target.friendly) {
                return smellingsaltsRescue(context, capability) && String(target.ref) !== String(self.ref)
                    && CompanionBehavior.status(context, target, "paralysis");
            }
            return true;
        },
        accepts: function (context, capability, target) {
            if (target.health <= 0 || !target.visible) return false;
            if (!target.friendly) return true;
            return String(target.ref) !== String(CompanionBehavior.source(context).ref)
                && CompanionBehavior.status(context, target, "paralysis");
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const numb = CompanionBehavior.status(context, target, "paralysis");
            if (target.friendly) {
                return smellingsaltsRescue(context, capability) && numb ? 96 : 0;
            }
            if (numb && CompanionBehavior.ai<boolean>(capability, "wake", true)) {
                // 能收尾才值得解麻打重；只是牵制中的麻痹目标降低收益。
                const finisher = target.health / Math.max(1, target.maximum) < 0.45;
                return finisher ? 56 : 34;
            }
            return 9;
        }
    });

    addPreferences(smellingsaltsId, {}, [
        field(pathOf("coarse"), "粗盐", "boolean", {
            help: "开启：拍开 ×1.5，且解除敌方麻痹后额外留下一段踉跄（减速）；但本击 ×0.90、冷却多 3 刻。关闭：本击 ×1.06，拍醒就干净。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "目标离自己这么远以内才拍过去；调大愿意主动追上更远的麻痹目标。"
        }),
        field(pathOf("ai.wake"), "趁麻痹拍", "boolean", {
            help: "开启：麻痹敌人获得额外优先级，抓住威力翻倍的机会；关闭：不按麻痹加权，只当普通低优先级拍击。"
        }),
        field(pathOf("ai.rescue"), "救麻痹队友", "boolean", {
            help: "开启：近处正麻痹的伙伴会被当成紧急救助目标优先拍醒；关闭则只对敌人出手，任由队友自己解麻。"
        })
    ]);
}
