/**
 * 真气弹 / focusblast —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且在 `ai.maxChase`（默认 20）格内时列入候选；焦点目标不受距离限制。
 * 对谁出手：`ai.bulkFirst`（默认开）打开时，血量比例还高的目标优先——这最重的一发砸在满血目标身上最值；
 *   同时离得越近越压价：`ai.minRange`（默认 6）以内站着蓄势容易被贴脸打断，此时让其它招先上。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程；进了射程就不再前压，留出蓄势空间。
 * 放完接什么：交回共享交战计划；它只负责这一记重击，不追人、不留场。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("focusblast", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
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
            else if (distance > capability.data.range * 0.6) score += 8;
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
