/**
 * 跃起 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、存活、敌对的威胁在 `ai.maxChase`（默认 14）以内，而且**没有别的攻击手段**——
 *   它是「没什么可做时挪一挪」的一招：只会跃起的个体（比如鲤鱼王）用它换位；有正经攻击的伙伴不用它。
 *   例外：自己生命掉到 `ai.retreatBelow`（默认 0.5）以下且被贴住（近于 `ai.keepAway`）时，跳开来躲。
 * 对谁出手：不选对象——落点由 `target` 钩子算成「背离威胁」或「朝威胁靠到保持距离」的一个点。
 * 够不到怎么办：射程就是这一跳的距离，以自身为落点参照，不需要先走近谁。
 * 放完之后：只换了位置，交回共享顺序继续；高跃／低远由配置 leap 切换。
 */
namespace PokemonSkills {
    /** 只有跃起可用的个体才会考虑它；有攻击手段时只在被贴住且残血时跳开。 */
    function splashNoAttack(context: WorldBehavior.Context): boolean {
        const capabilities = context.capabilities || [];
        for (let index = 0; index < capabilities.length; index++) {
            const item = capabilities[index], data = item.data || {};
            if (item.protocols.indexOf("world_combat:attack") >= 0 && (data.pp === undefined || data.pp > 0)) return false;
        }
        return true;
    }

    CompanionBehavior.registerUse(splashId, {
        protocols: ["world_combat:cover"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
            if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
            if (splashNoAttack(context)) return true;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(item, "keepAway", 4)
                && CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(item, "retreatBelow", 0.5);
        },
        accepts: function () { return true; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        target: function (context, item, _target) {
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
            const range = item.data.range, copy: any = JSON.parse(JSON.stringify(self));
            if (!threat) { copy.point = [self.point[0], self.point[1], self.point[2] + range]; return copy; }
            const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2], length = Math.sqrt(dx * dx + dz * dz) || 1;
            const gap = CompanionBehavior.distance(self.point, threat.point), keep = CompanionBehavior.ai<number>(item, "keepAway", 4);
            if (gap <= keep && CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(item, "retreatBelow", 0.5))
                copy.point = [self.point[0] + dx / length * range, self.point[1], self.point[2] + dz / length * range];
            else {
                const want = Math.max(0.6, Math.min(range, gap - keep));
                copy.point = [self.point[0] - dx / length * want, self.point[1], self.point[2] - dz / length * want];
            }
            return copy;
        },
        priority: function (context, item, _target) {
            const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (!splashNoAttack(context)) return 50;
            return CompanionBehavior.distance(self.point, threat.point) > 1.5 ? 20 : 8;
        }
    });

    addPreferences(splashId, { leap: false, ai: { maxChase: 14, retreatBelow: 0.5, keepAway: 4 } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 3, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑蹦跳；调大更愿意远远地换位。" }),
        field(pathOf("ai.retreatBelow"), "残血阈值", "number", { min: 0.1, max: 0.9, step: 0.05,
            help: "有攻击手段时，生命低于这个比例且被贴住才跳开；调高更早逃，调低只在濒危时跳。" }),
        field(pathOf("ai.keepAway"), "保持距离", "number", { min: 1, max: 8, step: 1,
            help: "朝威胁落点时想保持的距离；跳过去会停在这个距离外，不会一头撞进对手身上。" })
    ]);
}
