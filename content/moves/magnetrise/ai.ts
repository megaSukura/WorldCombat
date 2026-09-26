/**
 * 电磁飘浮 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、自己还没浮起来，且它在 ai.maxChase 以内；
 *   ai.opening=躲地面招（默认）时只在附近有地面属性威胁、或贴地近战敌人贴到 4.5 格时才起浮——
 *   这招本来就是躲地面招的，对着砍不动的敌人不必浪费；=随时时见威胁就起浮，当常备防御。
 * 对谁出手：自己；不需要接近，原地完成（reach 0，accepts 只收自己）。
 * 够不到怎么办：不需要够——威胁太远就先不理会，等它靠近。
 * 候选之间怎么排：附近是地面属性威胁时排在更前（72），其余局面 55；地面前排优先于普通接近。
 * 放完之后：身体真的低空托起来，地面招打不到、贴地近战被同极弹开；跟随移动受真实空间与原生碰撞限制。
 * 配置 field（滑翔／锚定）改变时长、弹力与移速；ai.maxChase、ai.opening 决定追多远、什么时候起浮。
 */
namespace PokemonSkills {
    function magnetriseGroundThreat(context: WorldBehavior.Context, threat: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, threat);
        return !!facts && !!facts.types && facts.types.indexOf("ground") >= 0;
    }

    CompanionBehavior.registerUse(magnetriseId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, magnetriseStatus)) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 16)) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "ground") !== "ground") return true;
            return magnetriseGroundThreat(context, threat)
                || (threat.grounded === true && CompanionBehavior.distance(self.point, threat.point) <= 4.5);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability) {
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat) return 0;
            return magnetriseGroundThreat(context, threat) ? 72 : 55;
        }
    });

    addPreferences(magnetriseId, { ai: { maxChase: 16, opening: "ground", leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑起浮；调小只为贴身自卫，调大在更远处就做准备。" }),
        choice("ai.opening", "出手时机", ["ground", "anytime"], ["躲地面招", "随时"]),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
