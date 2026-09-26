/**
 * 天使之吻 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享控制位的随手一放。
 *
 * 什么局面有意义：有可见威胁、目标还没被混乱缠上，而且伙伴已经贴到能用亲吻距离够到的位置——
 *   这是一招纯近身事：够不到就亲空，所以伙伴会先走到近身再送吻。
 * 对谁出手：当前威胁；带着共享身份 confusion 的目标会被跳过，不重复亲。
 * 够不到怎么办：reach 读取当前亲吻距离（由体型决定），伙伴会先走到对方脸前；接近时默认走直线。
 * 放完之后：对方出手可能作废、打中还会自伤；after 让它亲完后退开一步，别停在心猿意马的敌人刀口上。
 * 配置 kiss（轻吻／深吻）改变混乱时长与起手；ai.maxChase 决定追到多近才考虑，ai.opening 决定时机。
 */
namespace PokemonSkills {
    function sweetkissWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "confusion")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.ai<string>(item, "opening", "anytime") === "bitten" && self.hurtAgo >= 60) return false;
        return context.facts.focus === target.ref
            || CompanionBehavior.distance(self.point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }
    function sweetkissAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        if (!progress.backUntil) progress.backUntil = context.tick + 10;
        if (context.tick > progress.backUntil) return;
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let threat: CompanionBehavior.Entity | null = null, best = 1e9;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            const gap = CompanionBehavior.distance(other.point, self.point);
            if (gap < best) { best = gap; threat = other; }
        }
        if (threat === null || best > 3.5) return;
        const away = [self.point[0] * 2 - threat.point[0], self.point[1], self.point[2] * 2 - threat.point[2]];
        const navigation = CompanionBehavior.navigate(context, away, 1.4);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse("sweetkiss", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : sweetkissWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            return target && sweetkissWants(context, item, target) ? 65 : 0;
        },
        after: function (context, _item, _target, progress) { return sweetkissAfter(context, progress); }
    });

    addPreferences(sweetkissId, { ai: { maxChase: 8, opening: "anytime", leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 2, max: 16, step: 1,
            help: "威胁进入这个距离内才考虑送吻；越大越早贴上去，也越可能被反打。" }),
        choice("ai.opening", "出手时机", ["anytime", "bitten"], ["随时", "挨打后"]),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);

    function sweetkissCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = CompanionBehavior.ready(context, "world_combat:control");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "sweetkiss") return items[i];
        return null;
    }
    CompanionBehavior.registry.goal({ id: "world_combat:move_sweetkiss/goal", propose: function (context) {
        if (context.facts.intent === "hold") return [];
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
        if (!threat) return [];
        const item = sweetkissCapability(context);
        if (!item || !sweetkissWants(context, item, threat)) return [];
        if (CompanionBehavior.recent(context, "control", threat.ref, 120)) return [];
        return [{ id: "world_combat:move_sweetkiss:" + threat.ref, kind: "world_combat:move_sweetkiss", data: { ref: threat.ref } }];
    } });
    CompanionBehavior.registry.method({ id: "world_combat:move_sweetkiss/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_sweetkiss") return [];
            const item = sweetkissCapability(context), threat = CompanionBehavior.entity(context, goal.data.ref);
            if (!item || !threat || !sweetkissWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return CompanionBehavior.castNode(choice.offer.capabilities![0].id, "control",
                function (current) { return CompanionBehavior.entity(current, current.choice!.goal.data.ref); });
        }
    });
    CompanionBehavior.orderGoals("world_combat:move_sweetkiss/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_sweetkiss");
    });
}
