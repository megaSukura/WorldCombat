/**
 * 花粉团 / pollenpuff 的伙伴 AI 用途。
 *
 * 同一团花粉有两个用途，注册在两条协议上：
 *   `world_combat:attack`——朝敌人扔，炸伤圈内敌人；
 *   `world_combat:heal`  ——朝受伤的同伴（或自己）扔，散成回血的花粉。同伴是否进入照顾名单由
 *     `helpFriends` 决定（默认开），阈值由 `ai.healBelow` 决定。
 * 什么局面下出手：考虑距离 `ai.maxChase`（默认 9）内有可见、敌对且在血量内的目标，或（开着照看同伴时）
 *   有生命低于 `ai.healBelow`（默认 0.8）的同伴。
 * 对谁出手：攻击分支挑最近的敌人；救助分支挑生命比例最低的同伴（共享 `world_combat:patient` 感官已经排序）。
 * 优先级：同伴生命低于 0.4 时抬到 100 抢在共享交战次序前先救；其余按普通次序。
 * 站位：共享接近逻辑把身位收到投掷射程以内，再朝目标落点抛出。
 * 配置：`nurture`（偏回复）改两向数值；`helpFriends` 决定是否照顾同伴；`ai.maxChase`／`ai.healBelow` 调范围与阈值。
 */
namespace PokemonSkills {
    function pollenpuffDistance(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
    }

    function pollenpuffAccepts(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.health <= 0) return false;
        if (pollenpuffDistance(context, item, target) > CompanionBehavior.ai<number>(item, "maxChase", 9)) return false;
        if (target.friendly) {
            if (String(target.ref) === String(CompanionBehavior.source(context).ref) && !CompanionBehavior.ai<boolean>(item, "helpFriends", true)) return false;
            return target.health < target.maximum && CompanionBehavior.ratio(target) < CompanionBehavior.ai<number>(item, "healBelow", 0.8);
        }
        return target.visible;
    }

    CompanionBehavior.registerUse("pollenpuff", {
        protocols: ["world_combat:attack", "world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) { return capability.data.ready !== false; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.friendly && !CompanionBehavior.ai<boolean>(capability, "helpFriends", true)
                && String(target.ref) !== String(CompanionBehavior.source(context).ref)) return false;
            return pollenpuffAccepts(context, capability, target);
        },
        accepts: function (context, capability, target) { return pollenpuffAccepts(context, capability, target); },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (target.friendly) {
                if (!CompanionBehavior.ai<boolean>(capability, "helpFriends", true)
                    && String(target.ref) !== String(CompanionBehavior.source(context).ref)) return 0;
                if (CompanionBehavior.ratio(target) < 0.4) return 100;
                return 40;
            }
            if (!pollenpuffAccepts(context, capability, target)) return 0;
            return 22;
        }
    });

    addPreferences("pollenpuff", {}, [
        field(pathOf("nurture"), "偏回复", "boolean", {
            help: "开启：回复比例约 ×1.3、散开半径约 ×1.05，代价爆炸威力约 ×0.8、冷却 +6 刻，用来救助同伴与自己。关闭（偏伤害）：爆炸威力约 ×1.25，代价回复比例约 ×0.75，用来砸敌人。"
        }),
        field(pathOf("helpFriends"), "照看同伴", "boolean", {
            help: "开启：伙伴会把花粉团扔向受伤的同伴（生命低于阈值时），把自己的一次出手让给救助。关闭：只对自己与敌人用，专注输出。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在目标离自己这么远以内时才考虑花粉团；调小只在贴身时扔，调大愿意先追进去。"
        }),
        field(pathOf("ai.healBelow"), "救助阈值", "number", {
            min: 0.3, max: 0.95, step: 0.05,
            help: "同伴生命低于该比例时才把团子当治疗扔过去；调低更倾向继续输出，调高一有人掉血就去救。"
        })
    ]);
}
