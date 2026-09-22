/**
 * 撞击 / tackle 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑走过去。
 * 它是本组最便宜的近身招，所以 `priority` 只在“已经在射程内”时给分：目标残血且开启 `ai.finish` 时抬到 60 抢收，
 * 否则按普通近身候选排。撞空会冲过头，因此默认在驻守时允许离位（它同时也是一招换位手段）。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("tackle", {
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
            const close = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range;
            if (!close) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) return 60;
            return 22;
        }
    });

    addPreferences("tackle", {}, [
        field(pathOf("runUp"), "助跑式", "boolean", {
            help: "开启：助跑与穿过距离更长、威力略高，但收招与冷却更久、撞空后位置冲得更靠前；关闭：贴身短撞，出手快、位置稳。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动发起撞击，先走近。越大追击越执着，也越容易空撞冲到对手身后。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先补这一下；关闭：只按普通近身候选参与排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为撞击离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
