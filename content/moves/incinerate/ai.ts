/**
 * 烧尽 / incinerate —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 10）格内；更远交给共享接近逻辑。
 * 对谁出手：这一束火舌横扫过去，横向并排的目标越多越值，因此目标身边同一扇面里还挤着别的敌人时抬高 priority；
 *   目标携带树果或宝石时最高优先（能真的烧掉并吃到爆燃追加）；空手目标当一记横扫火攻参与排序。
 * 什么时候不选：贴脸（3 格内）且侧后已经挤着两个以上别的敌人时不出手——这时横扫只罩住正面，容易被围；
 *   交给共享的交战/走位计划。
 * `ai.burnItems` 开启后只在目标携带可燃物时出手，作为专门的烧物手段；关闭则空手时也照常扫。
 * 放完之后：火舌扫完即回，交回共享交战计划。
 */
namespace CompanionBehavior {
    function incinerateTargetBurnable(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && PokemonSkills.incinerateBurnable(world, actor) !== null;
    }

    /** 大致数一数目标前方同一扇面、同一射程内还站着几个可见敌人——横扫一次值不值。 */
    function incinerateFan(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        var self = CompanionBehavior.source(context);
        var dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        var length = Math.sqrt(dx * dx + dz * dz) || 1, fx = dx / length, fz = dz / length;
        var range = typeof item.data.range === "number" ? item.data.range : 3;
        var cosHalf = Math.cos(40 * Math.PI / 180), count = 0;
        var nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            var ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            var distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > range + 0.5) continue;
            if (distance < 0.01 || (ox * fx + oz * fz) / distance >= cosHalf) count++;
        }
        return count;
    }

    /** 贴脸且侧后已经挤着两个以上别的敌人：横扫只罩住正面，这时不选。 */
    function incinerateFlanked(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        var self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > 3.0) return false;
        var close = 0, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= 3.0) close++;
        }
        return close >= 3;
    }

    registerUse("incinerate", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (incinerateFlanked(context, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 10);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<boolean>(item, "burnItems", false)) return incinerateTargetBurnable(context, target);
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            var self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > item.data.range) return 0;
            var score = 22;
            if (incinerateTargetBurnable(context, target)) score += 30;
            if (incinerateFan(context, item, target) >= 2) score += 14;
            return score;
        }
    });

    PokemonSkills.addPreferences("incinerate", { ai: { maxChase: 10, leaveStation: false, burnItems: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.burnItems", "只对可燃物出手")
    ]);
}
