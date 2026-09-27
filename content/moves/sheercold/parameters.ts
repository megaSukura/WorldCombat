/** sheercold: one finite world-HP budget per foe inside a real 3D cold zone; ice immunity stays, no instant kill. */
namespace PokemonSkills {
    export const sheercoldId = "sheercold";
    export const sheercoldScene = "world_combat:move_sheercold";
    export const sheercoldHitText = "world_combat.move.sheercold.text.hit";
    export const sheercoldMissText = "world_combat.move.sheercold.text.miss";
    export const sheercoldIceText = "world_combat.move.sheercold.text.immune";
    /** 表现里冻结圈的参考半径（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const sheercoldReference = 2.6;
    /** 一次结霜最多结算的受体数与总伤害上界（世界生命）。 */
    export const sheercoldVictimCap = 4;
    export const sheercoldDamageCap = 400;

    /** 使用者是否冰属性：自定义纯事实 self.ice，供 mark 公式与悬浮共用。 */
    defineFacts(sheercoldId, function (context: FactContext): Formula.Facts {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !world.valid(actor) || String(actor.domain()) !== "cobblemon") return { read: function () { return undefined; } };
        const ice = PokemonDamage.combatants.read(world, actor).types.indexOf("ice") >= 0;
        return { read: function (id: string) { return id === "self.ice" ? (ice ? 1 : 0) : undefined; } };
    });

    /**
     * 冻区结算：对圈内一个受体按施术者预算内的世界生命结算一次。
     * 冰属性目标免疫（原生 ohko: "Ice" 的沿用）返回 "immune"；被原生减伤／护盾完全挡下返回 "immune"。
     * 目标防御、护甲与韧性不参与——原生伤害事件决定本次是否生效，但不再是必杀。
     */
    export function sheercoldExecute(action: CombatAction, target: CombatActor, amount: number): "hit" | "immune" | "miss" | "source-left" {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return "miss";
        const body = world.observe(target);
        if (body === null || body.health() <= 0) return "miss";
        const facts = PokemonDamage.combatants.read(world, target);
        for (let index = 0; index < facts.types.length; index++)
            if (facts.types[index] === "ice") {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: sheercoldId, type: "ice" }));
                return "immune";
            }
        const nativeSource = world.nativeEntity(action.actor());
        const receipt = PokemonDamage.fixedReceipt(world, target, CobblemonCombat.moveTemplate(sheercoldId), amount,
            { contact: false, knockback: false, bypassCooldown: true, ignoreArmor: true }, "immunity", action);
        if (!nativeSource || !nativeSource.isAlive() || nativeSource.isRemoved()) return "source-left";
        return receipt.actual > 0 ? "hit" : "immune";
    }

    actionParameters.define(sheercoldId, {
        /** 冻结半径：2.6 + 特攻偏移[−0.5,1.5] + 等级(≥20)偏移[0,1.0]；冰河 ×1.2；夹 2.0..5.0。 */
        radius: formula(
            F.base(2.6).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.5, 1.5))
                .plus(F.level().minus(20).times(0.025).clamp(0, 1.0))
                .times(F.when(F.pref("glacial", text("worldcombat.skill.sheercold.preference.glacial")), F.const(1.2), F.const(1)))
                .clamp(2.0, 5.0).round(2),
            "冻结半径", {
                unit: "格",
                description: "结霜向四周铺开多大一圈的 3D 冷域，也是本招的实际射程；特攻越高、等级高的人冻得越大，冰河式再放大一档。域内最多结算最近 4 个非冰目标。"
            }),
        /** 结霜延迟：26 −（等级 − 目标等级）×0.6（夹 [−8,16]），再乘冰属性系数（冰 0.62 / 非冰 1），+ 冰河 7；夹 10..42。 */
        mark: seconds(
            F.base(26).minus(F.level().minus(F.target("level", text("worldcombat.skill.sheercold.value.targetLevel"))).times(0.6).clamp(-8, 16))
                .times(F.when(F.var("self.ice", text("worldcombat.skill.sheercold.value.iceUser")), F.const(0.62), F.const(1)))
                .plus(F.when(F.pref("glacial", text("worldcombat.skill.sheercold.preference.glacial")), F.const(7), F.const(0)))
                .clamp(10, 42).round(0),
            "结霜延迟", "锁定冻区到真正结霜之间那段预告；冰属性使用者出手快得多，等级每压过对手 1 级也缩短一点，域内的目标得在这段时间里走出去。对手等级在施放时读取。"),
        /** 冻结伤害：18 + 0.35×特攻 + 0.2×等级；夹 18..100 世界生命。 */
        frost: formula(
            F.const(18).plus(F.stat("specialAttack").times(0.35)).plus(F.level().times(0.2)).clamp(18, 100).round(0),
            "冻结伤害", {
                unit: "点",
                description: "对域内每个非冰目标结算的一笔固定世界生命伤害：由施术者的特攻与等级决定，不按目标生命或防御缩放；四个目标合计不超过 400。"
            }),
        /** 寒雾量：22 + 特攻偏移[−5,34]；夹 18..60。 */
        hush: formula(
            F.base(22).plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-5, 34)).clamp(18, 60).round(0),
            "寒雾量", {
                unit: "个",
                description: "结霜一刻翻涌出的寒雾数量，由特攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 寒霜停留：120 + 等级(≥30)偏移[−20,80]；冰河 ×1.3；夹 80..240。 */
        frostTicks: seconds(
            F.base(120).plus(F.level().minus(30).times(1.0).clamp(-20, 80))
                .times(F.when(F.pref("glacial", text("worldcombat.skill.sheercold.preference.glacial")), F.const(1.3), F.const(1)))
                .clamp(80, 240).round(0),
            "寒霜停留", "地面那层低亮残霜留多久才散去；它不造成伤害、不改变方块，等级越高、冰河式留得越久。"),
        /** 霜晶数量：18 + 特攻偏移[−3,22]；夹 16..44。 */
        frostCells: formula(
            F.base(18).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-3, 22)).clamp(16, 44).round(0),
            "霜晶数量", {
                unit: "块",
                description: "冻结圈内霜光的密度；随特攻增长，也决定画面里的霜块密度，不改变方块。"
            }),
        /** 起手：16 − 速度偏移[−2,3]；夹 10..22。 */
        tempo: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(10, 22).round(0),
            "起手", "把那一小片空气压低到冰点需要多久；速度越快起得越短。"),
        /** 收招：12 − 速度偏移[−2,2]；夹 7..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(7, 18).round(0),
            "收招", "寒气散开、身体回温的收势。"),
        /** 冷却：95 − 等级(≥20)偏移[0,20]；冰河 +10；夹 65..130。 */
        recharge: seconds(
            F.base(95).minus(F.level().minus(20).times(0.33).clamp(0, 20))
                .plus(F.when(F.pref("glacial", text("worldcombat.skill.sheercold.preference.glacial")), F.const(10), F.const(0)))
                .clamp(65, 130).round(0),
            "冷却", "两次结霜之间的等待；等级越高回得越快，冰河式缓得更久。")
    });

    stages(sheercoldId, [
        { level: 40, values: { radius: 3.0 } },
        { level: 55, values: { radius: 3.4, frostTicks: 160 } }
    ]);

    describe(sheercoldId, [
        { key: "description.0", values: ["radius", "frost"] },
        { key: "description.1", values: ["mark"] },
        { key: "description.2", values: ["frostTicks"] },
        { key: "glacial.on", values: [], when: function (context) { return read(context.detail.values, ["glacial"]) === true; } },
        { key: "glacial.off", values: [], when: function (context) { return read(context.detail.values, ["glacial"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.radius"] },
        { key: "growth.1", values: ["tier.1.level","tier.1.radius"] }
    ]);
}
