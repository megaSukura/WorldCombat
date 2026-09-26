/**
 * 指导 的伙伴 AI 用途：这是这招自己的一套出手计划——把最该教的那个前排伙伴教好，让指导从他身上传开。
 *
 * 什么局面有意义：有可见威胁、它与自己都在 ai.maxChase 以内，并有一个还没被指导过的伙伴。
 * 以谁为阵心：优先正在近战、且身边还有未受教友方的伙伴；孤立在后排、身边没人可传的对象不选——教他只会浪费
 *   这一圈。全员都已经带着指导时不挑目标，PP 留着。
 * 对谁出手：那个伙伴；不接受自己、也不接受敌人——指导要有一个对象。
 * 候选之间怎么排：伙伴正在打威胁、刚受伤或身边有未受教者时加分；ai.prefer=带伤时只照顾生命掉下来的伙伴，
 *   否则优先交战中的人。都排在共享的 defend 之前先把攻防送出去。
 * 够不到怎么办：reach 就是本招射程，共享任务会先走近那个伙伴再教；ai.leaveStation 决定驻守时是否离位。
 * 放完之后：伙伴与身边听清者攻防抬起，交给队友去打这段窗口；伙伴已经带着同一份指导时不再重复。
 */
namespace CompanionBehavior {
    const coachingChase = PokemonSkills.number("ai.maxChase", "指导距离", 4, 24, 1);
    coachingChase.help = "威胁与伙伴都要在这个距离以内才考虑指导；越大越愿意跑远一点去教。";
    const coachingPrefer = PokemonSkills.choice("ai.prefer", "照顾对象", ["engaged", "injured"], ["交战中（出手更早）", "带伤的（留到残血）"]);
    coachingPrefer.help = "交战中：优先教正在打威胁的队友；带伤的：只照顾生命掉下来的队友，把指导留给更危险的时刻。孤立在后排、身边没人可传的伙伴不会被选；全员都已受教时不挑目标，PP 留着。";
    const coachingStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    coachingStation.help = "开启后，收到「驻守」指令时也会离开原位去指导伙伴。";

    PokemonSkills.addPreferences("coaching", { drill: 1, ai: { maxChase: 11, prefer: "engaged", leaveStation: false } },
        [coachingChase, coachingPrefer, coachingStation]);

    /** 受教者周围能一起领会的、还没受教的友方数量；这就是「以受教者为阵心」的传播面。 */
    function coachingNeighbors(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), access = CompanionBehavior.world(context);
        let splash = 3;
        try {
            const value = PokemonSkills.p("coaching", "splash", access);
            if (typeof value === "number" && isFinite(value) && value > 0) splash = value;
        } catch (error) { }
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0 || !other.visible) continue;
            if (other.ref === self.ref || other.ref === target.ref) continue;
            if (CompanionBehavior.status(context, other, "coaching")) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= splash) count++;
        }
        return count;
    }

    /** 这个伙伴值不值得教：够得着、还没受教、正在近战或身边有人可传，带伤模式再按生命筛一遍。 */
    function coachingWorth(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (!target.friendly || target.ref === self.ref || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "coaching")) return false;
        const threat = context.senses["world_combat:threat"];
        if (!threat || threat.health <= 0 || !threat.visible) return false;
        const chase = CompanionBehavior.ai<number>(capability, "maxChase", 11);
        if (CompanionBehavior.distance(self.point, threat.point) > chase) return false;
        if (CompanionBehavior.distance(self.point, target.point) > chase) return false;
        const engaged = target.attacking === threat.ref || CompanionBehavior.distance(target.point, threat.point) <= 4
            || (typeof target.hurtAgo === "number" && target.hurtAgo < 80);
        if (!engaged && coachingNeighbors(context, target) === 0) return false;
        if (CompanionBehavior.ai<string>(capability, "prefer", "engaged") === "injured") {
            const injured = CompanionBehavior.ratio(target) < 0.9 || (typeof target.hurtAgo === "number" && target.hurtAgo < 120);
            if (!injured) return false;
        }
        return true;
    }

    CompanionBehavior.registerUse("coaching", {
        protocols: ["world_combat:bolster"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(capability, "leaveStation", false)) return false;
            if (!target) return false;
            return coachingWorth(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !!target && coachingWorth(context, capability, target);
        },
        priority: function (context, capability, target) {
            if (!target || !target.friendly || target.health <= 0) return 0;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const engaged = target.attacking === threat.ref || CompanionBehavior.distance(target.point, threat.point) <= 4
                || (typeof target.hurtAgo === "number" && target.hurtAgo < 80);
            const injured = CompanionBehavior.ratio(target) < 0.75 || (typeof target.hurtAgo === "number" && target.hurtAgo < 80);
            const neighbors = coachingNeighbors(context, target);
            let score = 50;
            if (engaged) score += 30;
            if (neighbors > 0) score += 15;
            if (neighbors >= 2) score += 10;
            if (CompanionBehavior.ai<string>(capability, "prefer", "engaged") === "injured") score += injured ? 25 : -15;
            else if (engaged) score += 10;
            return score;
        }
    });
}
