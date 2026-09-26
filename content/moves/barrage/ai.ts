/**
 * 投球 / barrage 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带投球的伙伴把它当**远程连投**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 11，本族最远）以内就出手；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。高抛式能越过掩体，所以对躲在墙后的目标也照常
 *   加分；平投式只有在到目标有射线时才加分，被挡住时不假装能反弹命中，只按普通直投的低分出手。
 *   目标走位慢时（高抛和反弹都更容易落在它身上）再给一点加分。
 * 够不到怎么办：reach 就是本招射程，不够先走近；不用贴脸，站远一点就能投。
 * 放完之后：这一串投完就收手，交回共享交战计划等冷却。
 * 优先级：基础 14；已在射程内 +5；高抛式 +4（越过掩体），平投式`ai.cover` 开启且到目标有射线 +6、被遮挡 −3；目标慢 +3。
 *   仅剩本招可选时，它仍在普通顺序里被选中。
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

    /** 本个体是否选了高抛式；高抛能越过掩体，平投会被墙挡。 */
    function barrageLobs(item: WorldBehavior.Capability): boolean {
        const config = item.data.config;
        return !!(config && config.lob === true);
    }

    /** 目标当前的水平速度；没有速度事实时按「站住」处理。 */
    function barrageSpeed(target: Entity): number {
        const velocity = target.velocity;
        if (!velocity || velocity.length < 3) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
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
            if (barrageLobs(item)) {
                // 高抛越过掩体，躲在墙后也照投。
                score += 4;
            } else if (ai<boolean>(item, "cover", true)) {
                // 平投只在有射线时加分；被挡住时不假装能反弹命中，只低分直投。
                score += barrageClear(context, target) ? 6 : -3;
            }
            if (barrageSpeed(target) < 0.03) score += 3;
            return Math.max(1, score);
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
            help: "仅对平投式生效：与目标之间没有掩体遮挡时排得更前——平投的球会被墙挡住；躲在墙后的目标排后，不会假装能反弹命中。高抛式能越过掩体，忽略这一项。"
        })
    ]);
}
