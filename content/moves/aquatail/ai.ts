/**
 * 水流尾 / aquatail 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 9）之内；更远交给共享接近逻辑。
 * 对谁出手：这是一片贴近身前的弧形水墙。`ai.pointBlank`（默认开）打开时，越贴到脸上的目标优先级越高——
 *   把顶着自己的人连同身位一起推开，正是它最值的用法；关闭则按普通近身攻击排序。
 * 够不到怎么办：尾长交给 `reach`，共享任务把身位收进弧面之后再抡。
 * 放完接什么：交回共享交战计划；被拍中的人带着湿身身份、也被推离，接下来由共享顺序决定追击还是脱离。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(aquatailId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point), range = capability.data.range;
            if (gap > range) return 0;
            const base = 26;
            if (!CompanionBehavior.ai<boolean>(capability, "pointBlank", true)) return base;
            return gap <= range * 0.7 ? base + 12 : base;
        }
    });

    addPreferences(aquatailId, {}, [
        field(pathOf("heavy"), "沉浪", "boolean", {
            help: "开启：威力 ×1.12、推开 ×1.2，但推进拍数 +1（浪更慢、更好躲）、起手多 2 刻、冷却多 4 刻；关闭：更快的一浪，更容易在对手走出扇面前拍到。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不抡尾，先走近；越大越愿意从更远处起浪。"
        }),
        field(pathOf("ai.pointBlank"), "贴着才抡", "boolean", {
            help: "开启：越贴到脸上的目标优先级越高，用这一浪把它连同身位推开；关闭则按普通近身攻击排序。"
        })
    ]);
}
