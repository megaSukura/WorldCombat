/**
 * 唤醒巴掌 / wakeupslap 的 AI 用途。
 *
 * 什么局面下出手：近身重掌，对手可见、敌对、活着且在 `ai.maxChase`（默认 7）之内即可；够不到交给共享接近逻辑。
 * 对谁出手：`ai.wake`（默认开）打开时，**正睡着的目标 priority 抬到 54**——那是翻倍的窗口，值得插到普通攻击前面；
 *   没人在睡时它仍是一记普通重掌，压到 9 让位给别的招。
 * 放完接什么：交回共享交战计划；命中会把目标惊醒，这一掌不负责维持睡眠控制。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(wakeupslapId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "wake", true)
                && CompanionBehavior.status(context, target, "sleep")) return 54;
            return 9;
        }
    });

    addPreferences(wakeupslapId, {}, [
        field(pathOf("shock"), "余震", "boolean", {
            help: "开启：拍击震出一圈余波，把范围内的其他敌人也拍中（按 0.4 比例）并惊醒其中的睡眠者，但本击 ×0.85、冷却多 4 刻。关闭：一记聚掌，本击 ×1.08。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "目标离自己这么远以内才压上去；调大愿意主动追上更远的睡眠目标。"
        }),
        field(pathOf("ai.wake"), "趁睡眠拍", "boolean", {
            help: "开启后，正睡着的目标会被优先拍醒（正是翻倍窗口）；关闭则只在没有别的招时会用这一记普通重掌。"
        })
    ]);
}
