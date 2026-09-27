/**
 * 狙击 / snipeshot 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记超远距离的单体点射。目标可见、敌对、存活，在 `ai.maxChase`（默认 20）以内就出手；
 *   够不到时交给共享接近逻辑先收身位。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.preferCrowd`（默认开）打开时，
 *   只有当**挡在射线上的**敌人不超过本招的穿透预算、这一枪确实能穿过去打到目标时才加价——侧面围观者不算掩护；
 *   若线上挡路者超过预算，这一枪会被前排拦下，反而降分。`ai.finishLow`（默认关）打开时残血目标排得更前。
 *   穿透预算与判定半径都按本招的实际个体公式 `p(...)` 求值，不写死近似值。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：水弹只结算锁定目标，伙伴交回共享顺序。
 */
namespace CompanionBehavior {
    function snipeshotFormula(item: WorldBehavior.Capability, context: WorldBehavior.Context): any {
        const scope = world(context);
        return { world: scope, actor: scope.source(), skill: PokemonSkills.skills["snipeshot"], detail: { values: item.data.config } };
    }

    function snipeshotWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 20);
    }

    /** 真正挡在「施法者→目标」那条线上的敌人；只算两人之间、被弹体半径与身体半宽覆盖到的，侧面围观者不计。 */
    function snipeshotBlockers(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): number {
        const self = source(context).point, end = target.point;
        const dx = end[0] - self[0], dy = end[1] - self[1], dz = end[2] - self[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (!(length > 1e-3)) return 0;
        const coverage = PokemonSkills.p("snipeshot", "radius", snipeshotFormula(item, context));
        const nearby = (context.facts.nearby || []) as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const px = other.point[0] - self[0], py = other.point[1] - self[1], pz = other.point[2] - self[2];
            const along = (px * dx + py * dy + pz * dz) / (length * length);
            if (along <= 0.03 || along >= 0.97) continue;
            const ox = px - dx * along, oy = py - dy * along, oz = pz - dz * along;
            const gap = Math.sqrt(ox * ox + oy * oy + oz * oz);
            const half = 0.5 * (typeof other.width === "number" ? other.width : 0.9);
            if (gap <= coverage + half) count++;
        }
        return count;
    }

    registerUse("snipeshot", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return snipeshotWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !snipeshotWants(context, item, target)) return 0;
            const range = CompanionBehavior.distance(source(context).point, target.point);
            if (range > item.data.range) return 6;
            let score = 20;
            if (ai<boolean>(item, "preferCrowd", true)) {
                const budget = Math.max(0, Math.round(PokemonSkills.p("snipeshot", "through", snipeshotFormula(item, context))));
                const blockers = snipeshotBlockers(context, item, target);
                // 线上挡路者不超过预算：前排正好是掩护，加分；超过预算：会被拦下，降分。
                if (blockers > budget) score -= 12;
                else if (blockers >= 1) score += 10;
            }
            if (ai<boolean>(item, "finishLow", false) && ratio(target) < 0.4) score += 10;
            return score;
        }
    });

    PokemonSkills.addPreferences("snipeshot", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("deadeye"), "屏息狙击", "boolean", {
            help: "开启（屏息狙击）：起手 +4 刻、射程 +3 格、威力 ×1.15、冷却 +6 刻，打得更远更重但出手更慢。关闭（速射狙击）：出手更快、冷却更短，但射程与单发稍逊。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 28, step: 1,
            help: "超过这个距离就不主动瞄准，先走近；越大越愿意在超远处先手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.preferCrowd"), "瞄准有掩护的目标", "boolean", {
            help: "开启：只有挡在射线上的敌人不超过穿透预算、这一枪确实能穿过去打到目标时才更愿意出手——前排正好是掩护；线上挡路者多到拦下子弹时反而降分。关闭则只按普通远程攻击排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一枪收尾；关闭则所有目标同价。"
        })
    ]);
}
