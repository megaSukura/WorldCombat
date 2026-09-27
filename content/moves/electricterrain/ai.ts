/**
 * 电气场地 / electricterrain 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：把电场真正会盖到的活体算一笔账——在场内、与落点同层且贴地的己方睡着的人会被电醒（最大的收益），
 * 电属性活体拿到 ×1.3；敌方的睡者被电醒、敌方电属性拿到 ×1.3，都是代价。只有己方净收益大于敌方时才铺，
 * 绝不为了给对手递电场而开。楼上平台、腾空者或墙后者不算在场，不进入这笔账。没有威胁但场内有睡着的队友时，
 * 也把它当救人的机会铺出去（救睡友不依赖威胁）。
 * 出手前的位置：`ai.advance` 关闭（默认）时按在脚下（以脚为锚），先护住自己与身边的睡者；开启时前压到交战区中间。
 * 放完之后把伤害交回共用交战计划；还站在电场上时不再重复。
 */
namespace CompanionBehavior {
    const electricChase = PokemonSkills.number("ai.maxChase", "输电距离", 2, 24, 1);
    electricChase.help = "伙伴只在威胁离自己这么远以内时才考虑电气场地；调小只在贴身时铺，调大愿意提前布置。";
    const electricAdvance = PokemonSkills.flag("ai.advance", "把电场压向对手");
    electricAdvance.help = "开启后把电场按在自己与威胁之间，让交战区带电；关闭则按在脚下先护住自己。";

    PokemonSkills.addPreferences("electricterrain", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [electricChase, electricAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function electricCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "electricterrain") return items[i];
        return null;
    }
    function electricInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        if (!self.grounded) return false;
        const footY = self.point[1] - (typeof self.height === "number" && self.height > 0 ? self.height / 2 : 0.7);
        const foot = WorldCombat.point(self.point[0], footY, self.point[2]);
        const areas = WorldEffects.areas(access, PokemonSkills.electricField);
        for (let i = 0; i < areas.length; i++) if (WorldEffects.surfaceTouches(areas[i], foot, 0, 1)) return true;
        return false;
    }
    /** 这一片电场实际会盖住多大，直接读本招 resolve 出的 fieldRadius；失败时退回中性估计。 */
    function electricRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        try {
            const scope = world(context);
            return Math.max(2.2, Math.min(5.5, PokemonSkills.p("electricterrain", "fieldRadius",
                { world: scope, actor: scope.source(), detail: { values: item.data.config } })));
        } catch (error) { return 3; }
    }
    /** 脚下布场：以脚为锚（不是身体中心），开启 advance 时按同样高度前压到交战区。 */
    function electricAnchorPoint(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): number[] {
        const self = source(context), footY = self.point[1] - (typeof self.height === "number" && self.height > 0 ? self.height / 2 : 0.7);
        if (ai<boolean>(item, "advance", false) && threat) {
            const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
            const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(2, length * 0.4);
            return [self.point[0] + dx / length * step, footY, self.point[2] + dz / length * step];
        }
        return [self.point[0], footY, self.point[2]];
    }
    /** 活体的脚点高度；与落点同层（±1 格）才可能真的被这片电场覆盖。 */
    function electricFoot(subject: Entity): number {
        return subject.point[1] - (typeof subject.height === "number" && subject.height > 0 ? subject.height / 2 : 0.7);
    }
    function electricInLayer(subject: Entity, anchor: number[]): boolean {
        return !!subject.grounded && Math.abs(electricFoot(subject) - anchor[1]) <= 1;
    }
    /** 一个活体站在电场里的收益/代价：睡着被电醒最重，电属性拿到 ×1.3 次之；只有贴地同层才算在场。 */
    function electricValue(context: WorldBehavior.Context, subject: Entity): number {
        if (subject.health <= 0 || !subject.visible || !subject.grounded) return 0;
        let value = status(context, subject, "sleep") ? 3 : 0;
        const facts = pokemonFacts(context, subject);
        if (facts && facts.types && facts.types.indexOf("electric") >= 0) value += 1;
        return value;
    }
    function electricGather(context: WorldBehavior.Context, item: WorldBehavior.Capability, friendly: boolean, threat: Entity | null): number {
        const anchor = electricAnchorPoint(context, item, threat), radius = electricRadius(context, item);
        let total = friendly ? electricValue(context, source(context)) : 0;
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (friendly ? !other.friendly : other.friendly) continue;
            if (distance(other.point, anchor) > radius || !electricInLayer(other, anchor)) continue;
            total += electricValue(context, other);
        }
        return total;
    }
    /** 实际电场里某一方睡着的活体数量（自用／救人的判据）；只数贴地同层者。 */
    function electricSleepingIn(context: WorldBehavior.Context, item: WorldBehavior.Capability, friendly: boolean, threat: Entity | null): number {
        const anchor = electricAnchorPoint(context, item, threat), radius = electricRadius(context, item);
        const self = source(context);
        let count = friendly && self.grounded && status(context, self, "sleep") ? 1 : 0;
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (friendly ? !other.friendly : other.friendly) continue;
            if (other.health <= 0 || !other.visible) continue;
            if (distance(other.point, anchor) > radius || !electricInLayer(other, anchor)) continue;
            if (status(context, other, "sleep")) count++;
        }
        return count;
    }
    function electricWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (context.facts.mounted) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (electricInside(context)) return false;
        const self = source(context), rescue = electricSleepingIn(context, item, true, threat) > 0;
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) {
            // 无威胁：只有场内有睡着的队友才铺，把人电醒。
            return rescue && electricGather(context, item, true, null) > electricGather(context, item, false, null);
        }
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        const friendly = electricGather(context, item, true, threat), enemy = electricGather(context, item, false, threat);
        // 救睡友时只要净收益为正；常规布置不允许把场地白送给对手。
        return rescue ? friendly > enemy : friendly > enemy && enemy === 0;
    }

    registerUse("electricterrain", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item) {
            return electricSleepingIn(context, item, true, context.senses["world_combat:threat"]) > 0 ? 65 : 42;
        },
        available: function (context, item, _purpose, _target) { return electricWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_electricterrain/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            const item = electricCapability(context);
            if (!item || !electricWants(context, item, threat)) return [];
            if (!threat) return [{ id: "world_combat:move_electricterrain:self", kind: "world_combat:move_electricterrain", data: { ref: source(context).ref } }];
            return [{ id: "world_combat:move_electricterrain:" + threat.ref, kind: "world_combat:move_electricterrain", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_electricterrain/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_electricterrain") return [];
            const item = electricCapability(context), self = source(context);
            const threat: Entity | null = goal.data.ref === self.ref ? null : entity(context, goal.data.ref);
            if (!item || !electricWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const copy: Entity = JSON.parse(JSON.stringify(self));
                copy.point = electricAnchorPoint(current, item, threat);
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_electricterrain/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_electricterrain");
    });
}
