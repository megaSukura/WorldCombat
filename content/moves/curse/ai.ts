/**
 * 诅咒 的伙伴 AI 用途：这招自己的一套出手计划，按使用者是不是幽灵分成两种用法。
 *
 * 什么局面有意义：场上有看得见的威胁，且距离在 ai.maxChase 以内。
 *   幽灵个体：目标还没中咒、自己生命高于 ai.bloodFloor（默认 0.6，押出半条命后还站得住）时，把债记上去。
 *   非幽灵个体：自己身上没有契约印记时，押敏捷换凶悍与硬壳。
 * 对谁出手：当前威胁（诅咒需要一个凝视的对象）；够不到先交给共享接近逻辑。
 * 候选之间怎么排：幽灵形态在目标偏残血时抬到 45（收尾），平时 30；非幽灵形态 25。
 * 放完之后：绑定效果替施法者慢慢收债或维持交换等级，交回共享顺序继续战斗。
 * 配置：bloodpact 切换血契／稳咒；ai.maxChase、ai.bloodFloor、ai.leaveStation 决定追多远、敢押多狠、驻守时是否离位。
 */
namespace CompanionBehavior {
    function curseSelfGhost(context: WorldBehavior.Context): boolean {
        const facts = pokemonFacts(context, source(context));
        return !!facts && facts.types.indexOf("ghost") >= 0;
    }

    const curseChase = PokemonSkills.number("ai.maxChase", "凝视距离", 4, 24, 1);
    curseChase.help = "威胁进入这个距离内才考虑诅咒；调小只在贴身时出手，调大愿意从更远处先记上债。";
    const curseBloodFloor = PokemonSkills.number("ai.bloodFloor", "敢押下限", 0.4, 0.9, 0.05);
    curseBloodFloor.help = "幽灵个体生命高于该比例才押半条命；调低更敢用命换债，调高只在满血附近诅咒。";
    const curseLeave = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    curseLeave.help = "开启后，收到驻守命令时也会为诅咒离开原位。";

    PokemonSkills.addPreferences("curse", { bloodpact: false, ai: { maxChase: 14, bloodFloor: 0.6, leaveStation: false } },
        [curseChase, curseBloodFloor, curseLeave]);

    registerUse("curse", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!context.senses["world_combat:threat"]) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(capability, "leaveStation", false)) return false;
            if (!target) return true;
            const self = source(context);
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (curseSelfGhost(context)) {
                if (status(context, target, "curse")) return false;
                if (ratio(self) <= ai<number>(capability, "bloodFloor", 0.6)) return false;
            } else if (status(context, self, "cursed_pact")) return false;
            return distance(self.point, target.point) <= ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !curseSelfGhost(context)) return 25;
            return ratio(target) < 0.5 ? 45 : 30;
        }
    });
}
