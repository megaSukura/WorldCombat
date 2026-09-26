/**
 * 刺耳声 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，并且朝它这一嗓子至少扫得到一个敌人。
 *   刺耳声走一条又细又长的走廊——站成一线的人越多越值，所以真正决定优先级的是走廊里的人数。
 *   走廊长宽直接复用这一嗓子 resolve 出来的实际 reach 与参数 lane，不再另写一份近似。
 *   声音不需要通视，隔着墙也能扫到，所以接近途中不会被掩体打断。
 * 什么时候最想出手：走廊里罩住 ai.cluster（默认 2）个以上敌人时 priority 抬到 70；只罩住一个时 46；
 *   已经有物理队友在集火这个方向时再 +6。
 * 对谁出手：当前威胁；已经「耳鸣」的目标不会被硬跳过，但会按 ai.avoidDeafened 降一段优先级。
 * 够不到怎么办：reach 就是声浪长度，共享任务会先把身位收进走廊再吼。
 * 放完之后：走廊里的敌人物防一起下降；伙伴交回共享顺序，让队友去打这段窗口。
 */
namespace CompanionBehavior {
    /** 直接读这一嗓子本身的走廊半宽（参数 lane，含个体与配置），失败时退回一个中性估计。 */
    function screechLane(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        try {
            const scope = world(context);
            return Math.max(0.5, Math.min(2.4, PokemonSkills.p(PokemonSkills.screechId, "lane",
                { world: scope, actor: scope.source(), detail: { values: item.data.config } })));
        } catch (error) {
            return 1.0;
        }
    }

    /** 朝目标方向这条走廊里，罩得住几个可见的敌人；reach 与 lane 都来自招式本身。 */
    function screechCaught(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): number {
        const self = source(context), reach = item.data.range, lane = screechLane(context, item);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-6) return 1;
        const ux = dx / length, uz = dz / length;
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz;
            if (along < 0 || along > reach) continue;
            const perp = Math.abs(-ox * uz + oz * ux);
            if (perp > lane) continue;
            count++;
        }
        return count;
    }

    /** 这条走廊方向上是否有物理队友正在集火目标；有就值得把这一嗓子投过去。 */
    function screechAllyFocus(context: WorldBehavior.Context, target: Entity): boolean {
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.attacking === target.ref) return true;
        }
        return false;
    }

    function screechWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        return screechCaught(context, item, threat) >= 1;
    }

    registerUse("screech", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || screechWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !screechWants(context, item, target)) return 0;
            let value = screechCaught(context, item, target) >= ai<number>(item, "cluster", 2) ? 70 : 46;
            if (screechAllyFocus(context, target)) value += 6;
            if (ai<boolean>(item, "avoidDeafened", true) && status(context, target, "deafened")) value -= 30;
            return Math.max(0, value);
        }
    });

    PokemonSkills.addPreferences("screech", { ai: { maxChase: 10, cluster: 2, avoidDeafened: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "吼击距离", 4, 24, 1),
        PokemonSkills.number("ai.cluster", "一线优先人数", 1, 4, 1),
        PokemonSkills.flag("ai.avoidDeafened", "避开已经耳鸣的人"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
