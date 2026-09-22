/**
 * 双针 / twineedle —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上。带双针的伙伴把它当**稳定的两下连刺**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 12）以内就出手；更远交给共享接近逻辑。
 * 对谁出手：两下几乎必定都落在同一个目标上（原生连续 2 次），所以 `ai.finishLow`（默认关）打开时残血目标
 *   排得更前，用这两下收尾；关闭则所有目标同等对待。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：两针各自结算，第一针留下的伤口让第二针更容易带毒，伙伴交回共享顺序。
 * 优先级：基础 24（在射程内）／6（还要先走近）；`ai.finishLow` 开启且目标生命低于四成时 +12。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("twineedle", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 12)) return 0;
            if (distance > capability.data.range) return 6;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", false) && CompanionBehavior.ratio(target) < 0.4) return 36;
            return 24;
        }
    });

    addPreferences("twineedle", {}, [
        field(pathOf("cross"), "交叉双针", "boolean", {
            help: "开启：两根针从身体两侧夹击，第二针的伤口加成 ×1.6，代价是每针威力 ×0.9、两针间隔 +2 刻。关闭（直刺双针）：同一线连出、间隔更短、每针威力 ×1.1，但第二针没有夹击加成。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动出针，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这两下稳定收尾；关闭则所有目标同等对待。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为出针离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
