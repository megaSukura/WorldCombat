/**
 * 花粉团 / pollenpuff 的伙伴 AI 用途。
 *
 * 同一团花粉有两个用途，注册在两条协议上：
 *   `world_combat:attack`——朝敌人扔，炸伤圈内敌人；
 *   `world_combat:heal`  ——朝受伤的同伴（或自己）扔，散成回血的花粉。是否主动照看别的同伴由**根配置
 *     `helpFriends`**（默认开）决定，阈值由 `ai.healBelow` 决定；关掉它只改变 AI 挑同伴的倾向，
 *     手动落点仍按真实敌我关系结算。
 * 什么局面下出手：考虑距离 `ai.maxChase`（默认 9）内有可见、敌对且在血量内的目标，或（开着照看同伴时）
 *   有生命低于 `ai.healBelow`（默认 0.8）的同伴。
 * 对谁出手：攻击分支挑最近的敌人；救助分支挑生命比例最低的同伴（共享 `world_combat:patient` 感官已经排序）。
 * 优先级：同伴生命低于 0.4 时抬到 100 抢在共享交战次序前先救；落点同时能救到受伤同伴又炸到敌人时再抬一段
 *   （同一团花粉的两种结果都兑现）。
 * 站位：共享接近逻辑把身位收到投掷射程以内，再朝目标落点抛出。
 * 配置：`nurture`（偏回复）改两向数值；`helpFriends` 决定是否照顾同伴；`ai.maxChase`／`ai.healBelow` 调范围与阈值。
 */
namespace PokemonSkills {
    /** 混战落点参考半径：同一团花粉大致能同时照顾到的范围，只用于 AI 估值。 */
    const pollenpuffMixedRadius = 2.2;

    function pollenpuffHelp(item: WorldBehavior.Capability): boolean { return item.data.config.helpFriends !== false; }

    function pollenpuffAccepts(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.health <= 0) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 9)) return false;
        if (target.friendly) {
            if (String(target.ref) !== String(self.ref) && !pollenpuffHelp(item)) return false;
            return target.health < target.maximum && CompanionBehavior.ratio(target) < CompanionBehavior.ai<number>(item, "healBelow", 0.8);
        }
        return target.visible;
    }

    /** 落点附近同时有受伤同伴与可见敌人时返回加成，用来抬高「一团两用」的落点。 */
    function pollenpuffMixed(context: WorldBehavior.Context, item: WorldBehavior.Capability, point: number[]): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], threshold = CompanionBehavior.ai<number>(item, "healBelow", 0.8);
        let friends = 0, foes = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.health <= 0 || CompanionBehavior.distance(other.point, point) > pollenpuffMixedRadius) continue;
            if (other.friendly) { if (other.health < other.maximum && CompanionBehavior.ratio(other) < threshold) friends++; }
            else if (other.visible) foes++;
        }
        return friends > 0 && foes > 0 ? 8 : 0;
    }

    CompanionBehavior.registerUse("pollenpuff", {
        protocols: ["world_combat:attack", "world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return pollenpuffAccepts(context, capability, target);
        },
        accepts: function (context, capability, target) { return pollenpuffAccepts(context, capability, target); },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (target.friendly) {
                if (String(target.ref) !== String(CompanionBehavior.source(context).ref) && !pollenpuffHelp(capability)) return 0;
                if (CompanionBehavior.ratio(target) < 0.4) return 100;
                return 40 + pollenpuffMixed(context, capability, target.point);
            }
            if (!pollenpuffAccepts(context, capability, target)) return 0;
            return 22 + pollenpuffMixed(context, capability, target.point);
        }
    });

    addPreferences("pollenpuff", {}, [
        field(pathOf("nurture"), "偏回复", "boolean", {
            help: "开启：回复比例约 ×1.3、散开半径约 ×1.05，代价爆炸威力约 ×0.8、冷却 +6 刻，用来救助同伴与自己。关闭（偏伤害）：爆炸威力约 ×1.25，代价回复比例约 ×0.75，用来砸敌人。"
        }),
        field(pathOf("helpFriends"), "照看同伴", "boolean", {
            help: "开启：伙伴会把花粉团扔向受伤的同伴（生命低于阈值时），把自己的一次出手让给救助。关闭：只对自己与敌人用，专注输出；手动把团子扔到同伴身边仍然照常回血。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在目标离自己这么远以内时才考虑花粉团；调小只在贴身时扔，调大愿意先追进去。"
        }),
        field(pathOf("ai.healBelow"), "救助阈值", "number", {
            min: 0.3, max: 0.95, step: 0.05,
            help: "同伴生命低于该比例时才把团子当治疗扔过去；调低更倾向继续输出，调高一有人掉血就去救。"
        })
    ]);
}
