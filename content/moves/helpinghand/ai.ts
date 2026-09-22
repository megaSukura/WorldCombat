/**
 * 帮助 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：场上有一个看得见的威胁，且身边有正在交战的伙伴（共享伙伴感官已按「队友正在出手或刚受伤」挑人）；
 *   伙伴离自己不超过 ai.maxChase，身上还没有同一份帮助。
 * 对谁出手：需要托举的伙伴；由共用服务走近到 reach 内再施放。
 * 放完之后：伙伴下一次命中兑现加成，伙伴交回共享顺序继续战斗；帮助还在时不重复施加。
 * 配置：ai.maxChase 限制愿意跑去帮多远；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    const helpinghandChase = PokemonSkills.number("ai.maxChase", "托举距离", 3, 20, 1);
    helpinghandChase.help = "伙伴离自己这个距离以内才考虑托举；调小只在贴身时帮忙，调大愿意主动靠过去。";
    const helpinghandLeave = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    helpinghandLeave.help = "开启后，收到驻守命令时也会为托举伙伴离开原位。";

    PokemonSkills.addPreferences("helpinghand", { rally: false, ai: { maxChase: 10, leaveStation: false } },
        [helpinghandChase, helpinghandLeave]);

    registerUse("helpinghand", {
        protocols: ["world_combat:bolster"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!context.senses["world_combat:threat"]) return false;
            if (!target) return true;
            const self = source(context);
            if (String(target.ref) === String(self.ref) || !target.friendly || target.health <= 0) return false;
            if (status(context, target, "helpinghand")) return false;
            return distance(self.point, target.point) <= ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, _capability, target) {
            const self = source(context);
            return target.friendly && target.health > 0 && String(target.ref) !== String(self.ref)
                && !status(context, target, "helpinghand");
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            return target.attacking || target.hurtAgo < 60 ? 45 : 20;
        }
    });
}
