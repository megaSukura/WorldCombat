/**
 * 子弹拳 / bulletpunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格之内。它是贴身的瞬发钢拳，
 *   愿意主动贴到拳程内再击发；更远交给共享接近逻辑走过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 选择偏好：`ai.lines`（默认开）时优先挑「身后还排着别人」的目标——这一发会把前后排一起打穿，值得先手。
 * 优先次序：射程内基础 23；身后排着的敌人每个 +8（最多算两个）；已在拳程内 +4；目标残血 +8。
 * 够不到怎么办：拳程由 `reach` 决定，共享任务先把身位收进拳程再打。
 * 放完之后：人被打穿、被推开，交回共享交战计划；穿甲弹一次能把整条线打穿，适合对付排成一列的敌人。
 */
namespace PokemonSkills {
    /** 目标身后（沿施法者→目标方向更远处、横向很窄）还排着几个敌人，就是这一发能多穿几个。 */
    function bulletpunchLineCount(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
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

    function bulletpunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse(bulletpunchId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return bulletpunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !bulletpunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 23;
            if (CompanionBehavior.ai<boolean>(capability, "lines", true))
                score += Math.min(2, bulletpunchLineCount(context, target)) * 8;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.ratio(target) <= 0.35) score += 8;
            return score;
        }
    });

    addPreferences(bulletpunchId, {}, [
        field(pathOf("ap"), "穿甲弹", "boolean", {
            help: "开启：贯穿数 +1（随速度最多 3 个），可以把整条线打穿，但每一下威力 ×0.85、拳程 −0.3 格、起手 +1 刻、收招 +2 刻、冷却 +6 刻。关闭：单发实心钢拳，够得更远、回得更快、这一下更重。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才主动贴上去打；本招拳程短，设大愿意更早起手。"
        }),
        field(pathOf("ai.lines"), "优先连线目标", "boolean", {
            help: "开启：身后还排着别人的目标排得更前，这一发能把前后排一起打穿；关闭则只按普通近战候选排序。"
        })
    ]);
}
