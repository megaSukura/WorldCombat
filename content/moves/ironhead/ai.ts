/**
 * 铁头 / ironhead 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 6）格内。
 * 贴身解围：`ai.spacing`（默认「贴身推开」）让伙伴只在对手贴到约 2.2 格内时才用这一下，把人轰开。
 *   被击退抗性完全拉住的目标（Boss 等）推不动，所以 `priority` 不把它当成「清场」目标加码；
 *   它的伤害照常结算，仍是一记可用的普通重击，遇到这类目标不再被贴身门槛挡住。
 * 选「随时」就把它当普通重击，够得到就砸。贴得近、且推得动的目标优先——被围住时它最先被选中。
 *
 * 本招是 `kind: "aim"`：手动可以朝任意方向空顶，交给 AI 时仍按上方条件推荐敌人。
 */
namespace PokemonSkills {
    /** 目标的原生击退抗性（0..1）；未知时按 0 处理，与普通生物一致。 */
    CompanionBehavior.registerFact("world_combat:move_ironhead/knockback", function (access, actor) {
        const attribute = access.attributeValue(actor, "minecraft:generic.knockback_resistance");
        return attribute === null ? 0 : attribute.value();
    });

    function ironheadResistance(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_ironhead/knockback", target);
        return typeof value === "number" && isFinite(value) ? value : 0;
    }

    /** 目标是否还能被这一顶推动：抗性拉满（=1）时推不动，伤害照常。 */
    function ironheadCanShove(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return ironheadResistance(context, target) < 1;
    }

    function ironheadWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
        if (distance > CompanionBehavior.ai<number>(item, "maxChase", 6)) return false;
        // 「贴身推开」只对推得动的目标成立：推不动的目标按普通重击处理，不被贴身门槛挡下。
        if (CompanionBehavior.ai<string>(item, "spacing", "close") === "close" && ironheadCanShove(context, target))
            return distance <= 2.2;
        return true;
    }

    CompanionBehavior.registerUse("ironhead", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return ironheadWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !ironheadWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            // 只有推得动、又贴得近的目标才算「解围」优势；免推 Boss 不加分，只按普通攻击排在后面。
            return ironheadCanShove(context, target) && distance <= 2.2 ? 40 : 24;
        }
    });

    addPreferences("ironhead", {}, [
        field(pathOf("braced"), "沉铁式", "boolean", {
            help: "开启：上步更短，但更重、震得更懵、砸得更远，起手与冷却更久。关闭：疾铁式，上步更长、出手更快，单发与击退略收。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动铁头，先走近。它射程短，设大也常常够不到。"
        }),
        field(pathOf("ai.spacing"), "出手时机", "choice", {
            options: [
                { value: "close", label: "贴身推开" },
                { value: "always", label: "随时" }
            ],
            help: "贴身推开：只在推得动的对手贴到约 2.2 格内时才用，专把人轰开解围；击退抗性拉满、推不动的目标仍会当普通重击出手。随时：把它当普通重击，够得到就砸，更常主动冲上去。"
        })
    ]);
}
