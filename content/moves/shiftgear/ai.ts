/**
 * 换档 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享强化位的随手一放。
 *
 * 什么局面有意义：有威胁但尚未贴身（距离 ≥ ai.minGap），且有交战需求时才准备换挡。
 * 什么时候最想出手：威胁在 ai.minGap 之外、ai.maxChase 之内时抢在共享顺序前——趁还能拉开距离时换好挡。
 * 换哪一档：AI 沿用玩家为该个体配置的挡位；扭力档（攻击 +2）在近身时更想用，超速档（速度 +2）在拉远追人时更想用，
 *   距离越贴合该档用途，优先级越高。
 * 不重复同档：本挡位仍在效应里时不再换挡，等窗口到期或玩家改成另一档时才重新出手。
 * 放完之后：既然换的是「追得上也打得动」的挡，伙伴会顺势朝最近的威胁压上一小段，把新速度用掉；
 *   驻守/看守命令下不强追，交回原站位。
 */
namespace PokemonSkills {
    const shiftgearGearEffect = "world_combat:shiftgear_gear";
    const shiftgearFact = "world_combat:shiftgear-gear";

    // 当前挡位（-1 无、0 扭力、1 超速）：AI 用它判断是否已经在用同一档。
    CompanionBehavior.registerFact(shiftgearFact, function (access: CombatWorld, actor: CombatActor, _argument: any): number {
        const effect = MobEffects.read(access, actor, shiftgearGearEffect);
        return effect === null ? -1 : effect.amplifier();
    });

    function shiftgearWanted(capability: WorldBehavior.Capability): number {
        return capability && capability.data.config && capability.data.config.gear === 0 ? 0 : 1;
    }

    function shiftgearThreatDistance(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return -1;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
    }

    function shiftgearAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        if (context.facts.intent === "hold" || context.facts.intent === "stay" || context.facts.intent === "work") return;
        if (!progress.chaseUntil) progress.chaseUntil = context.tick + 30;
        if (context.tick > progress.chaseUntil) return;
        const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
        if (!threat || threat.health <= 0) return;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, threat.point) <= 3) return;
        const navigation = CompanionBehavior.navigate(context, threat.point, 2);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse("shiftgear", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (["atk", "spe"].every(function (stat) { return CompanionBehavior.stage(context, self, stat) >= 6; })) return false;
            // 本案同一挡位仍在线上、攻击或速度都还没被封顶时，不重复换同一档。
            const active = CompanionBehavior.fact<number>(context, shiftgearFact, self);
            if (active === shiftgearWanted(capability)) return false;
            const gap = shiftgearThreatDistance(context);
            if (gap < 0) return false;
            if (gap <= CompanionBehavior.ai<number>(capability, "minGap", 4)) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        priority: function (context, capability) {
            if (context.facts.intent === "hold") return 0;
            const gap = shiftgearThreatDistance(context);
            if (gap < 0) return 40;
            const minGap = CompanionBehavior.ai<number>(capability, "minGap", 4);
            if (gap <= minGap) return 0;
            const maxChase = CompanionBehavior.ai<number>(capability, "maxChase", 16);
            if (gap > maxChase) return 0;
            const near = Math.max(minGap, (minGap + maxChase) / 2);
            // 扭力档偏好近身、超速档偏好拉远追人，各按该档的实际用途把优先级往合适距离抬。
            const wanted = shiftgearWanted(capability);
            const suited = wanted === 0 ? gap <= near : gap >= near;
            return suited ? 115 : 105;
        },
        after: function (context, capability, target, progress) { return shiftgearAfter(context, progress); }
    });

    addPreferences("shiftgear", {}, [
        field(pathOf("gear"), "挡位", "choice", {
            options: [
                { value: 0, label: "扭力档：攻击 +2、速度 +1" },
                { value: 1, label: "超速档：攻击 +1、速度 +2" }
            ],
            help: "两档在攻击与速度之间分配相同的总提升；扭力偏攻击，超速偏速度。50级起两档都额外提升1级攻击。换到另一档会替换并重新计时，同一档仍在生效时不能重复换。"
        }),
        field(pathOf("ai.maxChase"), "换挡距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内就考虑换挡；越大越早准备，也越可能被打断。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 10, step: 1,
            help: "威胁近于这个距离时不再换挡，直接交回普通次序，不为提速站着挨打。"
        })
    ]);
}
