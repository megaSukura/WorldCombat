/**
 * 起草 / trailblaze 的伙伴 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标、且目标在 `ai.maxChase` 之内时列入候选（本招靠窜跃接近，够不到交给共享接近逻辑）。
 * 这一跳的分量看起跳点：`ai.preferCover` 开启时，脚边正好有草木就把 priority 抬高一截——顺着草丛窜出去更远更重、还多带一档速度；
 * 代价是可能为了踩进草丛而绕路或晚出手。关闭则只看距离与威胁。
 * 放完之后：既然刚提了速，伙伴会顺势朝最近的威胁压上一小段，把新速度用掉。
 */
namespace PokemonSkills {
    function trailblazeThreat(context: WorldBehavior.Context): WorldBehavior.Bag | null {
        return context.senses["world_combat:threat"] || null;
    }

    function trailblazeHasCover(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        const actor = world.actor(self.ref);
        return actor !== null && trailblazeCoverOf(world, actor);
    }

    function trailblazeAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        if (!progress.chaseUntil) progress.chaseUntil = context.tick + 30;
        if (context.tick > progress.chaseUntil) return;
        const threat = trailblazeThreat(context) as CompanionBehavior.Entity | null;
        if (!threat || threat.health <= 0) return;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, threat.point) <= 3) return;
        const navigation = CompanionBehavior.navigate(context, threat.point, 2);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse("trailblaze", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "preferCover", true) && trailblazeHasCover(context)) score += 16;
            return score;
        },
        after: function (context, capability, target, progress) { return trailblazeAfter(context, progress); }
    });

    addPreferences("trailblaze", {}, [
        field(pathOf("overshoot"), "穿草而过", "boolean", {
            help: "开启：命中后不停，顺势多掠一段落在对手身后，把它甩在背后并顺势拉开；关闭：就地收步停在对手身前，站位更稳。"
        }),
        field(pathOf("ai.maxChase"), "窜跃距离", "number", {
            min: 2, max: 20, step: 1,
            help: "对手离自己这么远以内才考虑窜出去；调小只贴脸出手，调大愿意从更远处起跳。"
        }),
        field(pathOf("ai.preferCover"), "优先草丛起跳", "boolean", {
            help: "开启：脚边有草木时优先窜跃，跳得更远更重还多带一档速度；关闭：只看距离与威胁，不为踩草绕路。"
        })
    ]);
}
