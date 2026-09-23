/**
 * 保护色 / camouflage — 伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面有意义：自己没被染过色，脚下读得出一种与当前不同的场所属性；已经就是该属性（单属性）时不重复染。
 *   有威胁时更想先染好颜色再交战（priority 24）；有交战需求时才按地形换属性。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：属性按地形换好，交回共享交战计划；配置「随景而变」时走动会继续重染。
 * 读脚下的场所走同一条 camouflageScan，与执行时读的是同一份世界事实。
 */
namespace CompanionBehavior {
    registerFact("world_combat:camouflage-type", function (access, actor, _argument) {
        return PokemonSkills.camouflageScan(access, actor).type;
    });

    function camouflageWants(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        if (context.facts.mounted || !context.senses["world_combat:threat"]) return false;
        const self = source(context);
        if (status(context, self, "camouflage")) return false;
        const facts = pokemonFacts(context, self);
        if (!facts || !facts.types.length) return false;
        const type = fact<string>(context, "world_combat:camouflage-type", self);
        if (type === null) return false;
        return !(facts.types.length === 1 && facts.types[0] === type);
    }

    registerUse("camouflage", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            return camouflageWants(context, item);
        },
        priority: function (context, item, _target) {
            if (!camouflageWants(context, item)) return 0;
            return context.senses["world_combat:threat"] ? 24 : 8;
        }
    });

    const camouflageDrift = PokemonSkills.flag("drift", "随景而变");
    camouflageDrift.help = "开启：站到不同地面会重读并换属性，适应性强，但可能被地形带进不利属性、冷却 +10 刻；关闭：一次定住、冷却 -6 刻，离开原地后属性不再贴合。";

    PokemonSkills.addPreferences("camouflage", { drift: false }, [camouflageDrift]);
}
