/**
 * 臂贝武器 / shellsidearm —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上。带臂贝武器的伙伴把它当**最远的一记重炮**：目标可见、敌对、
 *   存活，在 `ai.maxChase`（默认 18）以内才考虑；更远交给共享接近逻辑。它是本组射程最长、冷却最久的一发，
 *   所以只在真的够得到时出手。
 * 对谁出手：`ai.finishLow`（默认开）打开时残血目标排得更前（一发重炮收尾）；`ai.longShot`（默认开）打开时，
 *   站在射程六成以外的目标再加一档——隔开距离把这一发安稳打出去，避免被反打。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程；钝击配置会把射程砍半，接近逻辑照此调整。
 * 放完之后：命中处按软肋结算钝击或喷射，按概率留下毒，伙伴交回共享顺序。
 * 优先级：基础 28（在射程内）／8（还要先走近）；`longShot` +8；`finishLow` 且生命低于四成五 +14。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("shellsidearm", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 18);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 18)) return 0;
            if (distance > capability.data.range) return 8;
            let score = 28;
            if (CompanionBehavior.ai<boolean>(capability, "longShot", true) && distance >= capability.data.range * 0.6) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.45) score += 14;
            return score;
        }
    });

    addPreferences("shellsidearm", {}, [
        field(pathOf("form"), "发射形态", "choice", { options: [
            { value: 0, label: "自动挑软肋" },
            { value: 1, label: "钝击（物理·贴脸）" },
            { value: 2, label: "喷射（特殊·远射）" }
        ] }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 24, step: 1,
            help: "只有在这个距离以内才把对方列为炮击候选，再由共享接近逻辑把身位送进射程；调大就是更早开始找位置。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一发重炮收尾；关闭则所有目标同等对待。"
        }),
        field(pathOf("ai.longShot"), "偏好远射", "boolean", {
            help: "开启：站在射程六成以外的目标优先级更高，隔开距离把重炮打出去；关闭则无论远近一视同仁，更愿意贴上去打。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找到炮击位置离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
