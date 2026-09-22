/**
 * 再来一次 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见的威胁，目标刚用过的最后一手还在 ai.maxAge 之内、还能再用、不带 failencore，
 *   且它身上还没有回声。刚做过变化（布置／强化）的目标最值得点名——那是把它的下一步锁死。
 * 对谁出手：当前威胁；焦点目标直接通过。
 * 够不到怎么办：reach 就是点名距离，够不到由共享任务走近。
 * 放完之后：回声自己撑着；换招前 12 秒内不重复点名同一个目标，把 PP 留着。
 * 候选之间怎么排：锁住变化招给 70（把它的布置锁死），锁住低威力招给 45，其余 30；都插在共享交战次序里当软控。
 * 配置：ai.maxAge 决定多久以前的出手还值得点名；ai.maxChase 决定追多远；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    /** 只读、决策内缓存：目标最近一次出手的身份、距今刻数与性质；没有出手记录返回 null。 */
    registerFact("world_combat:encore-target", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return null;
        const last = NativeEffects.lastMove(access, actor);
        if (last === null) return null;
        const template = CobblemonCombat.moveTemplate(last.id);
        return { id: last.id, since: Math.max(0, access.tick() - last.tick), category: String(template.category()),
            power: template.power(), failencore: NativeLoadout.facts(template).flags.failencore ? 1 : 0 };
    });

    function encoreInfo(context: WorldBehavior.Context, target: Entity): any {
        return fact<any>(context, "world_combat:encore-target", target);
    }
    function encoreWorth(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (status(context, target, "encore")) return false;
        const info = encoreInfo(context, target);
        if (!info || info.failencore) return false;
        return info.since <= ai<number>(capability, "maxAge", 160);
    }

    registerUse("encore", {
        protocols: ["world_combat:control"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return false;
            if (!encoreWorth(context, capability, target)) return false;
            const self = source(context);
            if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(capability, "maxChase", 12)) return false;
            return !recent(context, "control", target.ref, 240);
        },
        accepts: function (context, capability, target) { return encoreWorth(context, capability, target); },
        priority: function (context, capability, target) {
            if (!target || !encoreWorth(context, capability, target)) return 0;
            const info = encoreInfo(context, target);
            return info.category === "status" ? 70 : info.power <= 80 ? 45 : 30;
        }
    });

    PokemonSkills.addPreferences("encore", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxAge"), "点名时限", "number", {
            min: 40, max: 400, step: 20, display: { scale: 0.05, suffix: " 秒" },
            help: "目标在这一段时间内出过手才值得点名；调小只点刚出手的，调大愿意点更久以前的。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "点名距离", "number", {
            min: 2, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑点名；调小只在贴身时出手，调大愿意追出去。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去点名。"
        })
    ]);
}
