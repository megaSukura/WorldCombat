/**
 * 电磁炮 / zapcannon —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上。带电磁炮的伙伴把它当作开场的重手段：
 *   目标可见、敌对、存活、在 `ai.maxChase`（默认 17）以内、中间有一条通视线，才会蓄这一炮；更远交给共享接近逻辑。
 * 对谁出手：炮口锁死、弹又慢，所以优先移动方向可预测的目标。`ai.preferSteady`（默认开）抬价慢速/站定的目标，
 *   `ai.preferLarge`（默认开）抬价大体型目标——越大越容易被慢弹扫到；不再因为目标跑得快就优先开炮。
 *   `ai.longShot`（默认开）打开时，离得越远越值（在射程六成以外才抬价），因为蓄力久、贴身乱战里容易被打断。
 *   已经麻住的目标不重复下手，把机会留给别的控制手段。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再开炮；靠墙的目标先等共享接近逻辑找到射界。
 * 放完之后：真实造成伤害后目标带上麻痹，伙伴交回共享顺序；长冷却期间由共享顺序改用别的招。
 * 优先级：基础 34（未麻）／8（已麻）；慢速目标 +10，大体型 +8，位于射程六成以外 +6。
 */
namespace PokemonSkills {
    /** 目标移动是否可预测（慢速或站定）：慢弹更容易打中它。 */
    function zapcannonSteady(target: CompanionBehavior.Entity): boolean {
        const velocity = target.velocity;
        if (!velocity) return true;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) <= 0.08;
    }

    /** 目标体型是否够大：碰撞箱越大越容易被慢弹扫到。 */
    function zapcannonLarge(target: CompanionBehavior.Entity): boolean {
        return typeof target.height === "number" && target.height >= 1.4;
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
            if (CompanionBehavior.ai<boolean>(capability, "preferSteady", true) && zapcannonSteady(target)) value += 10;
            if (CompanionBehavior.ai<boolean>(capability, "preferLarge", true) && zapcannonLarge(target)) value += 8;
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
        field(pathOf("ai.preferSteady"), "优先慢速目标", "boolean", {
            help: "开启后，移动慢或站定的目标优先——炮口锁死、弹又慢，打可预测的目标更稳；关闭则不看目标速度。"
        }),
        field(pathOf("ai.preferLarge"), "优先大体型", "boolean", {
            help: "开启后，碰撞箱更大的目标优先，慢弹更容易扫到它；关闭则所有威胁一视同仁。"
        }),
        field(pathOf("ai.longShot"), "远距优先", "boolean", {
            help: "开启后，位于射程六成以外的目标更优先——蓄力久，隔开距离才放得安稳；关闭则贴到射程内就开炮。"
        })
    ]);
}
