/**
 * 蓄能焰袭 / flamecharge 的伙伴 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标、且在 `ai.maxChase` 之内时列入候选（更远先交给共享接近逻辑）。
 * 这招的价值在动量：站到出手距离后，`ai.preferClusters` 开启且配置了贯穿时，目标身后还串着第二个敌人就把它排到前面——
 * 一发沿直线点着一条线；代价是单体略轻、冷却更长，也可能为了串人而扎进敌阵。关闭则只按威胁本身选目标。
 * 速度已经顶到上限、又只有一个目标时不再为了提速出手，把位置让给更合适的伤害招。
 * 放完之后：只有真正提高了速度（当前速度等级 > 0）才顺势压上；仍守共享的驻守/撤退命令，不强行改道。
 */
namespace PokemonSkills {
    /** 贯穿线的横宽上限（格）：约等于火焰判定半径的最大值，避免把远在冲锋线外的目标算进收益。 */
    const FLAMECHARGE_LINE_HALF_WIDTH = 1.0;

    function flamechargePierce(capability: WorldBehavior.Capability): boolean {
        return !!(capability.data.config && capability.data.config.pierce);
    }

    /** 目标身后同一条冲锋线上还站着几个没被打过的敌人（只在贯穿且开启串人时参与评分）。 */
    function flamechargeInline(context: WorldBehavior.Context, target: CompanionBehavior.Entity, reach: number): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dz * dz);
        if (span < 0.01) return 1;
        const ux = dx / span, uz = dz / span;
        let inline = 1;
        const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === target.ref || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz, across = Math.abs(ox * uz - oz * ux);
            // 只有真正落在本次冲锋行程（reach）内、又贴着这条线横宽的目标才算串得上。
            if (along <= 0.5 || along > reach || across > FLAMECHARGE_LINE_HALF_WIDTH) continue;
            inline++;
        }
        return inline;
    }

    function flamechargeAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        // 守共享命令：站定/驻守时不主动压上。
        if (context.facts.intent === "stay") return;
        const self = CompanionBehavior.source(context);
        // 只有真正还挂着提速才趁势追；没提速（被上限拒绝或未命中）就交回共享计划。
        if (CompanionBehavior.stage(context, self, "spe") <= 0) return;
        if (!progress.chaseUntil) progress.chaseUntil = context.tick + 30;
        if (context.tick > progress.chaseUntil) return;
        const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
        if (!threat || threat.health <= 0) return;
        if (CompanionBehavior.distance(self.point, threat.point) <= 3) return;
        const navigation = CompanionBehavior.navigate(context, threat.point, 2);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse("flamecharge", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let score = 22;
            // 贯穿走直线：只有真正排在目标身后、且在本次冲锋行程内的人，才值得为这一穿多给分。
            const inline = flamechargeInline(context, target, capability.data.range);
            if (flamechargePierce(capability) && CompanionBehavior.ai<boolean>(capability, "preferClusters", true) && inline >= 2) {
                score += 18;
            }
            // 速度已满又没有第二条线可穿时，提速没有收益，让位给更合适的伤害招。
            if (CompanionBehavior.stage(context, self, "spe") >= 6 && inline < 2) return 0;
            return score;
        },
        after: function (context, capability, target, progress) { return flamechargeAfter(context, progress); }
    });

    addPreferences("flamecharge", {}, [
        field(pathOf("pierce"), "贯穿", "boolean", {
            help: "开启：撞穿第一个目标并沿直线把后面的人一起点着（后续目标吃贯穿占比），但单体略轻、冷却更长；关闭：在第一个目标身上停下，单体更重更快。"
        }),
        field(pathOf("ai.maxChase"), "冲锋距离", "number", {
            min: 2, max: 20, step: 1,
            help: "对手离自己这么远以内才起冲；调小只贴脸冲，调大愿意从更远处助跑。"
        }),
        field(pathOf("ai.preferClusters"), "优先串人", "boolean", {
            help: "开启：配置了贯穿且目标身后还串着别人时优先冲锋；关闭：只按威胁本身选目标。仅在贯穿开启时有意义。"
        })
    ]);
}
