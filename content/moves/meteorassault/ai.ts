/** Prefer several enemies in one narrow line or a slow single target, with room to recover. */
namespace PokemonSkills {
    function meteorassaultFront(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            const from=CompanionBehavior.point(CompanionBehavior.source(context).point),direction=CompanionBehavior.point(target.point).minus(from);
            const end=from.plus(direction.length()>.01?direction.unit().scale(capability.data.range):WorldCombat.point(0,0,capability.data.range));
            const centre=CompanionBehavior.point(other.point);
            if(centre.minus(WorldGeometry.closestOnSegment(centre,from,end)).length()<=.5+(other.width||.6)/2)count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("meteorassault", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > Math.max(8,capability.data.range*2)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.4);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth) return true;
            return CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const close = CompanionBehavior.distance(self.point, target.point) <= capability.data.range;
            if (!close) return 0;
            const preferMultiple = CompanionBehavior.ai<boolean>(capability, "preferMultiple", true);
            const front = meteorassaultFront(context, capability, target);
            if (preferMultiple && front >= 2) return 52;
            return CompanionBehavior.ratio(target) <= 0.3 ? 60 : 26;
        }
    });

    addPreferences("meteorassault", {}, [
        field(pathOf("swings"), "伸枪段数", "number", {
            min: 2, max: 5, step: 1,
            help: "兵端分几段伸出；段数提高合并主伤，也延长动作与力竭。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动流星突击（除非目标已残）。越高越怕挥完被晃晕挨打。"
        }),
        field(pathOf("ai.preferMultiple"), "偏好群战", "boolean", {
            help: "开启：同一窄直线上有多个敌人时优先刺击；关闭：按单个目标判断。"
        })
    ]);
}
