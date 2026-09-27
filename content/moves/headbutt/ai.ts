/**
 * 头锤 / headbutt 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 8）格内。它是短冷却的短程压力招，
 * 所以默认随时会出；但对手正处于畏缩时这一记更重，`priority` 会把它抬到前面——伙伴因此会跟着别的招
 * 一起把一个人压在原地。`ai.opening`（默认「随时」）可收成「只压畏缩目标」：只在对手已经被顶懵、
 * 且剩余畏缩窗口盖得住本招起手与靠近时才补这一记，适合配一只有先手控制的伙伴；单独使用时保持「随时」，
 * 否则它没机会出手。
 *
 * 本招是 `kind: "aim"`：手动可以朝任意方向空顶，交给 AI 时仍按上方条件推荐敌人。畏缩只是附加；对免疫控制的
 * 目标（Boss 等）这一记的伤害照常结算，所以它同时是「没别的招时也能用的普通攻击」。
 */
namespace PokemonSkills {
    /** 目标身上共享畏缩身份 tags 的剩余刻数（-1 记为很长；无则 0），供「只压畏缩目标」判断窗口够不够。 */
    CompanionBehavior.registerFact("world_combat:move_headbutt/flinchWindow", function (access: CombatWorld, actor: CombatActor) {
        if (!access.valid(actor)) return 0;
        let best = 0;
        access.mobEffects(actor).forEach(function (effect) {
            if (String(effect.tags()).split(" ").indexOf("world_combat:status/flinch") < 0) return;
            const remaining = effect.duration();
            if (remaining < 0) { best = 1e9; return; }
            if (remaining > best) best = remaining;
        });
        return best;
    });

    /** 从现在到这一记真正顶到目标还需要的刻数（起手 + 走近），窗口短于此就赶不上。 */
    function headbuttWindowCovers(context: WorldBehavior.Context, item: WorldBehavior.Capability,
        target: CompanionBehavior.Entity, distance: number): boolean {
        const remaining = CompanionBehavior.fact<number>(context, "world_combat:move_headbutt/flinchWindow", target) || 0;
        if (remaining >= 1e9) return true;
        const world = CompanionBehavior.world(context);
        let tempo = 5, rush = 1.0;
        try {
            tempo = p("headbutt", "tempo", { world: world, actor: world.source(), detail: { values: item.data.config } });
            rush = Math.max(0.1, p("headbutt", "rush", { world: world, actor: world.source(), detail: { values: item.data.config } }));
        } catch (error) { }
        const reach = typeof item.data.range === "number" ? item.data.range : 2.6;
        const approach = Math.max(0, distance - reach) / rush;
        return remaining >= tempo + approach;
    }

    function headbuttWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
        if (distance > CompanionBehavior.ai<number>(item, "maxChase", 8)) return false;
        var opening = CompanionBehavior.ai<string>(item, "opening", "always");
        if (opening !== "reeling") return true;
        if (!CompanionBehavior.status(context, target, "flinch")) return false;
        // 畏缩窗口要盖得住起手与靠近；盖不住就不追这一口，按普通时机留给共享计划。
        return headbuttWindowCovers(context, item, target, distance);
    }

    CompanionBehavior.registerUse("headbutt", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return headbuttWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !headbuttWants(context, capability, target)) return 0;
            return CompanionBehavior.status(context, target, "flinch") ? 34 : 20;
        }
    });

    addPreferences("headbutt", {}, [
        field(pathOf("driving"), "猛顶式", "boolean", {
            help: "开启：顶得更远、更重、更容易顶懵，但起步稍缓、起手与冷却更久，也更容易顶过头。关闭：短促快顶，出手快、位置稳，威力略低。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动头锤，先走近。越大追得越执着，也越容易扑空后停在对手身后。"
        }),
        field(pathOf("ai.opening"), "起手目标", "choice", {
            options: [
                { value: "always", label: "随时" },
                { value: "reeling", label: "只压畏缩目标" }
            ],
            help: "随时：把它当普通近身招，随时出手。只压畏缩目标：只在对手已经处于畏缩时补这一记（威力更高），适合和先手控制的伙伴配合；单独使用时它几乎不会出手。"
        })
    ]);
}
