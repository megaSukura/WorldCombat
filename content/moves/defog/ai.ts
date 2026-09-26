/**
 * 清除浓雾 / defog 的伙伴 AI 用途：这是这招自己的一套出手计划——先解实际遮蔽与危险场，再考虑群体开防。
 *
 * 什么局面有意义：
 *   1) 自己或近处友方正被烟幕罩着，或本招真实风圈里确实有可清的烟障／陷阱——这时立刻起风，不需要先看见敌人；
 *   2) 有可见威胁、已在真实风圈之内，并且圈里有人带着屏障、正贴身纠缠，或至少站着 ai.minFoes 个人。
 * 对谁出手：自己；风圈以自身为圆心罩住一圈，屏障与降级都发生在圈内。
 * 够不到怎么办：reach 就是清扫半径；圈外先走近再起风（这里是降级用途才需要看见敌人）。
 * 放完之后：圈里的对手丢掉屏障、门户大开，伙伴交回共享顺序继续交战。
 * 半径取本招当前的实际清扫参数（含「烈风」），够不到的不算，不拿 ai.maxChase 当清扫范围。
 */
namespace CompanionBehavior {
    const defogTags = () => [WorldEffects.categories.haze, WorldEffects.categories.screen, WorldEffects.categories.hazard];

    /** 本招当前实际清扫半径：用行动携带的偏好配置求值，和真正施放时一致。 */
    function defogSweep(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(4, PokemonSkills.p("defog", "sweep", { world: world, actor: world.source(), detail: { values: capability.data.config } }));
        } catch (error) {
            return capability.data.range;
        }
    }

    /** 只读、决策内缓存：真实风圈里可被这一扫清掉的场地数量（高度落带、墙挡不算）。 */
    CompanionBehavior.registerFact("world_combat:move_defog/fields", function (access, actor, argument) {
        const body = access.observe(actor);
        if (body === null) return 0;
        const centre = body.position(), radius = typeof argument === "number" && isFinite(argument) ? argument : 6;
        let count = 0;
        const tags = defogTags();
        for (let t = 0; t < tags.length; t++) {
            const areas = WorldEffects.areasWithTag(access, tags[t], centre, radius);
            for (let i = 0; i < areas.length; i++) {
                const at = WorldCombat.point(areas[i].position[0], areas[i].position[1], areas[i].position[2]);
                if (at.y() < centre.y() - 3 || at.y() > centre.y() + 4) continue;
                if (at.minus(centre).length() > radius + areas[i].radius) continue;
                if (!access.clear(centre, at)) continue;
                count++;
            }
        }
        return count;
    });

    function defogFieldCount(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const count = CompanionBehavior.fact<number>(context, "world_combat:move_defog/fields",
            CompanionBehavior.source(context), defogSweep(context, capability));
        return typeof count === "number" ? count : 0;
    }

    /** 自己或近处友方是否正被烟幕罩着——这时不必看见敌人也该散烟。 */
    function defogHazed(context: WorldBehavior.Context, radius: number): boolean {
        const self = source(context);
        if (status(context, self, "smoked")) return true;
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0 || other.ref === self.ref) continue;
            if (distance(other.point, self.point) > radius) continue;
            if (status(context, other, "smoked")) return true;
        }
        return false;
    }

    /** 清扫半径内看得见的非友方数量。 */
    function defogCrowd(context: WorldBehavior.Context, self: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) <= radius) count++;
        }
        return count;
    }

    /** 圈里有多少对手正带着屏障（任一共享身份）。 */
    function defogScreens(context: WorldBehavior.Context, self: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) > radius) continue;
            if (status(context, other, "reflect") || status(context, other, "lightscreen")
                || status(context, other, "auroraveil") || status(context, other, "mist")
                || status(context, other, "safeguard")) count++;
        }
        return count;
    }

    /** 当前威胁身上是否带着屏障（任一共享身份）。 */
    function defogScreenOn(context: WorldBehavior.Context, threat: Entity): boolean {
        return status(context, threat, "reflect") || status(context, threat, "lightscreen")
            || status(context, threat, "auroraveil") || status(context, threat, "mist")
            || status(context, threat, "safeguard");
    }

    /** 这个对手正盯着自己、或自己刚挨过它的打——贴身这一圈就值得起。未挨打过的个体 lastAttacker 为空。 */
    function defogEngaged(context: WorldBehavior.Context, threat: Entity): boolean {
        const self = source(context);
        return threat.attacking === self.ref || !!self.lastAttacker && self.hurtAgo < 60;
    }

    /** 目标的能力等级已经被压得够低时，纯降级用途的收益下降。 */
    function defogAlreadyLow(context: WorldBehavior.Context, threat: Entity): boolean {
        const stages = CompanionBehavior.stages(context, threat);
        return (stages.evasion || 0) <= -3 && (stages.def || 0) <= -3;
    }

    function defogWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", true)) return false;
        const reach = defogSweep(context, item) + 1.0;
        // 先解实际遮蔽/危险场：即使当前看不见敌人，也主动散烟、清陷阱。
        if (defogHazed(context, reach) || defogFieldCount(context, item) > 0) return true;
        if (!threat || threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        if (distance(self.point, threat.point) > reach) return false;
        if (defogScreenOn(context, threat)) return true;
        if (defogEngaged(context, threat)) return true;
        return defogCrowd(context, self, reach) >= ai<number>(item, "minFoes", 2);
    }

    registerUse("defog", {
        protocols: ["world_combat:fortify", "world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            const self = source(context);
            const threat = (target && target.ref !== self.ref ? target : null) || context.senses["world_combat:threat"] || null;
            return defogWants(context, item, threat as Entity | null);
        },
        accepts: function (context, _item, target) {
            const self = source(context);
            return target.ref === self.ref || (!target.friendly && target.health > 0 && target.visible);
        },
        approachTarget: function (context, _item, target) { return target || source(context); },
        priority: function (context, item, target) {
            const self = source(context);
            if (context.facts.mounted) return 0;
            const reach = defogSweep(context, item) + 1.0;
            const fields = defogFieldCount(context, item);
            if (fields > 0) return Math.min(120, 106 + Math.min(8, fields * 2));
            if (defogHazed(context, reach)) return 104;
            const threat = (target && target.ref !== self.ref ? target : null) || context.senses["world_combat:threat"] || null;
            if (!threat || !defogWants(context, item, threat as Entity)) return 0;
            if (defogAlreadyLow(context, threat) && !defogScreenOn(context, threat)) return 0;
            const screens = defogScreenOn(context, threat) ? 1 : defogScreens(context, self, reach);
            if (screens > 0) return Math.min(100, 92 + screens * 4);
            if (defogEngaged(context, threat)) return 62;
            return Math.min(70, 46 + (defogCrowd(context, self, reach) - 2) * 6);
        }
    });

    PokemonSkills.addPreferences("defog", { ai: { maxChase: 10, minFoes: 2, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "清扫最少人数", 1, 4, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
