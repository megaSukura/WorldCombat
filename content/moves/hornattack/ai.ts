/**
 * 角撞 / hornattack 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 6）格内；角程短，够不到先让共享接近逻辑送进来。
 * 对谁出手：贴地的目标排得更前——顶撞本来就是地面动作，飞在空中的目标不好锁角；目标身后有可推直线的空间时再抬一档
 * （有可推直线且要把敌挤离友方时用）；`ai.finish` 收残血。抗推 Boss 上推不动，只值那一记初伤。
 * 出手位置：按身体尺寸加冲身步幅算出的贴身距离，好让原生短接触稳稳咬住并把对方推出去，不再按射程比例猜。
 * 放完之后：目标被推离原位、护甲未动；交回共享计划决定继续贴身还是等冷却。
 */
namespace PokemonSkills {
    function hornattackValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 出手站位由真实身体尺寸加冲身步幅决定，而不是按射程比例猜；读不到个体参数时退回射程的一部分。 */
    function hornattackReach(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context);
        const width = self.width === undefined ? 0.9 : self.width;
        const height = self.height === undefined ? 1.4 : self.height;
        const half = Math.max(width, height) * 0.5;
        let rush = 0.6;
        try { rush = Math.max(0, Number(p("hornattack", "rush", factContext(CompanionBehavior.world(context))))); } catch (ignored) { }
        const reach = half + 0.45 + rush;
        return isFinite(reach) && reach > 0 ? Math.max(1.0, reach) : Math.max(1.0, capability.data.range * 0.62);
    }

    /** 目标身后是否留有可推的直线空间（只读世界探针），供「有可推直线」这一倾向使用。 */
    function hornattackPushRoom(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (!(length > 0.1)) return false;
        const behind = CompanionBehavior.point([target.point[0] + dx / length * 1.2, target.point[1], target.point[2] + dz / length * 1.2]);
        return world.freeSpace(behind, target.width || 0.9, target.height || 1.4);
    }

    CompanionBehavior.registerUse("hornattack", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return hornattackReach(context, capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!hornattackValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) { return hornattackValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 16;
            if (target.grounded !== false) score += 5;
            if (distance <= 1.6) score += 3;
            if (hornattackPushRoom(context, target)) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 10;
            return score;
        }
    });

    addPreferences("hornattack", {}, [
        flag("drive", "推土式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.finish", "优先收残血")
    ]);
}
