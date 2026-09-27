/**
 * 尖刺加农炮的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 14）格之内；更远交给共享接近逻辑。
 *   它射程最长、出手最慢、首发后方向锁死，所以偏好「一条线上站着几个敌人」的局面：沿准线越靠后的目标
 *   越说明这发能贯穿多人。它也能在近身时把贴脸目标顶开重新拉出距离。
 * 对谁出手：`ai.pushMelee`（默认开）打开时，贴到 4 格内的目标排得更前，用贯穿顶退把它们推开；
 *   正前方成纵列的敌人加分——按 3D 有效射程内、当前通视的对象数，用它们到弹道的垂距与半宽判断纵列。
 *   反过来，若身侧近处有敌人绕后（不在准线上、又在 4 格内），说明固定炮线会被绕开，
 *   大幅降分，让共享交战计划改选别的招。
 * 对 Boss：贯穿与顶退都可能被免推 Boss 拒绝，但每发命中的基础钉伤照常结算，所以不因推不动就不出手。
 * 够不到怎么办：reach 就是本招射程，不够先走近；钉直飞无追踪，走得快的目标要更近才稳。
 * 放完之后：这一梭打完（或目标先倒）就收势，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function spikecannonWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
    }

    CompanionBehavior.registerUse("spikecannon", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return spikecannonWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !spikecannonWants(context, capability, target)) return 0;
            const source = CompanionBehavior.source(context).point;
            const reach = capability.data.range;
            const distance = CompanionBehavior.distance(source, target.point);
            // 有效射程按 3D 真实距离；纵列也按 3D 方向与到该线的垂距（半宽）来数。
            const dx = target.point[0] - source[0], dy = target.point[1] - source[1], dz = target.point[2] - source[2];
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const forward = length > 0.01 ? [dx / length, dy / length, dz / length] : [0, 0, 0];
            let score = 14;
            if (distance <= reach) score += 4;
            const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
            let column = 0, flank = 0;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
                // 只看有效射程内、当前通视（visible）的对象，隔墙的不计入纵列。
                const ox = other.point[0] - source[0], oy = other.point[1] - source[1], oz = other.point[2] - source[2];
                const span = Math.sqrt(ox * ox + oy * oy + oz * oz);
                if (span > reach) continue;
                const along = ox * forward[0] + oy * forward[1] + oz * forward[2];
                const lateral = Math.sqrt(Math.max(0, span * span - along * along));
                if (along > 1 && lateral <= 1.6) column++;
                else if (along <= 4 && along >= 0 && lateral > 1.6) flank++;
            }
            if (column >= 1) score += 3 + Math.min(2, column);
            if (CompanionBehavior.ai<boolean>(capability, "pushMelee", true) && distance <= 4) score += 10;
            if (flank > 0) score -= 5 * flank;
            return Math.max(1, score);
        }
    });

    addPreferences("spikecannon", {}, [
        field(pathOf("lance"), "穿甲式", "boolean", {
            help: "开启：单钉威力 ×1.3、可贯穿 3 人、顶退 ×1.4，适合打成一排的目标；代价是钉数收在 3 发、射程 ×0.95、间隔 +2 刻、起手 +3 刻、冷却 +5 刻。关闭（连发式）：钉数可到 5 发、射程更远、间隔更密、出手更快，代价是单钉威力 ×0.9、只贯穿 1~2 人、顶退更小。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 18, step: 1,
            help: "超过这个距离就不主动开炮，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.pushMelee"), "优先顶开贴身目标", "boolean", {
            help: "开启：贴到 4 格内的目标排得更前，用贯穿顶退把它们推开；关闭则所有目标同价。身侧有敌人绕后时都会降分换招。"
        })
    ]);
}
