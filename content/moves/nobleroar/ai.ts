/**
 * 战吼 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，并且朝它这一吼能罩住至少一个敌人。
 * 什么时候最想出手：锥里能罩住 ai.cluster 个以上敌人时 priority 抬到 72——一次压住一小簇最划算；只罩住一个时 45。
 * 对谁出手：当前威胁；它已经「气短」时跳过，把这一吼留给还没被压的人（ai.skipCowed）。
 * 够不到怎么办：reach 就是锥长，共享任务会先走近到射程内再吼。
 * 放完之后：锥内敌人的物攻与特攻一起下降，伙伴交回共享顺序，让队友去打这段窗口。
 */
namespace CompanionBehavior {
    /** 与参数公式同源的锥长估算，用来判断这一吼能覆盖到哪里；实际判定仍走招式公式。 */
    function nobleroarReach(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const height = self.height === undefined ? 1.4 : self.height;
        const deep = !!(item.data.config && Number(item.data.config.form) === 1);
        return Math.max(3.5, Math.min(9, (4 + height * 1.2) * (deep ? 1.15 : 1)));
    }

    function nobleroarCaught(context: WorldBehavior.Context, target: Entity, reach: number): number {
        const self = source(context);
        const heading = Math.atan2(target.point[2] - self.point[2], target.point[0] - self.point[0]);
        const half = 35 * Math.PI / 180;
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (distance(other.point, self.point) > reach) continue;
            let diff = Math.abs(Math.atan2(other.point[2] - self.point[2], other.point[0] - self.point[0]) - heading);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff <= half) count++;
        }
        return count;
    }

    registerUse("nobleroar", {
        protocols: ["world_combat:control"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target || target.health <= 0 || !target.visible || target.friendly) return false;
            if (ai<boolean>(capability, "skipCowed", true) && status(context, target, "cowed")) return false;
            const self = source(context);
            if (distance(self.point, target.point) > ai<number>(capability, "maxChase", 14)) return false;
            return nobleroarCaught(context, target, nobleroarReach(context, capability)) >= 1;
        },
        accepts: function (_context, _capability, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || target.friendly || target.health <= 0) return 0;
            const caught = nobleroarCaught(context, target, nobleroarReach(context, capability));
            return caught >= ai<number>(capability, "cluster", 2) ? 72 : 45;
        }
    });

    const nobleroarChase = PokemonSkills.number("ai.maxChase", "吼击距离", 4, 28, 1);
    nobleroarChase.help = "威胁进入这个距离内才考虑战吼；越大越早准备，也越可能吼空。";
    const nobleroarCluster = PokemonSkills.number("ai.cluster", "簇优先人数", 1, 4, 1);
    nobleroarCluster.help = "吼击锥里至少罩住这么多敌人时才优先吼；调 1 表示看得见就吼。";
    const nobleroarSkip = PokemonSkills.flag("ai.skipCowed", "跳过已被压住的人");
    nobleroarSkip.help = "开启：锥里的敌人已经「气短」时跳过，把这一吼留给还能被压的人；关闭：照常重复吼。";

    PokemonSkills.addPreferences("nobleroar", { ai: { maxChase: 14, cluster: 2, skipCowed: true } },
        [nobleroarChase, nobleroarCluster, nobleroarSkip]);
}
