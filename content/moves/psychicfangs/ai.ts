/**
 * 精神之牙 / psychicfangs 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * `ai.eatBarrier`（默认开）在目标带着反射壁、光墙或极光幕时抬高优先级——这一口会把屏障咬碎吞成额外力道，
 * 是它最划算的时机；关闭则只按威胁与距离排序。放完之后继续常规交战。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("psychicfangs", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const warded = CompanionBehavior.status(context, target, "reflect")
                || CompanionBehavior.status(context, target, "lightscreen")
                || CompanionBehavior.status(context, target, "auroraveil");
            if (CompanionBehavior.ai<boolean>(capability, "eatBarrier", true) && warded) return 42;
            return warded ? 24 : 18;
        }
    });

    addPreferences("psychicfangs", {}, [
        field(pathOf("devour"), "噬壁式", "boolean", {
            help: "开启：每碎一层屏障的加成 ×1.7、碎壁范围 ×1.25，但基础咬击 ×0.9、冷却 +8 刻；关闭：穿刺式，基础咬击 ×1.08、吞壁加成 ×0.6。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动扑咬，先走近。越大越愿意从稍远处先手咬壁。"
        }),
        field(pathOf("ai.eatBarrier"), "先吃屏障", "boolean", {
            help: "开启：目标带着反射壁、光墙或极光幕时优先咬它，把屏障咬碎吞成额外力道；关闭：只按威胁与距离排序。"
        })
    ]);
}
