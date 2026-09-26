/**
 * 怨恨 / spite —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，在 `ai.maxChase`（默认 14）格内，且有一条通视直线——怨念要能飞过去。
 *   挂在共享的 control 位上：它是纯削弱手段，不抢攻击的位置，但目标刚出手时会主动插进战斗节奏。
 * 对谁出手：分两层评估收益——宝可梦看它最近那一手还有没有 PP 可扣，扣得到时按招式价值与“刚出手”加价；
 *   普通生物没有 PP，怀恨仍能拖慢移速与冷却，因此只要它在出手或刚挨过打就有明确价值，不被跳过。
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
    /** 只读、决策内缓存：目标最近放的那一手（不区分是否能扣 PP）。 */
    CompanionBehavior.registerFact("world_combat:spite-last", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return "";
        const last = NativeEffects.lastMove(access, actor);
        return last === null ? "" : last.id;
    });
    /** 只读、决策内缓存：目标最近那一手还有 PP 可扣（宝可梦专属的收益层）。 */
    CompanionBehavior.registerFact("world_combat:spite-pp", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return false;
        const state = NativeEffects.read(access, actor);
        if (!state.used || access.tick() - (state.usedTick || -1000) > 240) return false;
        const last = NativeEffects.lastMove(access, actor);
        if (last === null) return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let index = 0; index < pokemon.moveSlots(); index++) {
            const move = pokemon.move(index);
            if (move && String(move.id()) === last.id && move.pp() > 0) return true;
        }
        return false;
    });
    /** 只读、决策内缓存：目标没有原生 PP，怀恨只提供移速与冷却的减速收益。 */
    CompanionBehavior.registerFact("world_combat:spite-native", function (access, actor, _argument) {
        return String(actor.domain()) !== "cobblemon";
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
            // 没有 PP 的普通生物（其他模组/原版）也有减速价值，不因扣不到 PP 被跳过。
            if (CompanionBehavior.fact<boolean>(context, "world_combat:spite-native", target))
                return target.attacking || target.hurtAgo < 80 ? 40 : 24;
            const id = CompanionBehavior.fact<string>(context, "world_combat:spite-last", target);
            if (!id) return 16;
            const info = CobblemonCombat.moveTemplate(id);
            const base = String(info.category()) === "status" ? 34 : info.power() >= 80 ? 58 : info.power() >= 50 ? 46 : 30;
            if (CompanionBehavior.fact<boolean>(context, "world_combat:spite-pp", target))
                return base + (spiteJustActed(context, target) ? 6 : 0);
            // 扣不到 PP 的宝可梦仍会被怀恨拖慢，保留一定优先级。
            return Math.max(18, base - 16);
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
