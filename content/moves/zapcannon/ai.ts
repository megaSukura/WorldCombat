/**
 * 电磁炮 / zapcannon —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上。带电磁炮的伙伴把它当作开场的重手段：
 *   目标可见、敌对、存活、在 `ai.maxChase`（默认 17）以内、中间有一条通视线，才会蓄这一炮；更远交给共享接近逻辑。
 * 对谁出手：`ai.seekFast`（默认开）打开时，正在快速移动的目标优先级最高——一炮钉住冲上来的那个；
 *   `ai.longShot`（默认开）打开时，离得越远越值（在射程六成以外才抬价），因为蓄力久、贴身乱战里容易被打断。
 *   已经麻住的目标不重复下手，把机会留给别的控制手段。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再开炮；靠墙的目标先等共享接近逻辑找到射界。
 * 放完之后：命中者带上一段必定的麻痹，伙伴交回共享顺序；长冷却期间由共享顺序改用别的招。
 * 优先级：基础 34（未麻）／8（已麻）；快速移动 +14，位于射程六成以外 +6。
 */
namespace PokemonSkills {
    /** 目标是否正在快速移动：一炮钉住它最值。 */
    function zapcannonFast(target: CompanionBehavior.Entity): boolean {
        const velocity = target.velocity;
        if (!velocity) return false;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.08;
    }

    CompanionBehavior.registerUse(zapcannonId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 17)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 17)) return 0;
            let value = CompanionBehavior.status(context, target, "paralysis") ? 8 : 34;
            if (CompanionBehavior.ai<boolean>(capability, "longShot", true) && gap > capability.data.range * 0.6) value += 6;
            if (CompanionBehavior.ai<boolean>(capability, "seekFast", true) && zapcannonFast(target)) value += 14;
            return value;
        }
    });

    addPreferences(zapcannonId, {}, [
        field(pathOf("quickload"), "速装式", "boolean", {
            help: "开启：蓄力 ×0.6、弹速 ×1.3、转向 ×1.35、冷却 ×0.9，更容易在走位中打中，但威力 ×0.78、爆开范围 ×0.8、麻痹时长 ×0.85；关闭：满装，蓄得久、弹更重更慢、麻得更长。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 26, step: 1,
            help: "超过这个距离就不主动开炮，先走近；越大越愿意从更远处抬手。"
        }),
        field(pathOf("ai.seekFast"), "优先快目标", "boolean", {
            help: "开启后，正在快速移动的目标优先级最高，用一炮把它钉住；关闭则所有威胁一视同仁。"
        }),
        field(pathOf("ai.longShot"), "远距优先", "boolean", {
            help: "开启后，位于射程六成以外的目标更优先——蓄力久，隔开距离才放得安稳；关闭则贴到射程内就开炮。"
        })
    ]);
}
