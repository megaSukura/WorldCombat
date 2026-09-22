/**
 * 青草搅拌器 的伙伴 AI 用途：一套自己的出手计划。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内。`ai.crowd`（默认开）让它检查目标身边有多少敌人：
 * 能围住两个以上时 priority 明显抬高，因为旋风是持续的区域切割，罩得越多越值；只有单个目标时按普通攻击排序。
 * 对谁出手：当前威胁；不可见、友方或已倒下的目标不接受。
 * 够不到怎么办：reach 就是落点射程，不够就先走近；`ai.leaveStation` 决定驻守时是否离位。
 * 放完之后：旋风留在地上继续切，伙伴交回共享顺序继续战斗，被罩住的敌人需要自己走开。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("leaftornado", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 17);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const base = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 22 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) return base;
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let caught = 1;
            for (let i = 0; i < nearby.length && caught < 5; i++) {
                const other = nearby[i];
                if (other.friendly || other.health <= 0 || other.ref === self.ref || other.ref === target.ref) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= 3.6) caught++;
            }
            return caught >= 2 ? base + 18 : base;
        }
    });

    addPreferences("leaftornado", {}, [
        field(pathOf("ai.maxChase"), "施放距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动立旋风，先走近。越大越愿意在更远处先手罩住目标。"
        }),
        field(pathOf("ai.crowd"), "围住多个", "boolean", {
            help: "开启后，目标身边还有别的敌人时优先立旋风，持续切割能多打几份；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找落点离开站位；关闭则只在原地够得到时立旋风。"
        })
    ]);
}
