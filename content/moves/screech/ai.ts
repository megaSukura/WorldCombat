/**
 * 刺耳声 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，并且朝它这一嗓子至少罩得住一个敌人。
 *   刺耳声走一条又细又长的走廊——站成一线的人越多越值，所以真正决定优先级的是走廊里的人数。
 *   声音不需要通视，隔着墙也能扎到，所以接近途中不会被掩体打断。
 * 什么时候最想出手：走廊里罩住 ai.cluster（默认 2）个以上敌人时 priority 抬到 70；只罩住一个时 46。
 * 对谁出手：当前威胁；已经「耳鸣」的目标跳过，把这一嗓子留给还没被压的人（ai.skipDeafened）。
 * 够不到怎么办：reach 就是声浪长度，共享任务会先把身位收进走廊再吼。
 * 放完之后：走廊里的敌人物防一起下降；伙伴交回共享顺序，让队友去打这段窗口。
 */
namespace CompanionBehavior {
    /** 与参数公式同源的声浪长度估算，用来判断这一嗓子能覆盖到多远；实际判定仍走招式公式。 */
    function screechReach(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const height = self.height === undefined ? 1.4 : self.height;
        const shrill = !!(item.data.config && item.data.config.shrill);
        return Math.max(4, Math.min(12, (5 + height * 1.0) * (shrill ? 0.8 : 1)));
    }

    /** 朝目标方向这条走廊里，罩得住几个可见的敌人；走廊半宽取一个保守的固定估计。 */
    function screechCaught(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): number {
        const self = source(context), reach = screechReach(context, item);
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
            if (perp > 1.0) continue;
            count++;
        }
        return count;
    }

    function screechWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        if (ai<boolean>(item, "skipDeafened", true) && status(context, threat, "deafened")) return false;
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
            return screechCaught(context, item, target) >= ai<number>(item, "cluster", 2) ? 70 : 46;
        }
    });

    PokemonSkills.addPreferences("screech", { ai: { maxChase: 10, cluster: 2, skipDeafened: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "吼击距离", 4, 24, 1),
        PokemonSkills.number("ai.cluster", "一线优先人数", 1, 4, 1),
        PokemonSkills.flag("ai.skipDeafened", "跳过已经耳鸣的人"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
