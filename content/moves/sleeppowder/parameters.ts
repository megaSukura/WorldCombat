/**
 * 催眠粉 / Sleep Powder —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Grass／变化／威力 0／命中 75／PP 15／单体，命中后目标陷入睡眠；flags 含
 *   powder（粉末类，草属性对粉末免疫）。
 *
 * 世界化：把「撒出催眠粉」翻成一团**抛出去、落地就不散的催眠尘云**——粉团落在选定位置摊开成一片云，
 *   谁站在云里谁被一口口喂进睡意（先变慢、再睡下），走出去的人睡意挂着慢慢走完。它是四式里唯一一个
 *   **把一片地留在世界上**的：可以封路口、把敌人赶进去，也可以等它自己散去。草属性直接穿过粉末。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数：
 *   throwReach   抛粉距离（实际射程）：等级（经验越足抛得越远）。
 *   cloudRadius  云半径：体宽（撒得越开）＋ 特攻（粉团越鼓），配置「厚云」收窄。
 *   cloudTicks   云存在时长：等级，配置「厚云」延长。
 *   density      睡下所需的吸入次数：特攻（越浓吸入越少），配置「厚云」减一次。
 *   doseInterval 每次吸入的间隔：速度。
 *   sleepTicks   睡多久：特攻 ＋ 亲密度，配置「厚云」延长。
 *   drowsyTicks  每一口睡意（变慢）的存留：特攻（走出云外还挂多久）。
 *   puffSpeed    抛粉速度：速度。
 *   motes        粉尘颗粒数：特攻 ＋ 等级台阶；它同时是画面里粉云与粉粒的数量。
 *   tempo        起手：速度。
 *   aftercast    收招：速度。
 *   recharge     冷却：等级，配置「厚云」更久。
 *
 * 配置 `thick`（厚云）双向取舍：开启＝云半径 ×0.8、存在时长 ×1.25、睡眠 ×1.25、吸入次数 −1，但冷却 ×1.15，
 *   用来把一小片地彻底封死；关闭（散云）＝半径 ×1.2、更容易罩住走位中的几个人，但云更短、睡得更浅、
 *   吸入次数 +1。两向各有局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。云由共享场地机制 `WorldEffects.field` 承担，
 * 吸入与睡意由共享的 `PokemonSkills.powder` 结算（草属性免疫、逐口睡意、够数入睡都在那里）。
 */
namespace PokemonSkills {
    export const sleeppowderId = "sleeppowder";
    export const sleeppowderScene = "world_combat:move_sleeppowder";
    export const sleeppowderField = "world_combat:move_sleeppowder_cloud";

    actionParameters.define(sleeppowderId, {
        /** 抛粉距离：8 + 等级(≥25)偏移[0,2.5]；夹 6..13。 */
        throwReach: formula(
            F.base(8).plus(F.level().minus(25).times(0.07).clamp(0, 2.5)).clamp(6, 13).round(2),
            "抛粉距离", {
                unit: "格",
                description: "粉团能抛到多远、云就在哪里落下；等级越高抛得越远。它也是本招的实际射程。"
            }),
        /** 云半径：2.4 + 体宽偏移[−0.4,1.2] + 特攻偏移[−0.2,0.5]；厚云 ×0.8／散云 ×1.2；夹 1.6..3.8。 */
        cloudRadius: formula(
            F.base(2.4)
                .plus(F.body("width").minus(0.9).times(1.0).clamp(-0.4, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.005).clamp(-0.2, 0.5))
                .times(F.when(F.pref("thick"), F.const(0.8), F.const(1.2)))
                .clamp(1.6, 3.8).round(2),
            "云半径", {
                unit: "格",
                description: "粉团落地摊开的覆盖半径；体型越宽、特攻越高铺得越开。它也是指示圈与实际判定半径。"
            }),
        /** 云存在时长：170 + 等级(≥25)偏移[0,35]；厚云 ×1.25／散云 ×0.85；夹 120..320。 */
        cloudTicks: seconds(
            F.base(170).plus(F.level().minus(25).times(0.9).clamp(0, 35))
                .times(F.when(F.pref("thick"), F.const(1.25), F.const(0.85)))
                .clamp(120, 320).round(0),
            "云存在时长", "一片催眠粉云在世界上停留多久；厚云留得更久，散云散得快。"),
        /** 吸入次数：5 − 特攻偏移[0,2] + 厚云 −1／散云 +1；夹 2..5。 */
        density: formula(
            F.base(5).minus(F.stat("specialAttack").minus(60).times(0.03).clamp(0, 2))
                .plus(F.when(F.pref("thick"), F.const(-1), F.const(1)))
                .clamp(2, 5).round(0),
            "吸入次数", {
                unit: " 次",
                description: "站在云里要吸几口才睡下；特攻越高粉越浓、需要的口数越少，厚云再减一次。"
            }),
        /** 吸入间隔：18 − 速度偏移[−3,5]；夹 13..23。 */
        doseInterval: seconds(
            F.base(18).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 5)).clamp(13, 23).round(0),
            "吸入间隔", "云里每隔多久喂进一口睡意；速度快的个体落粉更密，把人放倒得更快。"),
        /** 睡眠时长：240 + 特攻偏移[−40,130] + 亲密度×0.4；厚云 ×1.25／散云 ×0.85；夹 140..440。 */
        sleepTicks: seconds(
            F.base(240)
                .plus(F.stat("specialAttack").minus(60).times(0.9).clamp(-40, 130))
                .plus(F.individual("friendship").times(0.4))
                .times(F.when(F.pref("thick"), F.const(1.25), F.const(0.85)))
                .clamp(140, 440).round(0),
            "睡眠时长", "睡下之后睡多久；特攻越高、越亲近的个体粉越沉。受伤害会立刻惊醒。"),
        /** 睡意存留：60 + 特攻偏移[−15,35]；夹 45..95。 */
        drowsyTicks: seconds(
            F.base(60).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-15, 35)).clamp(45, 95).round(0),
            "睡意存留", "每一口睡意留下的变慢挂多久；走出云外按它慢慢走完再解，走出得早就能把睡意甩掉。"),
        /** 抛粉速度：1.1 + 速度偏移[−0.2,0.6]；夹 0.9..1.7。 */
        puffSpeed: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.2, 0.6)).clamp(0.9, 1.7).round(2),
            "抛粉速度", {
                unit: "格/刻",
                description: "粉团脱手飞向落点的速度；速度快的个体抛得更急，目标更难在云落下前走开。"
            }),
        /** 粉尘颗粒数：18 + 特攻偏移[0,22]；夹 12..48；等级台阶再抬。 */
        motes: formula(
            F.base(18).plus(F.stat("specialAttack").minus(60).times(0.35).clamp(0, 22)).clamp(12, 48).round(0),
            "粉尘颗粒数", {
                unit: "粒",
                description: "一团粉里有多少颗粉尘；特攻越高越密，也是画面里粉云与粉粒的数量。"
            }),
        /** 起手：9 − 速度偏移[−2,3]；夹 6..13。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 3)).clamp(6, 13).round(0),
            "起手", "把粉在掌心拢好、脱手的时间；速度越快越短。"),
        /** 收招：7 − 速度偏移[−1.5,2.5]；夹 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5)).clamp(4, 12).round(0),
            "收招", "粉团脱手、收回手的时间。"),
        /** 冷却：(95 − 等级(≥25)偏移[0,15]) × 厚云 1.15／散云 0.9；夹 60..135。 */
        recharge: seconds(
            F.base(95).minus(F.level().minus(25).times(0.45).clamp(0, 15))
                .times(F.when(F.pref("thick"), F.const(1.15), F.const(0.9)))
                .clamp(60, 135).round(0),
            "冷却", "两片云之间的等待；等级越高回得越快，厚云式铺得更久也缓得更久。")
    });

    stages(sleeppowderId, [
        { level: 40, values: { motes: 28 } },
        { level: 55, values: { motes: 36, cloudRadius: 2.9, density: 3 } }
    ]);

    describe(sleeppowderId, [
        { key: "description.0", values: ["throwReach", "puffSpeed", "cloudRadius"] },
        { key: "description.1", values: ["cloudTicks", "density", "doseInterval"] },
        { key: "description.2", values: ["sleepTicks", "drowsyTicks"] },
        { key: "thick.on", values: [], when: function (context) { return read(context.detail.values, ["thick"]) === true; } },
        { key: "thick.off", values: [], when: function (context) { return read(context.detail.values, ["thick"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cloudRadius", "tier.1.density"] }
    ]);
}
