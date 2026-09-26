/**
 * 骨棒 / boneclub 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 8）格内。骨头比身体够得远，所以它的定位是
 * 「在对手的近身距离之外先够到一下」：`priority` 把处于**长柄带**（约 2 格以上、够得到之内）的目标排在前面。
 * 直刺式偏好远处单体抢先手；横扫式偏好近处/并肩扎堆的敌人（一次弧能兜住几个）。贴身时它仍可用，但让位给更快的近身招。
 * 命中只有 85，伙伴不会指望每一下都中，所以不会为了它追得太远；同一次挥击里同一目标只结算一次。
 */
namespace PokemonSkills {
    function boneclubWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    /** 目标近旁（2.5 格内）还挤着几个别的敌人；横扫式据此刻画出一次能兜住几个。 */
    function boneclubCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 2.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("boneclub", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return boneclubWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !boneclubWants(context, capability, target)) return 0;
            var distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            var sweep = !!(capability.data.config && capability.data.config.sweep === true);
            var crowd = boneclubCrowd(context, target);
            // 横扫式看并肩的敌人：挤着几个就值得抡一道弧；直刺式看距离：还在近身之外够得到就抢先手。
            if (sweep && crowd >= 1) return 42;
            if (CompanionBehavior.ai<boolean>(capability, "spacing", true) && distance >= 2.0 && distance <= capability.data.range) return 40;
            return CompanionBehavior.status(context, target, "flinch") ? 20 : 24;
        }
    });

    addPreferences("boneclub", {}, [
        field(pathOf("sweep"), "横扫式", "boolean", {
            help: "开启：走廊更宽、一次能扫到并肩的两三个人，但每人更轻、收招更慢。关闭：直刺，走廊窄而单发更高、出手更快，但 85 的命中偏角下更容易抡空。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动挥棍，先走近。骨头够得远，但命中只有 85，追太远往往白抡。"
        }),
        field(pathOf("ai.spacing"), "长柄优先", "boolean", {
            help: "开启：对手还在近身距离之外、但够得到时优先挥棍，把它当抢先手的距离手段；关闭：只当普通近身招排序。"
        })
    ]);
}
