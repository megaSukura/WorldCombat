/**
 * 指导 的伙伴 AI 用途：这是这招自己的一套出手计划——把一个伙伴教会，并让旁边的人一起领会。
 *
 * 什么局面有意义：有可见威胁、它与自己都在 ai.maxChase 以内，并有一个还没被指导过的伙伴
 *   （共享的 world_combat:partner 观测会给出交战中或带伤的伙伴；ai.prefer 决定照顾哪一类）。
 * 对谁出手：那个伙伴；不接受自己、也不接受敌人——指导要有一个对象。
 * 候选之间怎么排：伙伴正在打威胁或刚受伤时 priority 90，否则 55，都排在共享的 defend 之前先把攻防送出去。
 * 够不到怎么办：reach 就是本招射程，共享任务会先走近那个伙伴再教；ai.leaveStation 决定驻守时是否离位。
 * 放完之后：伙伴与身边听清者攻防抬起，交给队友去打这段窗口；伙伴已经带着同一份指导时不再重复。
 */
namespace CompanionBehavior {
    const coachingChase = PokemonSkills.number("ai.maxChase", "指导距离", 4, 24, 1);
    coachingChase.help = "威胁与伙伴都要在这个距离以内才考虑指导；越大越愿意跑远一点去教。";
    const coachingPrefer = PokemonSkills.choice("ai.prefer", "照顾对象", ["engaged", "injured"], ["交战中（出手更早）", "带伤的（留到残血）"]);
    coachingPrefer.help = "交战中：优先教正在打威胁的队友；带伤的：只照顾生命掉下来的队友，把指导留给更危险的时刻。";
    const coachingStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    coachingStation.help = "开启后，收到「驻守」指令时也会离开原位去指导伙伴。";

    PokemonSkills.addPreferences("coaching", { drill: 1, ai: { maxChase: 11, prefer: "engaged", leaveStation: false } },
        [coachingChase, coachingPrefer, coachingStation]);

    CompanionBehavior.registerUse("coaching", {
        protocols: ["world_combat:bolster"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(capability, "leaveStation", false)) return false;
            if (!target || target.health <= 0 || !target.visible) return false;
            const self = CompanionBehavior.source(context);
            if (!target.friendly || target.ref === self.ref) return false;
            if (CompanionBehavior.status(context, target, "coaching")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            const chase = CompanionBehavior.ai<number>(capability, "maxChase", 11);
            return CompanionBehavior.distance(self.point, threat.point) <= chase
                && CompanionBehavior.distance(self.point, target.point) <= chase;
        },
        accepts: function (context, _capability, target) {
            return target.friendly && target.ref !== CompanionBehavior.source(context).ref && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "coaching");
        },
        priority: function (context, _capability, target) {
            if (!target || !target.friendly || target.health <= 0) return 0;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const engaged = target.attacking === threat.ref || (typeof target.hurtAgo === "number" && target.hurtAgo < 60);
            return engaged ? 90 : 55;
        }
    });
}
