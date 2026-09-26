/**
 * 战吼 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，并且朝它这一吼能罩住至少一个敌人。
 * 什么时候最想出手：按真正的锥形（与参数公式同源的锥长与张角）数出罩住几个；达到 ai.cluster 时抬到 72，
 *   若罩住的人里既有偏物攻的也有偏特攻的（这一吼同时压两项，混合输出最划算）再抬到 78；只罩住一个时 45。
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

    /** 与参数公式同源的锥形张角估算（忽略体重这一小项）；怒吼铺得开、低吼收得窄。 */
    function nobleroarArc(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const height = self.height === undefined ? 1.4 : self.height;
        const deep = !!(item.data.config && Number(item.data.config.form) === 1);
        return Math.max(35, Math.min(150, (65 + height * 10) * (deep ? 0.62 : 1.35)));
    }

    /** 罩在真实锥形里的非友方，用来给出手排序；方向和锥角都按公式算出的实际值。 */
    function nobleroarCatch(context: WorldBehavior.Context, target: Entity, reach: number, arc: number): Entity[] {
        const self = source(context);
        const heading = Math.atan2(target.point[2] - self.point[2], target.point[0] - self.point[0]);
        const half = (arc * Math.PI / 180) / 2;
        const nearby = context.facts.nearby as Entity[], caught: Entity[] = [];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (distance(other.point, self.point) > reach) continue;
            let diff = Math.abs(Math.atan2(other.point[2] - self.point[2], other.point[0] - self.point[0]) - heading);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff <= half) caught.push(other);
        }
        return caught;
    }

    /** 这一吼同时压物攻与特攻；罩住的人里物理、特殊都有时最划算。用共享只读探针读取对手六维。 */
    function nobleroarMixed(context: WorldBehavior.Context, caught: Entity[]): boolean {
        let physical = false, special = false;
        for (let i = 0; i < caught.length; i++) {
            const facts = combatStats(context, caught[i]), stats = facts && facts.stats;
            if (!stats) continue;
            const atk = Number(stats.atk || 0), spa = Number(stats.spa || 0);
            if (!isFinite(atk) || !isFinite(spa)) continue;
            if (atk > spa * 1.15) physical = true;
            else if (spa > atk * 1.15) special = true;
            if (physical && special) return true;
        }
        return false;
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
            return nobleroarCatch(context, target, nobleroarReach(context, capability), nobleroarArc(context, capability)).length >= 1;
        },
        accepts: function (_context, _capability, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || target.friendly || target.health <= 0) return 0;
            const caught = nobleroarCatch(context, target, nobleroarReach(context, capability), nobleroarArc(context, capability));
            if (caught.length < ai<number>(capability, "cluster", 2)) return 45;
            return nobleroarMixed(context, caught) ? 78 : 72;
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
