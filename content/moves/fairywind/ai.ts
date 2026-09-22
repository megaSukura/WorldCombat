/**
 * 妖精之风 / fairywind 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 13）格之内；更远交给共享接近逻辑。
 *   这是便宜、回得快的一条线，偏好从稍远处先手。
 * 对谁出手：`ai.through`（默认开）打开时，瞄准方向后方还排着别的敌人就把它抬到优先——一穿一串才是它的价值；
 *   关闭则只按普通远程攻击排序。
 * 够不到怎么办：reach 就是本招射程，不够先走近；风会继续走，排成一线的人躲不掉。
 * 放完之后：一发即散，交回共享交战计划等冷却再刮下一阵。
 */
namespace PokemonSkills {
    /** 瞄准方向上、射程内还排着几个敌人（供贯穿加分）。 */
    function fairywindLined(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const reach = Number(capability.data.range) || 0;
        const ax = target.point[0] - self.point[0], az = target.point[2] - self.point[2];
        const length = Math.sqrt(ax * ax + az * az);
        if (length < 0.5) return 1;
        const ux = ax / length, uz = az / length;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible || other.ref === self.ref) continue;
            const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
            const along = dx * ux + dz * uz;
            if (along < 0 || along > reach + 1) continue;
            if (Math.abs(dx * uz - dz * ux) <= 1.2) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(fairywindId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return !target.friendly && target.health > 0 && target.visible
                && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                    <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "through", true)) return 20;
            const lined = fairywindLined(context, capability, target);
            return lined >= 2 ? 20 + Math.min(16, (lined - 1) * 6) : 17;
        }
    });

    addPreferences(fairywindId, {}, [
        field(pathOf("wide"), "广旋式", "boolean", {
            help: "开启：风团判定 ×1.5、贯穿 +1、侧甩 ×1.4，但单次威力 ×0.85、起手 +1 刻、冷却 +5 刻——扫得更宽更散。关闭（轻掠式，默认）：单次 ×1.15、出手快、冷却短，但判定窄、贯穿少、侧甩弱。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动刮风，先走近；越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.through"), "穿一串", "boolean", {
            help: "开启：瞄准方向后方还排着别的敌人时优先刮风，一阵风穿一串；关闭：不数直线，当普通远程攻击排序。"
        })
    ]);
}
