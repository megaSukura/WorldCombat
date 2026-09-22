/**
 * 闪焰冲锋 / flareblitz 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 11）格内。它是一记自伤不轻的重冲，
 * 所以门槛比轻招高：自身生命高于 `ai.minHealth`（默认 0.28），或对手已经残到值得一收时才排前面。
 * 对谁出手：优先还没被点着的人（这一撞的价值在挂灼伤），其次血少的收尾；已经烧着的目标排到最后。
 * 放完之后：目标被顶飞了，继续朝它压上去，把撞开的身位变成下一次出手的距离。
 */
namespace PokemonSkills {
    function flareblitzValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    function flareblitzAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        if (!progress.chaseUntil) progress.chaseUntil = context.tick + 40;
        if (context.tick > progress.chaseUntil) return;
        const threat = CompanionBehavior.goalEntity(context);
        if (!threat || threat.health <= 0) return;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, threat.point) <= 3.6) return;
        const navigation = CompanionBehavior.navigate(context, threat.point, 3);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse("flareblitz", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!flareblitzValid(target)) return false;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 11)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.28);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth
                || CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) { return flareblitzValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (!CompanionBehavior.status(context, target, "burn")) score += 16;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 12;
            return score;
        },
        after: function (context, capability, target, progress) { return flareblitzAfter(context, progress); }
    });

    addPreferences("flareblitz", {}, [
        field(pathOf("afterburn"), "余焰式", "boolean", {
            help: "开启：灼伤概率大幅提高、烧得更久，反伤更重、起手更慢、冲程更短、击退更轻——把这一撞换成持续压制。关闭（爆焰式）：威力、冲程与击退更高，反伤更轻、节奏更快，但几乎不点着对手。"
        }),
        field(pathOf("ai.maxChase"), "冲锋距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动发起闪焰冲锋，先靠近。越大越早起冲，也越容易冲空。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命低于这个比例时不再主动冲撞（除非对手已残）。这一招反伤重，调高更珍惜自己。"
        })
    ]);
}
