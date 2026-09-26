/**
 * 撒娇 的伙伴 AI 用途：这招自己的一套出手计划，而不是共享控制位的顺手一放。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没有心软、视线畅通。贴近撒娇要凑近，飞吻够得更远；
 *   实际接近距离直接取本个体这次解析出的 capability 射程（item.data.range），不再另写一套公式。
 * 对谁出手：当前威胁；已经被撒娇（任何来源的 charmed 身份）的目标跳过，省下一次。
 * 出手时机：ai.opening=迎击时只在目标正打自己或主人、或自己刚被打过时抬眼；随时则见威胁就撒娇。
 * 优先级：ai.preferPhysical 开启时，物攻明显高于特攻的目标更值得先软下来（攻击下降对物攻威胁收益最大）。
 * 够不到怎么办：reach 就是这次送法的撒娇距离（按配置与体型由能力给出），超出的先走近；视线被挡时交回共享接近逻辑。
 * 放完之后：目标大幅掉攻击，伙伴交回共享顺序，再决定追击还是趁对方下不去手拉开。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("charm", { ai: { maxChase: 9, opening: "anytime", preferPhysical: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 16, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "counter"], ["随时", "迎击时"]),
        PokemonSkills.flag("ai.preferPhysical", "优先物攻威胁"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 物攻倾向：物攻相对特攻越高越值得软；2 明显物系、1 偏物系、0 法系或未知。 */
    function charmPhysical(context: WorldBehavior.Context, threat: Entity): number {
        const facts = combatStats(context, threat), stats = facts && facts.stats;
        if (!stats) return 0;
        const attack = Number(stats.atk), special = Number(stats.spa);
        if (!isFinite(attack) || attack <= 0) return 0;
        if (isFinite(special) && special > 0) return attack >= special * 1.15 ? 2 : attack > special ? 1 : 0;
        return 1;
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
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || charmWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !charmWants(context, item, target)) return 0;
            const self = source(context), owner = context.facts.owner;
            const physical = ai<boolean>(item, "preferPhysical", true) ? charmPhysical(context, target) : 0;
            if (physical >= 2) return 74;
            if (target.attacking === self.ref || !!owner && target.attacking === owner.ref) return 66;
            return 54 + physical * 6;
        }
    });
}
