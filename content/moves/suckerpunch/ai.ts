/**
 * 突袭 / suckerpunch 的 AI 用途。
 *
 * 什么局面下出手：只在**读准了目标正在出手**时才提议（否则这一记会白扣 PP）——目标最近 `window` 刻内完成过
 * 一次真实攻击（原生近战／投射物走 `DamageSemantics.recentAttack`），或最近提交过攻击招式（世界事件
 * `world_combat:committed` 记下）；同时目标可见、敌对、存活且在 `ai.maxChase`（默认 6）格内。够不到交给共享接近逻辑。
 *
 * priority：目标刚完成的这次真实攻击是接触（近身）时最高 62，投射物类 50——这是正面对拼里抢先的时机；
 * 只有脚本交手记录时 38。读不准则根本不进入候选；普通追着跑但没有真实攻击的敌人不再被当成「正在出招」。
 */
namespace PokemonSkills {
    function suckerpunchWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 6)) return false;
        const world = CompanionBehavior.world(context);
        const window = p(suckerpunchId, "window", world);
        const opponent = world.actor(target.ref);
        if (opponent !== null && DamageSemantics.recentAttack(world, opponent, window) !== null) return true;
        const record = suckerpunchReads[target.ref];
        return record !== undefined && world.tick() - record.tick <= Math.max(1, window);
    }

    CompanionBehavior.registerUse(suckerpunchId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return suckerpunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !suckerpunchWants(context, capability, target)) return 0;
            const world = CompanionBehavior.world(context);
            const window = p(suckerpunchId, "window", world);
            const opponent = world.actor(target.ref);
            const recent = opponent === null ? null : DamageSemantics.recentAttack(world, opponent, window);
            if (recent !== null) return recent.contact ? 62 : 50;
            return 38;
        }
    });

    addPreferences(suckerpunchId, {}, [
        field(pathOf("read"), "读招", "boolean", {
            help: "开启：读取窗口多 0.6 秒、刺击多一成五，但起手慢 2 刻、冷却多 6 刻。关闭：几乎瞬发的纯粹抢手，冷却短，但只认眼前的出手。"
        }),
        field(pathOf("ai.maxChase"), "抢手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才闪身抢手；本招闪身距离短，设大也常常够不到。"
        })
    ]);
}
