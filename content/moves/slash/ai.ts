/**
 * 劈开 / slash 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 5）格以内；更远交给共享接近逻辑。
 * 用在哪：它是一道窄而高的斜压刀面，只有目标身体真的落在刀面能扫到的高低范围、且中间没有被实墙截断时才值得出手；
 *   够不到就让共享靠近继续收身位。单个大体型不会多挨，一下就是一记。
 * 怎么排序：慢而准、暴击率高，适合收尾；`ai.finishLow`（默认开）在残血目标上加分，把这一刀当最后一击来用。
 * 放完之后：目标要么被劈开、要么掉了血，交回共享顺序决定继续贴身还是走位等冷却。
 * 宽散群交给横扫类的招；这一刀不负责铺面。
 */
namespace PokemonSkills {
    /** 目标身体是否落在当前这道斜压刀面里、且中间没有实墙：与执行同源的 slashBlade（含顶棚与全宽裁剪）。 */
    function slashCovers(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        const reach = typeof capability.data.range === "number" && isFinite(capability.data.range) ? capability.data.range : 2.6;
        const heavy = !!(capability.data.config && capability.data.config.heavy === true);
        const width = typeof self.width === "number" && isFinite(self.width) ? self.width : 0.9;
        const height = typeof self.height === "number" && isFinite(self.height) ? self.height : 1.4;
        const edge = Math.max(0.4, Math.min(0.9, 0.5 + (width - 0.9) * 0.3 + (heavy ? -0.08 : 0.1)));
        const depth = Math.max(1.2, Math.min(2.2, 1.4 + (height - 1.4) * 0.4 + (heavy ? 0.3 : 0)));
        const origin = CompanionBehavior.point(self.point);
        const toward = CompanionBehavior.point(target.point).minus(origin);
        if (toward.length() < 0.05) return true;
        const frame = WorldGeometry.basis(toward.unit());
        const access = CompanionBehavior.world(context);
        const blade = slashBlade(access, origin, depth, frame.forward, reach, frame.right, edge);
        if (blade === null) return false;
        const thickness = Math.max(0.08, Math.min(0.22, edge * 0.25));
        const region = WorldGeometry.bodyPrism(blade.quad, blade.normal, thickness);
        let covered = false;
        WorldGeometry.selectBodies(access, region, function (other) {
            if (String(other.ref()) === String(target.ref)) covered = true;
        });
        return covered && WorldGeometry.blockHit(access, origin, CompanionBehavior.point(target.point)) === null;
    }

    CompanionBehavior.registerUse(slashId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!slashCovers(context, capability, target)) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.45) return 36;
            return 22;
        }
    });

    addPreferences(slashId, {}, [
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.finishLow", "优先收尾")
    ]);
}
