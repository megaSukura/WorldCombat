/**
 * 怨恨 / spite —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，在 `ai.maxChase`（默认 14）格内，且有一条通视直线——怨念要能飞过去。
 *   挂在共享的 control 位上：它是纯削弱手段，不抢攻击的位置，但目标刚出手时会主动插进战斗节奏。
 * 对谁出手：读目标最近一次出手距今多久（决策内缓存）。刚出手（240 刻内）的目标值得立刻记恨，priority 抬高；
 *   更久以前出过手的仍可挂怀恨，但只按普通控制排序，不额外加价。
 * 够不到怎么办：射程交给 reach，共享任务把身位收进通视射程后再放。
 * 放完接什么：交回共享交战计划；怀恨会自己拖慢目标，不需要继续盯着。
 */
namespace PokemonSkills {
    /** 只读、决策内缓存：目标距上次出手多少刻；没出过手返回 -1。 */
    CompanionBehavior.registerFact("world_combat:spite-target", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return -1;
        const last = NativeEffects.lastMove(access, actor);
        return last === null ? -1 : Math.max(0, access.tick() - last.tick);
    });

    function spiteJustActed(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        const since = CompanionBehavior.fact<number>(context, "world_combat:spite-target", target);
        return typeof since === "number" && since >= 0 && since <= 240;
    }

    CompanionBehavior.registerUse("spite", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (context.facts.focus !== target.ref
                && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(CompanionBehavior.source(context).point), CompanionBehavior.point(target.point));
        },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            return spiteJustActed(context, target) ? 48 : 6;
        }
    });

    addPreferences("spite", {}, [
        field(pathOf("ai.maxChase"), "记恨距离", "number", {
            min: 4, max: 26, step: 1,
            help: "超过这个距离就不主动送怨念，先走近；越大越愿意追出去记恨，也越容易在半路被甩掉。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为送怨念离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
