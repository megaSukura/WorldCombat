/**
 * 鬼火 / willowisp 的 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带鬼火的伙伴在没有攻击可用时用它。
 * 只对还没被点着的目标出手（读共享身份 burn，别人点的火也算）；共享门禁判定这个目标烧不上
 * （火属性、免灼特性、守护等）就不出手，免得白飞一趟。够不到就先交给共享接近逻辑走近。
 *
 * 对谁出手：优先“已知的物理/近战输出”。读目标当前有效物攻与特攻（`combatStats`）：物攻明显高于特攻
 * 的目标最值得先烧；正在贴上来或正在攻击施法者的近战威胁再加一档。纯法系目标优先级回落。
 * 默认开 `ai.preferPhysical`；关掉就对所有还没点着的敌人一视同仁。Boss 免 burn 时不浪费。
 *
 * 优先级：基础 34；物攻≥特攻×1.15 加 24、仅高于特攻加 12；近战威胁加 10。
 */
namespace PokemonSkills {
    /** 烧得上的目标才值得出手：共享门禁是唯一裁决（火属性、免灼特性、被挡下都算烧不上）。 */
    function willowispBurnAllowed(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const actor = world.actor(target.ref);
        if (!actor) return true;
        return CombatStatus.allowed(world, actor, "burn", 1, 0).allowed;
    }

    /** 目标的物理倾向：有效物攻相对特攻越高，越值得先烧。2 明显物理、1 偏物理、0 法系或未知。 */
    function willowispPhysical(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const facts = CompanionBehavior.combatStats(context, target);
        const stats = facts && facts.stats;
        if (!stats) return 0;
        const attack = Number(stats.atk), special = Number(stats.spa);
        if (!isFinite(attack) || attack <= 0) return 0;
        if (isFinite(special) && special > 0) return attack >= special * 1.15 ? 2 : attack > special ? 1 : 0;
        return 1;
    }

    /** 近战威胁：正在攻击施法者，或已经贴到足以近身的位置。 */
    function willowispMelee(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (target.attacking && target.attacking === self.ref) return true;
        return CompanionBehavior.distance(self.point, target.point) <= 3;
    }

    CompanionBehavior.registerUse("willowisp", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.status(context, target, "burn")) return false;
            if (!willowispBurnAllowed(context, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || CompanionBehavior.status(context, target, "burn")) return 0;
            if (!willowispBurnAllowed(context, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return 0;
            const threat = CompanionBehavior.ai<boolean>(capability, "preferPhysical", true) ? willowispPhysical(context, target) * 12 : 0;
            return 34 + threat + (willowispMelee(context, target) ? 10 : 0);
        }
    });

    addPreferences("willowisp", {}, [
        field(pathOf("swift"), "迅捷取向", "boolean", {
            help: "开启：鬼火飞得更快、转得更紧（速度 ×1.35、转向 ×1.25），但灼伤更短（×0.7），更快命中也更早熄灭；关闭：盘绕取向，鬼火更慢但烧得更久（×1.15），更能拖住目标。"
        }),
        field(pathOf("ai.maxChase"), "点着距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动放鬼火，先走近。越大越执着追击，也越容易在开阔地被目标甩掉。"
        }),
        field(pathOf("ai.preferPhysical"), "优先物理威胁", "boolean", {
            help: "开启：优先把鬼火丢向物攻明显高于特攻、或正贴上来近战的目标；关闭：对所有还没被点着的敌人一视同仁。鬼火不造成直接伤害，这个选择只改出手对象。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为放鬼火离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
