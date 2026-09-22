/**
 * 撒娇 的伙伴 AI 用途：这招自己的一套出手计划，而不是共享控制位的顺手一放。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没有心软、视线畅通。飞吻够得更远，贴近撒娇要凑近。
 * 对谁出手：当前威胁；已经被撒娇（任何来源的 charmed 身份）的目标跳过，省下一次。
 * 出手时机：ai.opening=迎击时只在目标正打自己或主人、或自己刚被打过时抬眼；随时则见威胁就撒娇。
 * 够不到怎么办：reach 就是这次送法的撒娇距离（按配置与体型估算），超出的先走近；视线被挡时交回共享接近逻辑。
 * 放完之后：目标大幅掉攻击，伙伴交回共享顺序，再决定追击还是趁对方下不去手拉开。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("charm", { ai: { maxChase: 9, opening: "anytime", leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 16, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "counter"], ["随时", "迎击时"]),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 与参数公式同源的撒娇距离估算；实际施放仍走招式自己的 charmRange。 */
    function charmReach(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const height = self.height === undefined ? 1.4 : self.height;
        const kiss = !!(item.data.config && item.data.config.kiss);
        return kiss ? Math.max(5, Math.min(9, height * 1.1 + 4.5)) : Math.max(1.6, Math.min(3.0, height * 0.5 + 1.2));
    }

    function charmWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 9)) return false;
        if (status(context, threat, "charmed")) return false;
        if (!world(context).clear(point(self.point), point(threat.point))) return false;
        if (ai<string>(item, "opening", "anytime") !== "counter") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    registerUse("charm", {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return charmReach(context, item); },
        available: function (context, item, _purpose, target) { return !target || charmWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !charmWants(context, item, target)) return 0;
            return 56;
        }
    });
}
