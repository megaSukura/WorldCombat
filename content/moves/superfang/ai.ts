/**
 * 愤怒门牙 / superfang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 7）格内。它按比例削血，
 * 所以排序看目标**当前生命比例**：生命比例越高（≥ `ai.halfAt`，默认 0.35）价值越大，越高越优先；
 * 低于这个比例时削掉的那一点点不值得，priority 压到很低，把出手让给别的招。
 * `ai.halfAt` 是玩家能预见的取舍：调高＝更早放弃这招、只在目标还厚时用；调低＝残血也照样削。
 * 更远交给共享接近逻辑；够不到不出手。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("superfang", {
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
            const ratio = CompanionBehavior.ratio(target);
            const halfAt = CompanionBehavior.ai<number>(capability, "halfAt", 0.35);
            if (ratio < halfAt) return 8;
            return Math.round(20 + ratio * 30);
        }
    });

    addPreferences("superfang", {}, [
        field(pathOf("patient"), "潜咬式", "boolean", {
            help: "开启：捎带的碎肉 ×1.6、咬住更久，但起手多 3 刻、冷却多 8 刻；关闭：掠咬式，出手更快、收招更短，但捎带的伤害 ×0.8。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扑咬，先走近；越大追得越执着。"
        }),
        field(pathOf("ai.halfAt"), "最低削血比例", "number", {
            min: 0.1, max: 0.6, step: 0.05,
            help: "目标当前生命比例低于这个数时就不再用愤怒门牙，把出手让给别的招。调高＝只在目标还厚时削；调低＝残血也照样削（收益很小）。"
        })
    ]);
}
