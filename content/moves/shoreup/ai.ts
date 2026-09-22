/**
 * 集沙 的伙伴 AI：这是一口吃地面的自救，掉血后才值得动用，而且会挑沙多的地方。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.6）且还没到满血。
 * 对谁出手：只有自己（kind self），reach 0；由共用恢复任务直接施放。
 * 优先级：0，落在共用顺序的恢复环节；沙暴中或站在沙地上更值得，但条件交给共用恢复顺序判断。
 * 配置：thick 布尔切换厚结——集沙量与回复更高，代价是起手更慢、冷却更久、一次挖走更多沙。
 */
namespace CompanionBehavior {
    const shoreupBelow = PokemonSkills.number("ai.healBelow", "集沙阈值", 0.3, 0.9, 0.05);
    shoreupBelow.help = "自身生命低于该比例就集沙补身；调低更倾向硬撑，调高则一掉血就集沙。";
    const shoreupThick = PokemonSkills.flag("thick", "厚结");
    shoreupThick.help = "开启厚结：集沙量与回复更高，但起手更慢、冷却更久、一次挖走更多沙；关闭薄敷：更快、更省沙、冷却更短。";

    PokemonSkills.addPreferences("shoreup", { thick: false, ai: { healBelow: 0.6 } }, [shoreupBelow, shoreupThick]);

    registerUse("shoreup", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            return ratio(source(context)) < ai<number>(item, "healBelow", 0.6);
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
