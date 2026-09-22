/**
 * 勇鸟猛攻 / bravebird 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。这一招的价值在“线”——
 * 开启 `ai.preferLine`（默认开）时，如果目标身后（或身前）的走廊里还站着第二个敌人，就把它排到最前，
 * 一次俯冲串起一串；没有第二个人时按普通候选排。距离过近（贴着身）时排得靠后：俯冲需要一点起跳空间。
 * 够不到交给共享接近逻辑。
 * 放完之后：俯冲把人留在自己身后，如果最近威胁贴得太近就先拉开一点，再准备下一次俯冲。
 */
namespace PokemonSkills {
    /** 俯冲走廊的半宽（格）：第二个敌人离“自己→目标”这条线这么近才算串得上。 */
    const BRAVEBIRD_CORRIDOR = 1.7;

    function bravebirdValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 目标身后那条走廊里还站着几个没被打过的敌人。 */
    function bravebirdInline(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.5) return 0;
        const ux = dx / length, uz = dz / length;
        const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref || other.ref === self.ref) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz;
            if (along <= 0.5) continue;
            const perpendicular = Math.abs(ox * uz - oz * ux);
            if (perpendicular <= BRAVEBIRD_CORRIDOR && along <= length + 1.5) count++;
        }
        return count;
    }

    function bravebirdAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        if (!progress.repositionUntil) progress.repositionUntil = context.tick + 30;
        if (context.tick > progress.repositionUntil) return;
        const threat = CompanionBehavior.goalEntity(context);
        if (!threat || threat.health <= 0) return;
        const self = CompanionBehavior.source(context);
        const gap = CompanionBehavior.distance(self.point, threat.point);
        if (gap >= 3) return;
        const away = [self.point[0] + (self.point[0] - threat.point[0]), self.point[1], self.point[2] + (self.point[2] - threat.point[2])];
        const navigation = CompanionBehavior.navigate(context, away, 2);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse("bravebird", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!bravebirdValid(target)) return false;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            return gap >= 1.0 && gap <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) { return bravebirdValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let score = gap < 1.6 ? 14 : 26;
            if (CompanionBehavior.ai<boolean>(capability, "preferLine", true) && bravebirdInline(context, target) >= 1) score += 22;
            return score;
        },
        after: function (context, capability, target, progress) { return bravebirdAfter(context, progress); }
    });

    addPreferences("bravebird", {}, [
        field(pathOf("high"), "高掠式", "boolean", {
            help: "开启：起跳更高、俯冲更重更远，但反伤更重、起手与冷却更久——用更长的准备换更重的一击。关闭（低掠式）：贴地掠过，更快更安全，威力与射程收一档。"
        }),
        field(pathOf("ai.maxChase"), "俯冲距离", "number", {
            min: 2, max: 22, step: 1,
            help: "对手离自己这么远以内才起飞俯冲；调小只打近处，调大愿意从更远处助跑。"
        }),
        field(pathOf("ai.preferLine"), "优先串人", "boolean", {
            help: "开启：目标身后那条走廊里还有别的敌人时优先俯冲，一次串起一串；关闭：只按威胁本身排序。"
        })
    ]);
}
