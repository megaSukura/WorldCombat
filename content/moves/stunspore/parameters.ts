/**
 * 麻痹粉 / Stun Spore — 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Grass／变化／威力 0／命中 75／PP 30／单体，命中后目标陷入麻痹；
 *   flags 含 powder（粉末类，草属性对粉末免疫）。电属性对麻痹免疫（共享默认规则自动生效）。
 *
 * 世界化：把「撒出麻痹粉」翻成一团**抛出去、落下就不散的麻痹花粉**——施法者把一团粉抛向目标所在的位置，
 *   粉团落地炸开成一片持续存在的云；谁站在云里谁一直被麻住，走出去之后麻痹按自己的时间慢慢走完。
 *   它是三式麻痹里唯一**留在世界上**的那个：对手可以用走位绕开、等它散去，也可以把敌人赶进去。
 *   草属性对粉末免疫、电属性对麻痹免疫，两种目标都直接穿过这团云。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数：
 *   throwReach   抛粉距离（实际射程）：等级（经验越足抛得越远）。
 *   cloudRadius  云半径：体宽（撒得越开）＋ 特攻（粉团越鼓），配置「厚云」收窄。
 *   cloudTicks   云存在时长：等级，配置「厚云」延长。
 *   holdTicks    每一下麻痹的持续（含离开后残留）：特攻，配置「厚云」延长。
 *   puffSpeed    抛粉速度：速度（快个体抛得更急）。
 *   spores       麻粉颗粒数：特攻 ＋ 等级台阶；它同时是画面里粉云与粉粒的数量。
 *   tempo        起手：速度（越快越早抛）。
 *   recharge     冷却：等级（越熟练回得越快），配置「厚云」更久。
 *
 * 配置 `thick`（厚云）双向取舍：开启＝云半径 ×0.8、存在时长 ×1.3、麻痹 ×1.25，但冷却 ×1.15，
 *   用来把一小片地彻底封住；关闭＝散云式，半径 ×1.2，更容易一次罩住走位中的几个人，但云更短、麻痹更淡。
 *   两个方向各有适用局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。云由共享场地机制 `WorldEffects.field` 承担。
 */
namespace PokemonSkills {
    export const stunsporeId = "stunspore";
    export const stunsporeField = "world_combat:move_stunspore_cloud";

    actionParameters.define(stunsporeId, {
        /** 抛粉距离：8 + 等级(≥25)偏移[0,2.2]；夹 6..13。 */
        throwReach: formula(
            F.base(8).plus(F.level().minus(25).times(0.08).clamp(0, 2.2)).clamp(6, 13).round(2),
            "抛粉距离", {
                unit: "格",
                description: "粉团能抛到多远、云就在哪里落下；等级越高抛得越远。它也是本招的实际射程。"
            }),
        /** 云半径：2.3 + 体宽偏移[−0.4,1.2] + 特攻偏移[−0.2,0.6]；厚云 ×0.8 / 散云 ×1.2；夹 1.6..3.6。 */
        cloudRadius: formula(
            F.base(2.3)
                .plus(F.body("width").minus(0.9).times(1.0).clamp(-0.4, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.2, 0.6))
                .times(F.when(F.pref("thick"), F.const(0.8), F.const(1.2)))
                .clamp(1.6, 3.6).round(2),
            "云半径", {
                unit: "格",
                description: "粉团落地摊开的覆盖半径；体型越宽、特攻越高铺得越开。它也是指示圈与实际判定半径。"
            }),
        /** 云存在时长：130 + 等级偏移[0,30]；厚云 ×1.3 / 散云 ×0.8；夹 100..260。 */
        cloudTicks: seconds(
            F.base(130).plus(F.level().minus(25).times(0.9).clamp(0, 30))
                .times(F.when(F.pref("thick"), F.const(1.3), F.const(0.8)))
                .clamp(100, 260).round(0),
            "云存在时长", "一片麻痹粉云在世界上停留多久；厚云留得更久，散云散得快。"),
        /** 每一下麻痹：60 + 特攻偏移[−20,40]；厚云 ×1.25 / 散云 ×0.85；夹 40..140。 */
        holdTicks: seconds(
            F.base(60).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-20, 40))
                .times(F.when(F.pref("thick"), F.const(1.25), F.const(0.85)))
                .clamp(40, 140).round(0),
            "每一下麻痹", "站在云里时被持续刷新的麻痹时长；走出云外，麻痹还会按这段时间走完再解。特攻越高毒性越久。"),
        /** 抛粉速度：1.1 + 速度偏移[−0.2,0.6]；夹 0.9..1.7。 */
        puffSpeed: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.2, 0.6)).clamp(0.9, 1.7).round(2),
            "抛粉速度", {
                unit: "格/刻",
                description: "粉团脱手飞向落点的速度；速度快的个体抛得更急，目标更难在云落下前走开。"
            }),
        /** 麻粉颗粒数：16 + 特攻偏移[0,20]；夹 12..48；等级台阶再抬。 */
        spores: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).times(0.3).clamp(0, 20)).clamp(12, 48).round(0),
            "麻粉颗粒数", {
                unit: "粒",
                description: "一团粉里有多少颗能被射进云里的花粉；特攻越高越密，也是画面里粉粒的数量。"
            }),
        /** 起手：9 − 速度偏移[−2,3]；夹 6..13。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 3)).clamp(6, 13).round(0),
            "起手", "把粉在掌心拢好、脱手的时间；速度越快越短。"),
        /** 冷却：90 − 等级(≥25)偏移[0,15]；厚云 ×1.15 / 散云 ×0.9；夹 60..130。 */
        recharge: seconds(
            F.base(90).minus(F.level().minus(25).times(0.45).clamp(0, 15))
                .times(F.when(F.pref("thick"), F.const(1.15), F.const(0.9)))
                .clamp(60, 130).round(0),
            "冷却", "两次撒粉之间的等待；等级越高回得越快，厚云式铺得更久也缓得更久。")
    });

    stages(stunsporeId, [
        { level: 40, values: { spores: 26 } },
        { level: 55, values: { spores: 34, cloudRadius: 2.8 } }
    ]);

    describe(stunsporeId, [
        { key: "description.0", values: ["throwReach", "puffSpeed", "cloudRadius"] },
        { key: "description.1", values: ["cloudTicks","holdTicks"] },
        { key: "description.2", values: [] },
        { key: "thick.on", values: [], when: function (context) { return read(context.detail.values, ["thick"]) === true; } },
        { key: "thick.off", values: [], when: function (context) { return read(context.detail.values, ["thick"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cloudRadius"] }
    ]);
}
