/**
 * 心之眼 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、够得着（ai.maxChase 内）且视线畅通的威胁，自己身上还没有同一次读。
 * 什么时候最想出手：对手正在拉开（共享 movement 感官判为 fleeing）或正打自己／主人时 priority 抬到 86——
 *   跑得快的目标最需要先把准星锁住；其余情况 74，仍然排在普通攻击之前，把这次必中铺好。
 * 对谁出手：当前威胁；已经带着 mindreader 身份的目标跳过，避免浪费只有 5 发的 PP。
 * 够不到怎么办：reach 就是读距离（按体型估算），由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 放完之后：命中拉满、目标被照亮，下一次命中兑现；读还在时不重复。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("mindreader", { ai: { maxChase: 10, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function mindreaderReach(context: WorldBehavior.Context): number {
        const self = source(context);
        const height = self.height === undefined ? 1.4 : self.height;
        return Math.max(4, Math.min(9, 5 + height * 0.7));
    }

    function mindreaderWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, self, "mindreader")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("mindreader", {
        protocols: ["world_combat:control"],
        reach: function (context) { return mindreaderReach(context); },
        available: function (context, item, _purpose, target) { return !target || mindreaderWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !mindreaderWants(context, item, target)) return 0;
            const self = source(context), owner = context.facts.owner;
            if (fleeing(context, target)) return 86;
            return target.attacking === self.ref || !!owner && target.attacking === owner.ref ? 80 : 74;
        }
    });
}
