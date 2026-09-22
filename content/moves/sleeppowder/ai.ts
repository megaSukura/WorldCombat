/**
 * 催眠粉 的伙伴 AI 用途：这招自己的一套出手计划——把云丢在人群落点上。
 *
 * 什么局面有意义：挂在共享的 control 位上。对可见、敌对、还活着、还没睡、在 ai.maxChase 以内、与施法者
 *   通视的目标抛粉；草属性直接穿过粉末，跳过。它最爱目标身边先站着一小撮人的时候——一片云一次放倒几个。
 * 对谁出手：当前威胁；落点取目标当前位置。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒，会先靠近再抛。
 * 放完之后：落点留下的一片云会持续把站在里面的人喂睡，伙伴交回共享顺序——可以绕到云后面等它生效，或把别的敌人往云里逼。
 * 优先级：基础 48；目标附近 2.5 格内每多站一个非友方 +7，最高 82；逃跑中的威胁再 +12。
 */
namespace PokemonSkills {
    /** 草属性穿过粉末：它不值得为它撒粉。 */
    function sleeppowderImmune(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("grass") >= 0;
    }

    /** 目标身边 2.5 格内（含自己）站着几个非友方。 */
    function sleeppowderCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 2.5) count++;
        }
        return count;
    }

    function sleeppowderWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "sleep")) return false;
        if (sleeppowderImmune(context, target)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 9)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(sleeppowderId, {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : sleeppowderWants(context, item, target); },
        accepts: function (context, item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !sleeppowderWants(context, item, target)) return 0;
            const cluster = sleeppowderCluster(context, target);
            const flee = CompanionBehavior.fleeing(context, target) ? 12 : 0;
            return Math.min(82, 48 + cluster * 7) + flee;
        }
    });

    addPreferences(sleeppowderId, { ai: { maxChase: 9, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "撒粉距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动撒粉，先走近；越大越愿意远远地先丢一片云。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为撒粉离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
