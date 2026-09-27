/**
 * 真气弹 / focusblast —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且在 `ai.maxChase`（默认 20）格内时列入候选；焦点目标不受距离限制。
 * 对谁出手：`ai.bulkFirst`（默认开）打开时，血量比例还高的目标优先——这最重的一发砸在满血目标身上最值；
 *   同时离得越近越压价：`ai.minRange`（默认 6）以内站着蓄势容易被贴脸打断，此时让其它招先上。
 * 命中收益：远距离只加基础分，还要乘上目标张角与本招残余散布的比——散布越吃不下目标（越远、越瘦、越横移），
 *   残余散布吞掉的收益越多，推荐越低，避免隔着半场对着灵活目标空砸。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程；进了射程就不再前压，留出蓄势空间。
 * 放完接什么：交回共享交战计划；它只负责这一记重击，不追人、不留场。
 */
namespace PokemonSkills {
    /** 当前距离下目标张角与本招残余散布（最坏：稳定为 0，用满公式值）的比；越接近、目标越宽越吃得下散布。 */
    function focusblastHitFactor(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity, distance: number): number {
        const world = CompanionBehavior.world(context), actor = world.source();
        const scatter = p("focusblast", "scatter", { world: world, actor: actor, skill: skills["focusblast"], detail: { values: capability.data.config || {} } });
        const halfWidth = Math.max(0.25, (target.width || 0.6) / 2);
        const tolerance = Math.atan2(halfWidth, Math.max(1, distance)) * 180 / Math.PI;
        return Math.max(0, Math.min(1, tolerance / Math.max(0.5, scatter)));
    }

    CompanionBehavior.registerUse("focusblast", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if ((context.facts.nearby as CompanionBehavior.Entity[]).some(other=>!other.friendly&&other.health>0&&other.visible&&CompanionBehavior.distance(CompanionBehavior.source(context).point,other.point)<2.5))return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 20);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = distance <= capability.data.range ? 24 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "bulkFirst", true) && CompanionBehavior.ratio(target) > 0.6) score += 10;
            if (distance < CompanionBehavior.ai<number>(capability, "minRange", 6)) score -= 14;
            else if (distance > capability.data.range * 0.6) {
                // 远距离的残余散布要计入命中收益：张角越小，越可能打空。
                const hit = focusblastHitFactor(context, capability, target, distance);
                score += Math.round(8 * hit) - Math.round(6 * (1 - hit));
            }
            const velocity=CompanionBehavior.velocity(context,target),pace=velocity?Math.sqrt(velocity[0]*velocity[0]+velocity[2]*velocity[2]):0;
            score += pace<.08 || (target.width||.6)>1.8 ? 10 : -6;
            return score;
        }
    });

    addPreferences("focusblast", {}, [
        field(pathOf("unleash"), "全力释放", "boolean", {
            help: "开启：威力 ×1.12，但散布 ×1.5、冷却 +4 刻——力量更满、更容易飞偏，适合对站桩目标硬砸。关闭：更收敛、更稳，散布按基础值，适合对灵活目标保命中。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 6, max: 28, step: 1,
            help: "超过这个距离就不主动起手，先走近；越大越愿意在更远处开始蓄势。"
        }),
        field(pathOf("ai.minRange"), "最近起手距离", "number", {
            min: 0, max: 14, step: 1,
            help: "目标进到这个距离以内时压低出手优先级，避免站着蓄势被贴脸打断；调到 0 表示贴身也照蓄。"
        }),
        field(pathOf("ai.bulkFirst"), "先打血厚的", "boolean", {
            help: "开启后，血量比例还高的目标优先——这最重的一发砸在满血目标身上最值；关闭则所有目标同价。"
        })
    ]);
}
