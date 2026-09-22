/**
 * 磁场操控 / magneticflux —— 参数与数值来源。
 *
 * 原生事实：Electric、变化、威力 —、命中必中、PP 20、目标 allySide（己方场地）；
 *   通过操控磁场，提高特性为**正电／负电**的**己方**宝可梦的**防御和特防**各 1 级。
 *
 * 翻译：把回合制的一次己方增益翻成**施法者把自己压成一个磁极、在原地立起一片磁场**——一圈磁力线绞出，
 *   咬住站在场里的正电／负电伙伴，在它们身上缠出极光护层，防御与特防一起抬起来；离开磁场的伙伴磁力就散。
 *   取原生「电、防御 +1／特防 +1、目标己方、PP 20」；放弃「跟着队伍走」，改成**在施法点留下的一片磁场**——
 *   这是这招与鲜花防守的分界：鲜花防守护所有草属性一圈，不论敌我、不看特性；磁场只管带正负电特性的**自己人**，
 *   站在磁场里才生效。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   guard      防御等级：基础 1 级；防御高（≥150）或异极各 +1，夹 1..2。
 *   ward       特防等级：同一份机制读的是**特防**，与 guard 各自成项；异极各 +1。
 *   field      磁场半径：基础 3.4 格 + 特攻超出 60 的少量 + 身高×0.5，同极 ×1.2、异极 ×0.72，夹 2.4..6.5。画面磁环同径。
 *   fieldTicks 磁场时长：基础 260 刻 + 等级×3 + 特防×0.3，异极 ×1.2、同极 ×0.9，夹 180..640。等级 34／50 阶梯再抬。
 *   arcs       磁力线数：基础 22 + 特攻/9，异极 ×1.25、同极 ×0.9，夹 18..60。驱动粒子发射量。
 *   tempo      起手：基础 10 刻 − 速度超出 50 的部分，异极 +2，夹 6..15。
 *   aftercast  收招：基础 6 刻 + 身高×1.1，夹 6..10。
 *   wait       冷却：基础 130 刻 − 等级×0.5，异极 ×1.12，夹 75..155。PP 20 的代价。
 * 配置 opposite（极性）双向取舍：异极＝防御与特防各 +1、磁场更久更密，但磁场只有同极的 0.72 宽、起手 +2、冷却 ×1.12；
 *   同极＝磁场宽 1.2 倍、起手与冷却更省，两级按本体、时长更短。两向各有局面（罩多人 vs 点护）。
 */
namespace PokemonSkills {
    export const magneticfluxId = "magneticflux";
    /** 共享身份名：被磁场咬住的己方带的世界状态。 */
    export const magneticfluxStatus = "magnetized";
    /** 真实 MobEffect 注册 id（startup.ts 的 e.create），既是身份也是磁场的时限。 */
    export const magneticfluxEffect = "world_combat:magneticflux_field";
    /** 托管效果：记录这次磁场各抬了几级，供收回时照数还原。 */
    export const magneticfluxLink = "world_combat:magneticflux_link";
    /** WorldEffects.field 的规则名（本单元实现的场地行为）。 */
    export const magneticfluxRule = "world_combat:magneticflux_aura";
    export const magneticfluxScene = "world_combat:move_magneticflux";
    export const magneticfluxChargeText = "world_combat.move.magneticflux.text.charge";
    export const magneticfluxLinkText = "world_combat.move.magneticflux.text.link";
    export const magneticfluxFadeText = "world_combat.move.magneticflux.text.fade";
    /** 表现里的参考半径：`data.scale = 实际磁场半径 / 这个数`。 */
    export const magneticfluxReferenceRadius = 3.4;

    actionParameters.define(magneticfluxId, {
        /** 防御等级：防御高或异极各 +1。 */
        guard: formula(
            F.base(1)
                .plus(F.stat("defence").minus(150).times(0.02).clamp(0, 1))
                .plus(F.when(F.pref("opposite", text("worldcombat.skill.magneticflux.preference.opposite")), F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "防御等级", {
                unit: " 级",
                description: "磁场把正负电伙伴的防御抬高多少级；防御高（≥150）或异极各多一级。"
            }),
        /** 特防等级：与防御各自成项，读的是特防。 */
        ward: formula(
            F.base(1)
                .plus(F.stat("specialDefence").minus(150).times(0.02).clamp(0, 1))
                .plus(F.when(F.pref("opposite", text("worldcombat.skill.magneticflux.preference.opposite")), F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "特防等级", {
                unit: " 级",
                description: "磁场把正负电伙伴的特防抬高多少级；特防高（≥150）或异极各多一级。"
            }),
        /** 磁场半径：特攻与体型决定罩多宽。 */
        field: formula(
            F.base(3.4).plus(F.stat("specialAttack").minus(60).times(0.012).clamp(0, 1)).plus(F.body("height").times(0.5))
                .times(F.when(F.pref("opposite", text("worldcombat.skill.magneticflux.preference.opposite")), F.const(0.72), F.const(1.2)))
                .clamp(2.4, 6.5).round(2),
            "磁场半径", {
                unit: " 格",
                description: "磁场罩住多大一圈；特攻越高、身板越高越广，异极收拢、同极铺开。画面里的磁环就是这个半径。"
            }),
        /** 磁场时长：站在这片磁场里的时间。 */
        fieldTicks: seconds(
            F.base(260).plus(F.level().times(3)).plus(F.stat("specialDefence").times(0.3))
                .times(F.when(F.pref("opposite", text("worldcombat.skill.magneticflux.preference.opposite")), F.const(1.2), F.const(0.9)))
                .clamp(180, 640).round(0),
            "磁场时长", "磁场亮多久；等级与特防让它更久，异极更久。磁场一散，被咬住的伙伴磁力就散、等级收回。"),
        /** 磁力线数：特攻决定磁场有多少条。 */
        arcs: formula(
            F.base(22).plus(F.stat("specialAttack").div(9))
                .times(F.when(F.pref("opposite", text("worldcombat.skill.magneticflux.preference.opposite")), F.const(1.25), F.const(0.9)))
                .clamp(18, 60).round(0),
            "磁力线数", {
                unit: " 条",
                description: "磁场里绞出的磁力线数量；特攻越高越密，异极更密，粒子按它发射。"
            }),
        /** 起手：速度决定立起磁极多快。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(50).times(0.04).clamp(0, 4))
                .plus(F.when(F.pref("opposite", text("worldcombat.skill.magneticflux.preference.opposite")), F.const(2), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "把自己压成磁极需要多久；速度越快越短，异极要更久。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.1)).clamp(6, 10).round(0),
            "收招", "磁场立起之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(130).minus(F.level().times(0.5))
                .times(F.when(F.pref("opposite", text("worldcombat.skill.magneticflux.preference.opposite")), F.const(1.12), F.const(1)))
                .clamp(75, 155).round(0),
            "冷却", "两次磁场操控之间的等待；等级越高越短，异极更长。PP 20 的代价。")
    });

    stages(magneticfluxId, [
        { level: 34, values: { fieldTicks: 400, wait: 118 } },
        { level: 50, values: { fieldTicks: 490, wait: 108 } }
    ]);

    describe(magneticfluxId, [
        { key: "description.0", values: ["field", "fieldTicks"] },
        { key: "description.1", values: ["guard", "ward"] },
        { key: "description.2", values: ["arcs", "tempo", "aftercast", "wait"] },
        { key: "opposite.on", values: [], when: function (context) { return read(context.detail.values, ["opposite"]) === 1; } },
        { key: "opposite.off", values: [], when: function (context) { return read(context.detail.values, ["opposite"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fieldTicks", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fieldTicks", "tier.1.wait"] }
    ]);
}
