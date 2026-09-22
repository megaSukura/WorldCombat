/**
 * 克命爪 / direclaw —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 近身位上；带克命爪的伙伴把它当贴身一记重爪。
 *   对可见、敌对、存活、在 `ai.maxChase`（默认 6）以内、且中间有通视线的目标出手；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferUnfazed`（默认开）打开时，还没带着任一主异常（中毒／麻痹／睡眠／灼伤／冰冻）的目标更高价，
 *   别把这一记三选一的余毒丢在已经有状态的人身上。
 * 够不到怎么办：2.8 格左右的短射程交给 `reach`，共享任务把身位收进射程后再出手。
 * 放完之后：目标或被按上一种余毒，伙伴交回共享顺序继续交战。
 * 优先级：基础 22（已在射程内）／4（还要先走近）；未带主异常 +8。
 */
namespace PokemonSkills {
    /** 目标是否已经带着任一主异常，用来避免浪费三选一的余毒。 */
    function direclawAfflicted(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.status(context, target, "poison")
            || CompanionBehavior.status(context, target, "paralysis")
            || CompanionBehavior.status(context, target, "sleep")
            || CompanionBehavior.status(context, target, "burn")
            || CompanionBehavior.status(context, target, "frozen");
    }

    CompanionBehavior.registerUse(direclawId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return 0;
            let value = gap <= capability.data.range ? 22 : 4;
            if (CompanionBehavior.ai<boolean>(capability, "preferUnfazed", true) && !direclawAfflicted(context, target)) value += 8;
            return value;
        }
    });

    addPreferences(direclawId, {}, [
        field(pathOf("deep"), "深创", "boolean", {
            help: "开启：余毒几率 +0.15、余毒时长 ×1.25、暴击几率 +0.06，代价是爪伤 ×0.88、起手 +1 刻、冷却 ×1.12。关闭：疾撕式，爪伤 ×1.08、起手 −1 刻、冷却 ×0.95，余毒与暴击回到基准。"
        }),
        field(pathOf("favor"), "余毒倾向", "choice", {
            options: [{ value: 0, label: "随机" }, { value: 1, label: "中毒" }, { value: 2, label: "麻痹" }, { value: 3, label: "睡眠" }],
            help: "指定命中后从三种余毒里挑哪一种（随机表示三种等概率）。对厚血目标按中毒、对快攻按麻痹、对高危目标按睡眠。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动出爪，先走近；越大越愿意从更远处扑上去。"
        }),
        field(pathOf("ai.preferUnfazed"), "优先无异常目标", "boolean", {
            help: "开启后，还没带着任一主异常的目标优先级更高，别把这一记三选一的余毒丢在已经有状态的人身上。"
        })
    ]);
}
