/**
 * 甩肉 / filletaway 的 AI 用途。
 *
 * 什么局面下出手（fortify）：附近有威胁、但还没有贴到脸上（距离不小于 4 格）时，先一刀削身把进攻三项拉起来，
 * 再冲上去打。近来挨过打（hurtAgo 小于 60）或敌人正快速逼近时不出手——卖血不能盖过生存；生命不足以支付
 * 「削肉深度 + 保底」时不用。有交战需求才准备。
 */
namespace PokemonSkills {
    /** Positive when `threat` is closing the distance to `self`, in blocks per tick. */
    function filletawayClosing(self: CompanionBehavior.Entity, threat: CompanionBehavior.Entity): number {
        var sv = self.velocity || [0, 0, 0], tv = threat.velocity || [0, 0, 0];
        var dx = self.point[0] - threat.point[0], dy = self.point[1] - threat.point[1], dz = self.point[2] - threat.point[2];
        var length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        return (dx * (tv[0] - sv[0]) + dy * (tv[1] - sv[1]) + dz * (tv[2] - sv[2])) / length;
    }

    CompanionBehavior.registerUse("filletaway", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (["atk", "spa", "spe"].every(function (stat) { return CompanionBehavior.stage(context, CompanionBehavior.source(context), stat) >= 6; })) return false;
            var self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            var reserve = CompanionBehavior.ai<number>(capability, "reserveHealth", 0.15);
            var deep = !!(capability.data.config && Number(capability.data.config.depth) > 0.55);
            if (CompanionBehavior.ratio(self) < (deep ? 0.65 : 0.5) + reserve) return false;
            if (!threat) return false;
            var distance = CompanionBehavior.distance(self.point, threat.point);
            if (distance < 4 || distance > CompanionBehavior.ai<number>(capability, "maxChase", 16)) return false;
            // Already being hit, or the enemy is closing fast at close range: survival first, carve later.
            if (typeof self.hurtAgo === "number" && self.hurtAgo < 60) return false;
            if (distance < 7 && filletawayClosing(self, threat) > 0.12) return false;
            return true;
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            return context.senses["world_combat:threat"] ? 105 : 0;
        }
    });

    addPreferences("filletaway", {}, [
        field(pathOf("ai.reserveHealth"), "保留生命", "number", {
            min: 0.05, max: 0.6, step: 0.05,
            help: "削肉前要求留下的生命比例；越高越不肯卖血，生命不足时改为先攻击或走位。"
        }),
        field(pathOf("ai.maxChase"), "削肉距离上限", "number", {
            min: 5, max: 32, step: 1,
            help: "威胁超过这个距离就不再先削肉；越大越愿意在远处先叠进攻。"
        })
    ]);
}
