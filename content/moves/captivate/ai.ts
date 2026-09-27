/**
 * 诱惑 的伙伴 AI 用途：这招自己的出手计划——要不要用一条持续视线换掉自己的一段出手权。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没被迷住、也没到 −6 特攻底线、回眸要视线通畅。
 * 对谁出手：当前威胁；优先挑特攻明显高于物攻的目标（`ai.preferSpecial`，默认开），把这道目光留给真正的法系输出。
 *   目标已被迷住、或特攻已经到底线的跳过，不重复。
 * 出手时机：队友正在打同一个高特殊威胁时最值得（维持期间帮手能放大这份削弱）；独自作战只在迎击、
 *   刚被打过或需要拖住危险窗口时才用——用 ai.opening 与优先级把机会让给更直接的进攻，不无限霸占攻击计划。
 * 够不到怎么办：reach 就是凝视距离，超出先走近；视线被掩体挡住时交回共享接近逻辑。
 * 放完之后：目标在窗口里持续掉特攻，术者若改用其他动作、被打断或目标脱离视线则立即收回；伙伴随即交回共享顺序。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("captivate", { ai: { maxChase: 10, opening: "anytime", preferSpecial: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "targeting"], ["随时", "迎击时"]),
        PokemonSkills.flag("ai.preferSpecial", "优先法系威胁"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 法系倾向：特攻相对物攻越高越值得迷；2 明显法系、1 偏法系、0 物系或未知。 */
    function captivateSpecial(context: WorldBehavior.Context, target: Entity): number {
        const facts = combatStats(context, target), stats = facts && facts.stats;
        if (!stats) return 0;
        const special = Number(stats.spa), attack = Number(stats.atk);
        if (!isFinite(special) || special <= 0) return 0;
        if (isFinite(attack) && attack > 0) return special >= attack * 1.15 ? 2 : special > attack ? 1 : 0;
        return 1;
    }

    /** 是否有队友正在攻击这个目标；有的话这道削弱能立刻被队友放大，维持更值得。 */
    function captivateSupported(context: WorldBehavior.Context, threat: Entity): boolean {
        const nearby = context.facts.nearby as Entity[], self = source(context);
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.ref === self.ref || other.health <= 0) continue;
            if (other.attacking === threat.ref) return true;
        }
        return false;
    }

    function captivateWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        if (status(context, threat, "captivated")) return false;
        if (stage(context, threat, "spa") <= -6) return false;
        if (!world(context).clear(point(self.point), point(threat.point))) return false;
        if (ai<string>(item, "opening", "anytime") !== "targeting") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    registerUse("captivate", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || captivateWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !captivateWants(context, item, target)) return 0;
            const special = ai<boolean>(item, "preferSpecial", true) ? captivateSpecial(context, target) : 1;
            let value = 38 + special * 9;
            if (captivateSupported(context, target)) value += 12;
            if (!special) value = Math.min(value, 30);
            return Math.min(88, value);
        }
    });
}
