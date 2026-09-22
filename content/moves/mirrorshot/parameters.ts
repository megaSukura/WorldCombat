/**
 * 镜光射击 / mirrorshot 的参数与伤害段。
 *
 * 原生事实：Steel／特殊／威力 65／命中 85／PP 10／target normal（单体），30% 概率使目标命中下降 1 级；
 *   13 位学习者（Cobblemon 1.8 / Showdown）。描述「抛光自己的身体，向对手释放出闪光之力。有时会降低对手的命中率」。
 *
 * 翻译：把「抛光身体放出闪光」落成一**束高速细长的镜面光矛**——起手先把全身磨亮（`tempo` 刻的抛光），
 *   随后一道白光直射目标，命中炸开刺目的光花；被晃到的人有 `glareChance` 概率掉 `glareStages` 级命中、
 *   眼前留一片残光（共享身份 `world_combat:status/glared`，本单元发明：被镜光晃到），并挂家族伞身份
 *   `world_combat:status/aim_impaired`。散射式下光矛在目标身上反射开，顺着射击方向溅到附近旁人。
 *
 * 与同族分开：闪光（flash）是自身整圈爆闪、只能近身；魔法闪耀是整圈光浪；镜光射击是**一道又细又快的
 *   远程光矛**，射程最长、只打准一条线，还能按配置把光反射到旁人身上。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   flash       光矛威力：特攻定光能，等级定凝聚；散射式把光摊开所以更轻。
 *   reach       射程：特攻与等级决定打多远。它也是本招实际射程来源。
 *   velocity    光矛速度：速度定光走得多快（枪械式，基本瞬到）。
 *   beamRadius  光矛粗细：特攻定光柱半径，也是画面里那条光的宽度与命中判定。
 *   glareChance 晃眼概率：原生 30% 起，特攻与等级提高咬住的机会；聚光式更高。
 *   glareStages 掉命中级数：特攻很高时一次掉 2 级。
 *   glareTicks  晃眼时长：等级与散射式决定。
 *   refract     反射溅射威力：特攻决定溅到旁人那一下；只在散射式下结算。
 *   refractSpan 反射张角：体型宽度决定光在目标身后铺开多宽。
 *   glints      光点数量：特攻与等级驱动，直接驱动表现。
 *   tempo／aftercast／recharge：速度、等级与配置定节奏。
 *
 * 配置 `scatter`（散射式）双向取舍（默认关）：
 *   开＝光矛在目标身上反射开，顺射击方向溅到身后 `refractSpan` 度内的旁人（吃 `refract`、半数概率晃眼），
 *     射程 −1.5 格、威力 ×0.85、晃眼概率 −6%、冷却 +4 刻——打一簇人。
 *   关（聚光）＝威力 ×1.12、射程 +1.5 格、晃眼概率 +8%、起手更短——点掉一个人。
 *
 * 伤害段 `flash`（主目标）与 `refract`（反射溅射）走共享换算（原生类别 Special／Steel）；对手特防、
 * 相性与暴击命中时另算。命中下降：真实 MobEffect 让任何战斗者「打不准」（攻击变弱），宝可梦那一层再用
 * NativeEffects.boost 下降原生命中等级。
 */
namespace PokemonSkills {
    export const mirrorshotId = "mirrorshot";
    export const mirrorshotEffect = "world_combat:mirrorshot_dazzle";
    export const mirrorshotScene = "world_combat:move_mirrorshot";
    export const mirrorshotIdentity = "world_combat:status/glared";
    export const mirrorshotGlareText = "world_combat.move.mirrorshot.text.glare";
    export const mirrorshotMissText = "world_combat.move.mirrorshot.text.miss";

    actionParameters.define(mirrorshotId, {
        /** 光矛威力：65 + 特攻偏移[−9,28] + 等级(≥25)偏移[0,12]；散射 ×0.85 / 聚光 ×1.12；夹 40..124。 */
        flash: formula(
            F.base(65).plus(F.stat("specialAttack").minus(55).times(0.3).clamp(-9, 28))
                .plus(F.level().minus(25).times(0.45).clamp(0, 12))
                .times(F.when(F.pref("scatter"), F.const(0.85), F.const(1.12)))
                .clamp(40, 124).round(1),
            "光矛威力", {
                unit: "威力",
                description: "光矛打在主目标身上的基础威力；特攻越高光越烈、等级越高凝得越紧，散射式把光摊到旁人身上。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：14 + 特攻偏移[−2,4] + 等级(≥25)偏移[0,2] + 散射 −1.5 / 聚光 +1.5；夹 10..20。 */
        reach: formula(
            F.base(14).plus(F.stat("specialAttack").minus(55).times(0.06).clamp(-2, 4))
                .plus(F.level().minus(25).times(0.06).clamp(0, 2))
                .plus(F.when(F.pref("scatter"), F.const(-1.5), F.const(1.5)))
                .clamp(10, 20).round(1),
            "射程", {
                unit: "格",
                description: "光矛能打到多远；特攻高、等级高的个体射得更远，聚光式更远。它也是本招的实际射程来源。"
            }),
        /** 光矛速度：2.2 + 速度偏移[−0.3,0.7]；夹 1.6..3.2。 */
        velocity: formula(
            F.base(2.2).plus(F.stat("speed").minus(55).times(0.01).clamp(-0.3, 0.7)).clamp(1.6, 3.2).round(2),
            "光矛速度", {
                unit: "格/刻",
                description: "光矛飞行的速度；速度快的个体出光更急。镜面反光基本瞬间到，慢不到哪去。"
            }),
        /** 光矛粗细：0.1 + 特攻 × 0.0008；夹 0.06..0.2。 */
        beamRadius: formula(
            F.base(0.1).plus(F.stat("specialAttack").times(0.0008)).clamp(0.06, 0.2).round(3),
            "光矛粗细", {
                unit: "格",
                description: "光柱的判定半径，也是画面里那条光的宽度；特攻越高光越收得住、越锐。"
            }),
        /** 晃眼概率：基础 0.30 + 特攻偏移[0,0.18] + 等级偏移[0,0.05] + 散射 −0.06 / 聚光 +0.08；夹 0.12..0.6。 */
        glareChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(55).times(0.0022).clamp(0, 0.18))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.05))
                .plus(F.when(F.pref("scatter"), F.const(-0.06), F.const(0.08)))
                .clamp(0.12, 0.6).round(3),
            "晃眼概率", "镜光刺得目标睁不开眼、把它命中降下来的概率；原生 30% 起，特攻与等级越高越容易晃到，聚光式更高。"),
        /** 掉命中级数：1 + 特攻 ≥ 110；夹 1..2。 */
        glareStages: formula(
            F.base(1).plus(F.stat("specialAttack").gte(110)).clamp(1, 2).round(0),
            "掉命中级数", {
                unit: "级",
                description: "被晃到眼时一次掉几级命中；特攻很高的个体（≥110）会一次掉 2 级。"
            }),
        /** 晃眼时长：基础 90 刻 + 等级(≥25)偏移[0,50]；散射 ×1.2 / 聚光 ×1；夹 60..200。 */
        glareTicks: seconds(
            F.base(90).plus(F.level().minus(25).times(1.2).clamp(0, 50))
                .times(F.when(F.pref("scatter"), F.const(1.2), F.const(1)))
                .clamp(60, 200).round(0),
            "晃眼时长", "被镜光晃到、带着共享身份 glared 的时间；等级越高、散射式留得越久。"),
        /** 反射溅射威力：30 + 特攻偏移[−6,20]；夹 18..60。 */
        refract: formula(
            F.base(30).plus(F.stat("specialAttack").minus(55).times(0.22).clamp(-6, 20)).clamp(18, 60).round(1),
            "反射溅射威力", {
                unit: "威力",
                description: "散射式下光在目标身上反射开、溅到旁人那一下的基础威力；特攻越高溅得越重。对手特防与相性在命中时另算。"
            }),
        /** 反射张角：80 + 体型宽度偏移[−12,60]；夹 50..150。 */
        refractSpan: formula(
            F.base(80).plus(F.body("width").minus(0.9).times(40).clamp(-12, 60)).clamp(50, 150).round(0),
            "反射张角", {
                unit: "度",
                description: "散射式下光在目标身后铺开的扇形张角；身体越宽铺得越开。判定与画面共用同一个扇形。"
            }),
        /** 光点数量：16 + 特攻偏移[−4,16] + 等级(≥25)偏移[0,10]；夹 12..44。 */
        glints: formula(
            F.base(16).plus(F.stat("specialAttack").minus(55).times(0.16).clamp(-4, 16))
                .plus(F.level().minus(25).times(0.4).clamp(0, 10)).clamp(12, 44).round(0),
            "光点数量", {
                unit: "点",
                description: "光矛与命中处迸出的光点数量，也驱动表现的密度；特攻与等级越高越亮。"
            }),
        /** 起手：11 − 速度偏移[−1.5,3] + 散射 −2 / 聚光 +1；夹 5..16。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .plus(F.when(F.pref("scatter"), F.const(-2), F.const(1))).clamp(5, 16).round(0),
            "起手", "把身体磨亮、聚起这束光的时间；速度越快越短，聚光式要多磨一下。"),
        /** 收招：7 − 速度偏移[−1,2]；夹 4..11。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(4, 11).round(0),
            "收招", "射出光后收势的时间；快的个体更利落。"),
        /** 冷却：34 − 速度偏移[−3,5] + 散射 4；夹 20..48。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 5))
                .plus(F.when(F.pref("scatter"), F.const(4), F.const(0))).clamp(20, 48).round(0),
            "冷却", "再磨一次镜面前等待多久；速度快的个体回得稍快，散射式更久。")
    });

    defineDamage(mirrorshotId, "flash", {});
    defineDamage(mirrorshotId, "refract", {});

    describe(mirrorshotId, [
        { key: "description.0", values: ["flash", "glareChance", "glareStages"] },
        { key: "description.1", values: ["reach", "velocity", "beamRadius"] },
        { key: "description.2", values: ["glareTicks", "glints"] },
        { key: "description.3", values: ["refract", "refractSpan"] },
        { key: "scatter.on", values: [], when: function (context) { return read(context.detail.values, ["scatter"]) === true; } },
        { key: "scatter.off", values: [], when: function (context) { return read(context.detail.values, ["scatter"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
