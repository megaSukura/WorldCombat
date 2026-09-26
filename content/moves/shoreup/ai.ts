/**
 * 集沙 的伙伴 AI：这是一口吃地面的自救，掉血后才值得动用，而且会挑沙多的地方。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.6）且还没到满血。
 * 对谁出手：只有自己（kind self），reach 0；由共用恢复任务直接施放，不会为找沙追出安全站位。
 * 优先级：站在沙暴里或身边确有散沙时抬高，好让它在沙地上优先于其他恢复手段；没沙也不会被排除，只是不抢。
 * 配置：thick 布尔切换厚结——集沙量与回复更高，代价是起手更慢、冷却更久、一次收走更多浮沙。
 */
namespace CompanionBehavior {
    const shoreupBelow = PokemonSkills.number("ai.healBelow", "集沙阈值", 0.3, 0.9, 0.05);
    shoreupBelow.help = "自身生命低于该比例就集沙补身；调低更倾向硬撑，调高则一掉血就集沙。";
    const shoreupThick = PokemonSkills.flag("thick", "厚结");
    shoreupThick.help = "开启厚结：集沙量与回复更高，但起手更慢、冷却更久、一次收走更多浮沙；关闭薄敷：更快、更省浮沙、冷却更短。";

    PokemonSkills.addPreferences("shoreup", { thick: false, ai: { healBelow: 0.6 } }, [shoreupBelow, shoreupThick]);

    /** 只读探脚下 3×3 一层是否有散沙，与参数里的环境取样同源。 */
    function shoreupSandHere(context: WorldBehavior.Context, self: Entity): boolean {
        const world = CompanionBehavior.world(context);
        if (!world) return false;
        const cx = Math.floor(self.point[0]), cy = Math.floor(self.point[1]) - 1, cz = Math.floor(self.point[2]);
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
            if (PokemonSkills.shoreupLoose(world.block(CompanionBehavior.point([cx + dx, cy, cz + dz])))) return true;
        return false;
    }

    registerUse("shoreup", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            return ratio(source(context)) < ai<number>(item, "healBelow", 0.6);
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); },
        priority: function (context, item) {
            if (ratio(source(context)) >= ai<number>(item, "healBelow", 0.6)) return 0;
            const self = source(context);
            let score = 20;
            if (status(context, self, "sandstorm")) score += 22;
            if (shoreupSandHere(context, self)) score += 10;
            return score;
        }
    });
}
