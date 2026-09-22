/**
 * 挑衅 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享控制位的随手一放。
 *
 * 什么局面有意义：有可见威胁、目标还没被挑衅、它在 ai.maxChase 以内，而且要有一条通视直线——
 *   这句话喊不进墙后。ai.opening=正在出手时（默认）只在目标正攻击自己或主人、或自己刚被打过时喊；
 *   =随时时见威胁就喊，当纯扰动手段。
 * 对谁出手：当前威胁；带着共享身份 taunt 的目标会被跳过，不重复喊。
 * 候选之间怎么排：正在蓄势（没在攻击你）的目标优先——挑衅本来就是压住它的准备动作；
 *   已经在挥拳的目标排在后面。priority 仍为 0 时可由共享顺序兜底选中。
 * 够不到怎么办：reach 就是本招射程（由特攻与体型决定），accepts 不按距离硬拒；伙伴先走近到能通视的射程再喊。
 * 放完之后：目标只能伤害招，after 让小身板后退开一步，别停在被点着的敌人刀口上。
 * 配置 manner（讥讽／怒斥）改变射程与怒火时长；ai.maxChase、ai.opening 决定追多远、什么时候喊。
 */
namespace PokemonSkills {
    function tauntWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, tauntStatus)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        const focus = item.data.config && item.data.config.manner === "goad";
        const ceiling = CompanionBehavior.ai<number>(item, "maxChase", 14) * (focus ? 1.15 : 1);
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > ceiling) return false;
        if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
        if (CompanionBehavior.ai<string>(item, "opening", "opening") !== "opening") return true;
        const owner = context.facts.owner;
        return target.attacking === self.ref || !!owner && target.attacking === owner.ref || self.hurtAgo < 40;
    }
    function tauntApproach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number[] | null {
        const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const here = CompanionBehavior.point(self.point), there = CompanionBehavior.point(target.point);
        if (access.clear(here, there)) return null;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2], length = Math.sqrt(dx * dx + dz * dz) || 1;
        const px = -dz / length, pz = dx / length;
        const options = [
            [self.point[0] + px * 3, self.point[1], self.point[2] + pz * 3],
            [self.point[0] - px * 3, self.point[1], self.point[2] - pz * 3]
        ];
        for (let i = 0; i < options.length; i++) if (access.clear(CompanionBehavior.point(options[i]), there)) return options[i];
        return null;
    }
    function tauntAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        if (!progress.backUntil) progress.backUntil = context.tick + 12;
        if (context.tick > progress.backUntil) return;
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let threat: CompanionBehavior.Entity | null = null, best = 1e9;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            const gap = CompanionBehavior.distance(other.point, self.point);
            if (gap < best) { best = gap; threat = other; }
        }
        if (threat === null || best > 5) return;
        const away = [self.point[0] * 2 - threat.point[0], self.point[1], self.point[2] * 2 - threat.point[2]];
        const navigation = CompanionBehavior.navigate(context, away, 1.5);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse(tauntId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : tauntWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null || !tauntWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            return target.attacking === self.ref ? 45 : 62;
        },
        approach: function (context, _item, target) { return tauntApproach(context, target); },
        after: function (context, _item, _target, progress) { return tauntAfter(context, progress); }
    });

    addPreferences(tauntId, { ai: { maxChase: 14, opening: "opening", leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑挑衅；调小只在贴身时喊，调大愿意追出去点着它。" }),
        choice("ai.opening", "出手时机", ["opening", "anytime"], ["喊正在出手的敌人", "随时"]),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);

    function tauntCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = CompanionBehavior.ready(context, "world_combat:control");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === tauntId) return items[i];
        return null;
    }
    CompanionBehavior.registry.goal({ id: "world_combat:move_taunt/goal", propose: function (context) {
        if (context.facts.intent === "hold") return [];
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
        if (!threat) return [];
        const item = tauntCapability(context);
        if (!item || !tauntWants(context, item, threat)) return [];
        if (CompanionBehavior.recent(context, "control", threat.ref, 120)) return [];
        return [{ id: "world_combat:move_taunt:" + threat.ref, kind: "world_combat:move_taunt", data: { ref: threat.ref } }];
    } });
    CompanionBehavior.registry.method({ id: "world_combat:move_taunt/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_taunt") return [];
            const item = tauntCapability(context), threat = CompanionBehavior.entity(context, goal.data.ref);
            if (!item || !threat || !tauntWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return CompanionBehavior.castNode(choice.offer.capabilities![0].id, "control",
                function (current) { return CompanionBehavior.entity(current, current.choice!.goal.data.ref); });
        }
    });
    CompanionBehavior.orderGoals("world_combat:move_taunt/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_taunt");
    });
}
