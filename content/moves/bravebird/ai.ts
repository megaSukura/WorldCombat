/**
 * 勇鸟猛攻 / bravebird 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。这一招的价值在“线”——
 * 开启 `ai.preferLine`（默认开）时，如果目标身后（或身前）的走廊里还站着第二个敌人，且自身到它、
 * 自身到目标都通视（无墙遮挡），就把它排到最前，一次俯冲串起一串；没有第二个人时按普通候选排。
 * 串人会按命中人数反复反震，自身生命偏低时不再为多串一个人多付血；自身到目标被墙挡住时也降低倾向。
 * 距离过近（贴着身）时排得靠后：俯冲需要一点起跳空间。
 * 高掠式需要更高的起跳空间，头顶被压住时用原生空域探针把它降优先，避免虚假升高。
 * 够不到交给共享接近逻辑。
 * 放完之后：俯冲把人留在自己身后，如果最近威胁贴得太近就先拉开一点，再准备下一次俯冲。
 */
namespace PokemonSkills {
    /** 俯冲走廊的半宽（格）：第二个敌人离“自己→目标”这条线这么近才算串得上。 */
    const BRAVEBIRD_CORRIDOR = 1.7;

    function bravebirdValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 头顶是否还有升空空间；没有原生探针时不做惩罚。 */
    function bravebirdCanRise(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        if (!LivingActions.hasFreeSpace(world)) return true;
        const point = CompanionBehavior.point([self.point[0], self.point[1] + 1.8, self.point[2]]);
        return LivingActions.freeSpace(world, point, Math.max(0.5, (self.width || 0.8) * 0.8), Math.max(0.8, (self.height || 1.4) * 0.8));
    }

    /** 目标身后那条走廊里还站着几个真能被俯冲线串到、且与自身之间通视（无墙遮挡）的敌人。 */
    function bravebirdInline(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.5) return 0;
        // 起飞后要沿自身→目标这条线俯冲；起点到目标被墙挡住时串不了线。
        if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return 0;
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
            if (perpendicular > BRAVEBIRD_CORRIDOR || along > length + 1.5) continue;
            // 真实斜线判定：这一体与自身之间也要通视，隔墙的第二个身体不算串得上。
            if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(other.point))) continue;
            count++;
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
            const inline = bravebirdInline(context, target);
            if (CompanionBehavior.ai<boolean>(capability, "preferLine", true) && inline >= 1) score += 22;
            // 反震生命预算：串人会按命中人数反复反震，已受伤时不愿为多串一个人多付这份血。
            if (inline >= 1 && CompanionBehavior.ratio(self) < 0.45) score -= 10;
            // 真实踢路：自身到目标被墙挡住时这一趟打不到，降低倾向。
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) score -= 8;
            if (capability.data.config && capability.data.config.high === true && !bravebirdCanRise(context)) score -= 12;
            return Math.max(1, score);
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
