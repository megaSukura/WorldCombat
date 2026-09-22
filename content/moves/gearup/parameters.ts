/**
 * 辅助齿轮 / gearup —— 参数与数值来源。
 *
 * 原生事实：Steel、变化、威力 —、命中必中、PP 20、目标 allySide；启动齿轮，
 *   提高特性为**正电／负电**的**己方**宝可梦的**攻击和特攻**各 1 级。
 *
 * 翻译：把回合制的一次己方增益翻成**施法者体内的齿轮当场啮合、越转越快**——转速到顶的一刻，
 *   几条齿链把动力甩给紧贴身边的**正电／负电伙伴**（含自己），它们身上迸出钢屑，物攻与特攻随转速抬起来；
 *   齿轮转一会儿就锁定，动力随即消散。取原生「钢、物攻 +1／特攻 +1、目标己方、PP 20」；放弃「跟着队伍走」，
 *   改成一次**贴身的齿链传动**——这是这招与磁场操控的分界：磁场是在地上留一片久一点的场、管双防；
 *   辅助齿轮只在这一刻传给身边的人、管双攻、传完即散。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   drive      攻击等级：基础 1 级；物攻高（≥150）或稳啮各 +1，夹 1..2。
 *   spark      特攻等级：同一份机制读的是**特攻**，与 drive 各自成项；稳啮各 +1。
 *   chain      齿链半径：基础 2.6 格 + 碰撞箱宽度×0.8 + 速度超出 50 的少量，稳啮 ×1.15、超速 ×0.8，夹 1.8..5。
 *   runTicks   运转时长：基础 240 刻 + 等级×3 + 物攻×0.3，稳啮 ×1.25、超速 ×0.85，夹 160..620。等级 32／48 阶梯再抬。
 *   teeth      齿数：基础 18 + 物攻/8 + 体重/30，夹 16..48。驱动粒子发射量。
 *   tempo      起手：基础 8 刻 − 速度超出 50 的部分，稳啮 +3，夹 4..13。
 *   aftercast  收招：基础 6 刻 + 体重/60，夹 6..11。
 *   wait       冷却：基础 120 刻 − 等级×0.5，稳啮 ×1.12，夹 70..145。PP 20 的代价。
 * 配置 steady（传动）双向取舍：稳啮＝攻击与特攻各 +1、齿链 ×1.15 宽、运转 ×1.25 久，但起手 +3、冷却 ×1.12；
 *   超速＝起手与冷却都便宜、齿链收得很短（×0.8），等级按本体、运转更短。两向各有局面（点传 vs 即转即打）。
 */
namespace PokemonSkills {
    export const gearupId = "gearup";
    /** 共享身份名：被齿链传动的己方带的世界状态。 */
    export const gearupStatus = "geared";
    /** 真实 MobEffect 注册 id（startup.ts 的 e.create），既是身份也是运转时限。 */
    export const gearupEffect = "world_combat:gearup_drive";
    /** 托管效果：记录这次传动各抬了几级，供收回时照数还原。 */
    export const gearupMark = "world_combat:gearup_mark";
    export const gearupScene = "world_combat:move_gearup";
    export const gearupSpinText = "world_combat.move.gearup.text.spin";
    export const gearupDriveText = "world_combat.move.gearup.text.drive";
    export const gearupFadeText = "world_combat.move.gearup.text.fade";
    /** 表现里的参考半径：`data.scale = 实际齿链半径 / 这个数`。 */
    export const gearupReferenceRadius = 2.6;

    actionParameters.define(gearupId, {
        /** 攻击等级：物攻高或稳啮各 +1。 */
        drive: formula(
            F.base(1)
                .plus(F.stat("attack").minus(150).times(0.02).clamp(0, 1))
                .plus(F.when(F.pref("steady", text("worldcombat.skill.gearup.preference.steady")), F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "攻击等级", {
                unit: " 级",
                description: "齿轮传动把正负电伙伴的攻击抬高多少级；物攻高（≥150）或稳啮各多一级。"
            }),
        /** 特攻等级：与攻击各自成项，读的是特攻。 */
        spark: formula(
            F.base(1)
                .plus(F.stat("specialAttack").minus(150).times(0.02).clamp(0, 1))
                .plus(F.when(F.pref("steady", text("worldcombat.skill.gearup.preference.steady")), F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "特攻等级", {
                unit: " 级",
                description: "齿轮传动把正负电伙伴的特攻抬高多少级；特攻高（≥150）或稳啮各多一级。"
            }),
        /** 齿链半径：体型与速度决定能传多远。 */
        chain: formula(
            F.base(2.6).plus(F.body("width").times(0.8)).plus(F.stat("speed").minus(50).times(0.01).clamp(0, 0.6))
                .times(F.when(F.pref("steady", text("worldcombat.skill.gearup.preference.steady")), F.const(1.15), F.const(0.8)))
                .clamp(1.8, 5).round(2),
            "齿链半径", {
                unit: " 格",
                description: "动力能传到多远的伙伴；碰撞箱越宽、转速越快传得越远，稳啮 ×1.15、超速 ×0.8。"
            }),
        /** 运转时长：动力在身上留多久。 */
        runTicks: seconds(
            F.base(240).plus(F.level().times(3)).plus(F.stat("attack").times(0.3))
                .times(F.when(F.pref("steady", text("worldcombat.skill.gearup.preference.steady")), F.const(1.25), F.const(0.85)))
                .clamp(160, 620).round(0),
            "运转时长", "齿轮的动力在身上转多久；等级与物攻让它更久，稳啮更久。动力一散，等级收回。"),
        /** 齿数：物攻与体重决定齿轮多密。 */
        teeth: formula(
            F.base(18).plus(F.stat("attack").div(8)).plus(F.body("weight").div(30)).clamp(16, 48).round(0),
            "齿数", {
                unit: " 齿",
                description: "转动时看得见的齿数；物攻与体重越大齿轮越密，粒子按它发射。"
            }),
        /** 起手：速度决定上弦多快。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(50).times(0.05).clamp(0, 4))
                .plus(F.when(F.pref("steady", text("worldcombat.skill.gearup.preference.steady")), F.const(3), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "从静止把齿轮带到啮合转速需要多久；速度越快越短，稳啮要更久。"),
        /** 收招：体重决定收势。 */
        aftercast: seconds(
            F.base(6).plus(F.body("weight").div(60)).clamp(6, 11).round(0),
            "收招", "动力传出去之后的收势；体重越大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.5))
                .times(F.when(F.pref("steady", text("worldcombat.skill.gearup.preference.steady")), F.const(1.12), F.const(1)))
                .clamp(70, 145).round(0),
            "冷却", "两次辅助齿轮之间的等待；等级越高越短，稳啮更长。PP 20 的代价。")
    });

    stages(gearupId, [
        { level: 32, values: { runTicks: 380, wait: 106 } },
        { level: 48, values: { runTicks: 470, wait: 96 } }
    ]);

    describe(gearupId, [
        { key: "description.0", values: ["chain", "runTicks"] },
        { key: "description.1", values: ["drive", "spark"] },
        { key: "description.2", values: ["teeth", "tempo", "aftercast", "wait"] },
        { key: "steady.on", values: [], when: function (context) { return read(context.detail.values, ["steady"]) === 1; } },
        { key: "steady.off", values: [], when: function (context) { return read(context.detail.values, ["steady"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.runTicks", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.runTicks", "tier.1.wait"] }
    ]);
}
