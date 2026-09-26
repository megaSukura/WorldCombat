/**
 * 泥巴炸弹 的伙伴 AI 用途：一套自己的出手计划。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内。`ai.crowd`（默认开）让它检查目标身边有没有别的敌人：
 * 有的话爆开能多打一份，priority 抬高；否则把它当干净的直线重击。
 * 对谁出手：当前威胁；不可见、友方或已倒下的目标不接受。
 * 够不到怎么办：reach 就是本招射程，不够就先走近交给共享接近逻辑；`ai.leaveStation` 决定驻守时是否离位。
 * 放完之后：主目标留泥印、身旁溅泥粒，交回共享顺序继续战斗。
 * 选取是 aim：玩家可朝方向/世界点空投，AI 仍只为攻击用途推荐敌人，两者分开处理。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("mudbomb", {
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
            const base = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 20 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) return base;
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly || other.health <= 0 || other.ref === target.ref || other.ref === self.ref) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= 3.2) return base + 14;
            }
            return base;
        }
    });

    addPreferences("mudbomb", {}, [
        field(pathOf("ai.maxChase"), "射击距离", "number", {
            min: 4, max: 26, step: 1,
            help: "超过这个距离就不主动发射，先走近。越大越愿意在更远处先手投弹。"
        }),
        field(pathOf("ai.crowd"), "瞄准扎堆", "boolean", {
            help: "开启后，目标身边还有别的敌人时优先发弹，爆开能多打一份；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时投弹。"
        })
    ]);
}
