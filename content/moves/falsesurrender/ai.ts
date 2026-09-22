/**
 * 假跪真撞 / falsesurrender 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * `ai.punish`（默认开）：对手的注意不在施法者身上（没有正在攻击施法者）时抬高 priority——伏低的骗术正是打这种目标；
 * 关闭后只要在射程内就按普通中近程突刺排序。施法者伏低时不能动，所以 AI 只在对手进入发梢距离后才起手。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("falsesurrender", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            var base = gap <= capability.data.range ? 20 : 3;
            if (!CompanionBehavior.ai<boolean>(capability, "punish", true)) return base;
            var self = CompanionBehavior.source(context);
            var attention = target.attacking;
            // 目标盯着的不是自己（或没在出手）→ 伏低的骗术成立，优先出手。
            if (!attention || attention !== self.ref) return base + 14;
            return base;
        }
    });

    addPreferences("falsesurrender", {}, [
        field(pathOf("grovel"), "伏低", "boolean", {
            help: "开启：伏得更深，发梢距离约 +15%、伏低加成约 ×1.25，但伏低多 4 刻（暴露更久）。关闭：浅伏，起手更快、暴露更短，够得近些、加成小些。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 14, step: 1,
            help: "超过这个距离就不主动伏低，先走近。越大越愿意从较远处发难。"
        }),
        field(pathOf("ai.punish"), "趁虚而入", "boolean", {
            help: "开启后，注意不在自己身上的目标优先（伏低的骗术最值）；关闭则只按普通中近程突刺排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为接近目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
