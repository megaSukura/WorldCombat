/**
 * 羽栖 的伙伴 AI：这是落地分段的一口自救，适合在掉血后、或需要主动贴地时动用。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.65）且还没到满血；空中时会先确认脚下有能落住的实地，
 *   找不到就这轮不选——低血阈值不会让飞行伙伴反复提交一次注定落不下去的羽栖。
 * 对谁出手：只有自己（kind self），reach 0；由共用恢复任务直接施放。
 * 优先级：0，落在共用顺序的恢复环节；生命见底时交给保命与撤退，随后仍会找机会落地歇一口。
 * 配置：deep 布尔切换深栖——回复更多、窗口更长，代价是冷却更久、落地脆弱期更久。
 */
namespace CompanionBehavior {
    const roostBelow = PokemonSkills.number("ai.healBelow", "落地阈值", 0.3, 0.9, 0.05);
    roostBelow.help = "自身生命低于该比例就落地栖息；调低更倾向硬撑，调高则一掉血就落。";
    const roostDeep = PokemonSkills.flag("deep", "深栖");
    roostDeep.help = "开启后回复总量略增、栖息窗口 ×1.5，但冷却更久、落地脆弱期更长；关闭则更快收势、更省。";

    PokemonSkills.addPreferences("roost", { deep: false, ai: { healBelow: 0.65 } }, [roostBelow, roostDeep]);

    /** 空中先找能落住的实地：向下有真实碰撞面，且该点容得下这具身体。 */
    function roostLandingSafe(context: WorldBehavior.Context, self: CompanionBehavior.Entity): boolean {
        if (self.grounded === true) return true;
        return CompanionBehavior.observedFlag(context, "roost:ground-viable", function () {
            try {
                const world = CompanionBehavior.world(context);
                const height = Math.max(0.4, self.height || 1.4), width = Math.max(0.4, self.width || 0.9);
                const feetY = self.point[1] - height / 2;
                const feet = WorldCombat.point(self.point[0], feetY, self.point[2]);
                const floor = WorldGeometry.blockHit(world, feet.plus(WorldCombat.point(0, 0.1, 0)), feet.minus(WorldCombat.point(0, 24, 0)));
                if (floor === null) return false;
                return world.freeSpace(WorldCombat.point(feet.x(), floor.position().y() + 0.05, feet.z()), width, height);
            } catch (error) { return false; }
        });
    }

    registerUse("roost", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            const self = source(context);
            if (ratio(self) >= ai<number>(item, "healBelow", 0.65)) return false;
            return roostLandingSafe(context, self);
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
