/**
 * 冲岩 / accelerock 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 8）格内。它是全族最重的先制冲撞，
 *   愿意在略外侧起手、一口气撞过去；更远交给共享接近逻辑走过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 优先次序：射程内基础 18；目标矛头正对着自己（即将打到身上）+6，抢在它前面撞上去；
 *   残血且 `ai.finish`（默认开）+14，用这一下把残血撞飞。
 * 破阵式：只对**明确排线**的场面才值得开——`breakthrough` 开启时，目标身后还排着别人 +12，
 *   前面只有一个孤立的敌人则 −8（改为普通式的重击更划算）。关闭时按普通式排序，排线多给 +4。
 * 够不到怎么办：射程由 `charge` 决定，共享任务把身位收进冲刺距离后再撞。
 * 放完之后：目标被顶开、落点扬尘；交回共享交战计划，破阵式一次撞穿一排。
 */
namespace PokemonSkills {
    /** 目标身后（沿施法者→目标方向更远处、横向很窄）还排着几个敌人，就是这一记能多碾几个。 */
    function accelerockLineCount(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.2) return 0;
        const ux = dx / length, uz = dz / length;
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const forward = ox * ux + oz * uz;
            if (forward <= length + 0.4) continue;
            if (Math.abs(ox * uz - oz * ux) <= 0.9) count++;
        }
        return count;
    }

    function accelerockWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    CompanionBehavior.registerUse(accelerockId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return accelerockWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !accelerockWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const breakthrough = !!(capability.data.config && capability.data.config.breakthrough === true);
            const lined = accelerockLineCount(context, target);
            let score = 18;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (target.attacking === self.ref) score += 6;
            if (breakthrough) score += lined >= 1 ? 12 : -8;
            else if (lined >= 1) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 14;
            return score;
        }
    });

    addPreferences(accelerockId, {}, [
        field(pathOf("breakthrough"), "破阵式", "boolean", {
            help: "开启：沿冲刺线一路碾过去（最多 2 个，极快时 3 个）、每个落点都扬尘；代价是每一下 ×0.85、顶开 ×0.7、起手 +2 刻、收招 +3 刻、冷却 +6 刻。关闭：撞上第一个就停，这一下最重、顶得最远。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "对手离自己这么远以内才主动冲锋；本招冲刺距离中等，设大也常常要先走近。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先撞上去收尾；关闭：只按普通先制候选排序。"
        })
    ]);
}
