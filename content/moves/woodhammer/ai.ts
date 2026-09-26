/**
 * 木槌 / woodhammer 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。这一招最慢最重、反震也不轻，
 * 所以要求自身生命高于 `ai.minHealth`，或对手已经残到值得一收。开启 `ai.preferHeld`（默认开）时，
 * 走不动或睡着/被定住的目标排得更前——慢挥的一记留给躲不开的人；正常走位的目标按普通近身候选排。
 * 够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function woodhammerValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    function woodhammerHeld(target: CompanionBehavior.Entity): boolean {
        return !!(target.sleeping || target.rooted);
    }

    CompanionBehavior.registerUse("woodhammer", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!woodhammerValid(target)) return false;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 7)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.35);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth
                || CompanionBehavior.ratio(target) <= 0.4;
        },
        accepts: function (context, capability, target) { return woodhammerValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferHeld", true) && woodhammerHeld(target)) score += 20;
            if (CompanionBehavior.ratio(target) <= 0.4) score += 16;
            return score;
        }
    });

    addPreferences("woodhammer", {}, [
        field(pathOf("root"), "扎根式", "boolean", {
            help: "开启：威力、击退与落点碎屑都更大，但反伤更重、起手与收招更慢——适合一锤定音或砸开阵型。关闭（开山式）：更快的挥砸，威力与落点碎屑收一档，适合缠斗。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动挥砸，先靠近。这招手短，调大更容易在移动中被让开。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命低于这个比例时不再主动挥砸（除非对手已残）。越高越珍惜自己。"
        }),
        field(pathOf("ai.preferHeld"), "留给走不动的目标", "boolean", {
            help: "开启：睡着、被定住的目标排得更前——慢挥的一记留给躲不开的人；关闭：只按威胁与距离排序。"
        })
    ]);
}
