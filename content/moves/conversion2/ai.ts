/**
 * 纹理２ / conversion2 —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，在 `ai.maxChase`（默认 12）格内，有一条通视直线。挂在共享的 control 位上：
 *   它是一次防御性的应招，不抢攻击的位置。
 * 对谁出手：读目标最后那一手的属性（决策内缓存）。若那一手正好克制自己当前的属性（≥2×），priority 抬到 60，
 *   先把自己的受击面翻过去；否则只当作普通控制，12。
 * 注意：是否「读得到属性、有可换的抗性属性」由提交前的 ready 校验，不放进 available——否则对手还没出手时
 *   伙伴会以为无招可用而退开，读解就等不到可读那一刻。伙伴照常贴近、反复尝试。
 * 够不到怎么办：射程交给 reach，共享任务把身位收进通视射程后再放。
 * 放完接什么：交回共享交战计划；重织的属性能顶住那一类攻击，不需要继续盯着。
 * 配置 prioritize 决定挑哪一种抗性属性：最硬（对那一招乘数最低）或顾全（整体受击面最好）。
 */
namespace PokemonSkills {
    /** 只读、决策内缓存：目标最后使用的那一手的属性；没有返回 ""。 */
    CompanionBehavior.registerFact("world_combat:conversion2-last", function (access, actor, _argument) {
        return conversion2Read(access, actor);
    });

    function conversion2Threatened(context: WorldBehavior.Context, attackType: string): boolean {
        if (conversion2Types.indexOf(attackType) < 0) return false;
        const facts = CompanionBehavior.pokemonFacts(context, CompanionBehavior.source(context));
        if (!facts || !facts.types.length) return false;
        for (let index = 0; index < facts.types.length; index++) {
            if (CobblemonCombat.typeEffectiveness(attackType, facts.types[index]) >= 2) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("conversion2", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (context.facts.focus !== target.ref
                && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 12)) return false;
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(CompanionBehavior.source(context).point), CompanionBehavior.point(target.point))) return false;
            return true;
        },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const attackType = CompanionBehavior.fact<string>(context, "world_combat:conversion2-last", target);
            if (!attackType) return 12;
            return conversion2Threatened(context, attackType) ? 60 : 12;
        }
    });

    addPreferences("conversion2", {}, [
        field(pathOf("wide"), "重织取向", "boolean", {
            help: "开启：在能扛住那一手的属性里挑整体受击面最好的（少露弱点），适合还要挨别的招的混战；关闭：换成对那一招乘数最低的属性，专治这一手。"
        }),
        field(pathOf("ai.maxChase"), "读解距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动读解，先走近；越大越愿意隔着一段距离先改属性。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为读解离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
