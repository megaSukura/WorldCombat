/**
 * 圆瞳 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没有被看软（任何来源的 charmed 身份）、视线畅通。
 * 什么时候最想出手：priority 58 常常抢在普通攻击之前；自己血量低于一半时抬到 74（先压低对方出手保命），
 *   对手正打自己／主人时抬到 66。ai.opening=迎击时只在对方正出手或自己刚受伤时睁眼。
 * 对谁出手：当前威胁；已带 charmed 身份的目标跳过，省下一次。
 * 够不到怎么办：reach 就是这次凝视的距离（按配置与体型估算），超出的先走近；视线被挡时交回共享接近逻辑。
 * 放完之后：目标掉攻击，伙伴交回共享顺序，再决定追击还是趁对方下不去手拉开。
 * 配置：ai.maxChase 限制考虑距离；ai.opening 选择出手时机；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("babydolleyes", { ai: { maxChase: 6, opening: "anytime", leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 2, 14, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "counter"], ["随时", "迎击时"]),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 与参数公式同源的凝视距离估算；实际施放仍走招式自己的 gazeRange。 */
    function babydolleyesReach(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const height = self.height === undefined ? 1.4 : self.height;
        const stare = !!(item.data.config && item.data.config.stare);
        return Math.max(3, Math.min(7, (3.5 + height * 0.8) * (stare ? 1.25 : 1)));
    }

    function babydolleyesWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 6)) return false;
        if (status(context, threat, "charmed")) return false;
        if (!world(context).clear(point(self.point), point(threat.point))) return false;
        if (ai<string>(item, "opening", "anytime") !== "counter") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    registerUse("babydolleyes", {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return babydolleyesReach(context, item); },
        available: function (context, item, _purpose, target) { return !target || babydolleyesWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !babydolleyesWants(context, item, target)) return 0;
            const self = source(context), owner = context.facts.owner;
            if (self.health <= self.maximum * 0.5) return 74;
            if (target.attacking === self.ref || !!owner && target.attacking === owner.ref) return 66;
            return 58;
        }
    });
}
