/**
 * 投球 / barrage 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带投球的伙伴把它当**远程连投**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 11，本族最远）以内就出手；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.cover`（默认开）打开时，**与目标之间没有
 *   掩体遮挡**的目标排得更前——平投的球会被墙挡住，高抛的球虽然能越过掩体，但慢、容易被走位躲开；
 *   躲在墙后的目标排后。
 * 够不到怎么办：reach 就是本招射程，不够先走近；不用贴脸，站远一点就能投。
 * 放完之后：这一串投完就收手，交回共享交战计划等冷却。
 * 优先级：基础 14；已在射程内 +5；`ai.cover` 开启且到目标有射线 +6。仅剩本招可选时，它仍在普通顺序里被选中。
 */
namespace CompanionBehavior {
    function barrageWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 11);
    }

    /** 施法者与目标之间有没有被方块挡住；读不到世界时按「有射线」处理。 */
    function barrageClear(context: WorldBehavior.Context, target: Entity): boolean {
        try {
            const world = CompanionBehavior.world(context);
            return world.clear(CompanionBehavior.point(source(context).point), CompanionBehavior.point(target.point));
        } catch (ignored) { return true; }
    }

    registerUse("barrage", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return barrageWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !barrageWants(context, item, target)) return 0;
            const gap = CompanionBehavior.distance(source(context).point, target.point);
            let score = 14;
            if (gap <= item.data.range) score += 5;
            if (ai<boolean>(item, "cover", true) && barrageClear(context, target)) score += 6;
            return score;
        }
    });

    PokemonSkills.addPreferences("barrage", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("lob"), "高抛式", "boolean", {
            help: "开启（高抛）：球沿弧线越过掩体落到目标头上，掩体挡不住；代价是球飞得慢（目标容易走位躲开）、散布更大、单球威力 ×0.9、冷却 +2 刻。关闭（平投）：球直而快、散布小、单球威力 ×1.15；代价是会被墙与掩体挡住（撞上只弹一下，不伤人）。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 13, step: 1,
            help: "超过这个距离就不主动投球，先走近。本招射程较远，默认值也大。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.cover"), "优先无遮挡的目标", "boolean", {
            help: "开启：与目标之间没有掩体遮挡时排得更前——平投的球会被墙挡住；躲在墙后的目标排后。关闭则所有目标同价。"
        })
    ]);
}
