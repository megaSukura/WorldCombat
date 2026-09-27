/**
 * 双刃头锤 / headsmash 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。这是一记反伤与冲空自伤都很重的头撞，
 * 所以伙伴只在自身生命高于 `ai.minHealth`、或对手已经残到值得用这一下收掉时才排到前面；残血目标在射程内时
 * 最优先。`ai.minHealth` 越高越珍惜自己，也越少抢收残血。
 * 低于 `ai.minHealth` 仍要收残时，先估计能不能承受：只有自己剩余生命还多于对手剩余生命，才值得用这一记
 * 反伤/冲空都很重的头撞去换；否则空冲或反震可能把自己一起带走。
 * 用完会刹在较远的位置，剩下的距离交回共享顺序；稳头式更安全、更适合缠斗，拼命式留给一锤定音。
 */
namespace PokemonSkills {
    function headsmashValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    CompanionBehavior.registerUse("headsmash", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!headsmashValid(target)) return false;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            const self = CompanionBehavior.source(context);
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.45);
            if (CompanionBehavior.ratio(self) >= minHealth) return true;
            // 低血收残：只有自己剩余生命仍多于对手，才扛得住这一记的反伤或冲空自伤。
            return CompanionBehavior.ratio(target) <= 0.3 && self.health > target.health;
        },
        accepts: function (context, capability, target) {
            return headsmashValid(target);
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ratio(target) <= 0.3) return 74;
            return 24;
        }
    });

    addPreferences("headsmash", {}, [
        field(pathOf("hold"), "稳头式", "boolean", {
            help: "开启：威力、反伤、冲空自伤与击退都收一档，起手、收招、冷却更短——用它长期缠斗更安全。关闭：拼命式，威力和反震都拉满，适合一锤定音。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动头撞，先走近。越大越早发起，也越容易冲空后栽在远处。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命低于这个比例时不再主动头撞（除非对手已残）。越高越珍惜自己，也越少抢收残血。"
        })
    ]);
}
