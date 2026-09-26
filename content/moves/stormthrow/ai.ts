/** Prefer a safe rear flank for repositioning; native refusal still leaves the critical grip strike. */
namespace PokemonSkills {
    function stormthrowWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse(stormthrowId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return stormthrowWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !stormthrowWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            let score = gap <= capability.data.range + 0.6 ? 24 : 0;
            const access = CompanionBehavior.world(context), dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2], length = Math.sqrt(dx * dx + dz * dz) || 1;
            const side = WorldCombat.point(self.point[0] - dz / length * 1.5 - dx / length, target.point[1] - (target.height || 1.8) / 2, self.point[2] + dx / length * 1.5 - dz / length);
            if (access.freeSpace(side, target.width || .6, target.height || 1.8)) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "grapple", true)) {
                const owner = context.facts.owner;
                if (target.attacking === self.ref || !!owner && target.attacking === owner.ref) score += 12;
            }
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            return score;
        }
    });

    addPreferences(stormthrowId, {}, [
        field(pathOf("pin"), "锁摔", "boolean", {
            help: "开启（锁摔）：摔翻时长 ×1.4、旋身尘纹更密，但威力 ×0.9、起手 +2 刻、冷却 +8 刻。关闭（急摔）：威力 ×1.12、摔翻更短、更快更省。一个换「压住一个身位」，一个换「一记更狠的伤害」。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 12, step: 1,
            help: "超过这个距离就不主动追摔，先走近；越接近这个距离越想先手（它是近身招）。"
        }),
        field(pathOf("ai.grapple"), "先摔正在扑的", "boolean", {
            help: "开启：正在攻击自己或主人的目标优先，把扑上来的威胁摔翻最合算；关闭则只按普通近战排序。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前；关闭则只按普通近战排序。"
        })
    ]);
}
