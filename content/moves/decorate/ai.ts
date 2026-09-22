/**
 * 装饰 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享辅助位的随手一放。
 *
 * 什么局面有意义：有可见威胁、自己在 ai.maxChase 以内，并且有一个还没被装扮的队友（共享的 world_combat:partner
 *   观测会给出交战中或带伤的伙伴；ai.prefer 决定照顾哪一类）。
 * 对谁出手：那个队友；不接受自己、也不接受敌人——这件作品要有一个佩戴者。
 * 候选之间怎么排：队友正在打威胁或刚受伤时 priority 92，否则 60，都会排在共享的 defend 之前先把装饰送出去。
 * 够不到怎么办：reach 就是本招射程，共享任务会先走近那个队友再送；ai.leaveStation 决定驻守时是否愿意离位。
 * 放完之后：队友的双攻大幅抬起，伙伴交回共享顺序，让队友去打这段窗口。
 * 不重复：队友身上已经有「已装扮」标记时不再送，标记过期后才会再考虑。
 */
namespace CompanionBehavior {
    registerUse("decorate", {
        protocols: ["world_combat:bolster"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target || target.health <= 0 || !target.visible) return false;
            const self = source(context);
            if (!target.friendly || target.ref === self.ref) return false;
            if (status(context, target, "decorated")) return false;
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            const chase = ai<number>(capability, "maxChase", 14);
            return distance(self.point, threat.point) <= chase && distance(self.point, target.point) <= chase;
        },
        accepts: function (context, _capability, target) {
            return target.friendly && target.ref !== source(context).ref && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !target.friendly || target.health <= 0) return 0;
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat) return 0;
            const engaged = target.attacking === threat.ref || (typeof target.hurtAgo === "number" && target.hurtAgo < 60);
            return engaged ? 92 : 60;
        }
    });

    const decorateChase = PokemonSkills.number("ai.maxChase", "装饰距离", 5, 30, 1);
    decorateChase.help = "威胁与队友都要在这个距离以内才考虑送装饰；越大越愿意跑远一点去给别人加满。";
    const decoratePrefer = PokemonSkills.choice("ai.prefer", "照顾对象", ["engaged", "injured"], ["交战中（出手更早）", "带伤的（留到残血）"]);
    decoratePrefer.help = "交战中：优先给正在打威胁的队友送装饰；带伤的：只照顾生命掉下来的队友，把装饰留给更危险的时刻。";
    const decorateStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    decorateStation.help = "开启后，收到「驻守」指令时也会离开原位去给队友送装饰。";

    PokemonSkills.addPreferences("decorate", { ai: { maxChase: 14, prefer: "engaged", leaveStation: false } },
        [decorateChase, decoratePrefer, decorateStation]);
}
