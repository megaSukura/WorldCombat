/**
 * 爆裂拳 / dynamicpunch 的参数与伤害段。
 *
 * 原生事实：Fighting、物理、威力 100、命中 50、PP 5、接触、拳类，命中后必定使对手混乱（Cobblemon 1.8，142 位学习者）。
 * 翻译：把“使出浑身力气出拳、必定混乱、却只有一半命中率”落成一记**抡圆了的横扫重拳**：起手长、后摆大，
 * 提交后在身前扫出一道扇形；站在扇面里的敌人各吃一记接触+拳伤害，主目标（被扫中的）必定被震得混乱——
 * 出手会打偏、用力会伤到自己。原生 50 命中在这里变成了**位置判定**：走出扇面的人不吃这一下，
 * 画面里的扇面和速度线就是你能躲开的那块地方；挥空则因为收不住势，要多花 `overextend` 刻才能再动。
 *
 * 与同族分开：怪力是直线、必中、无副作用的干净一拳；爆裂拳走弧线、可被走出、打中必乱，是赌命一拳。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   haymaker    拳威：物攻与体重决定这一抡有多重。
 *   swingArc    扇面角度：实时碰撞箱宽度决定抡得有多开。
 *   swingReach  拳程（扇面半径）：碰撞箱宽度决定横扫能探多远。
 *   dazeTicks   混乱时长：物攻与等级决定对手晕多久。
 *   fumbleChance 混乱载体振幅（失手概率）：物攻越高，震得越狠、越容易失手。
 *   overextend  挥空的额外收势：速度决定失衡多久才能再动。
 *   release/tempo/aftercast/recharge  速度决定挥出延迟、起手、收招与冷却。
 * 配置 reckless（拼命式）双向取舍：威力更高、扇面更开、晕得更久，但起手/收招/冷却更长、挥空失衡更久。
 *
 * 伤害段 haymaker：这一抡随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("dynamicpunch", {
        /** 拳威：物攻每比 60 多 1 加 0.5（上限 +42），体重每比 60 多 1 加 0.1（上限 +20）；拼命 ×1.08；夹在 70..185。 */
        haymaker: formula(
            F.base(100).plus(F.stat("attack").minus(60).times(0.5).clamp(-20, 42))
                .plus(F.body("weight").minus(60).times(0.1).clamp(-6, 20))
                .times(F.when(F.pref("reckless"), F.const(1.08), F.const(1)))
                .clamp(70, 185).round(1),
            "横扫拳威", {
                unit: "威力",
                description: "这一抡命中的基础威力；物攻越高拳越重，身体越沉抡得越狠，拼命式再抬一截。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扇面角度：基础 120 度加碰撞箱宽度 ×35；拼命 +30；夹在 90..200。 */
        swingArc: formula(
            F.base(120).plus(F.body("width").minus(0.9).times(35))
                .plus(F.when(F.pref("reckless"), F.const(30), F.const(0)))
                .clamp(90, 200).round(0),
            "扇面角度", {
                unit: "度",
                description: "这一抡扫过的扇形张角；身体越宽抡得越开，拼命式张得更开。画面里的弧面就是判定范围。"
            }),
        /** 拳程：基础 2.0 格加碰撞箱宽度 ×0.8；拼命 +0.5；夹在 1.8..3.6。 */
        swingReach: formula(
            F.base(2.0).plus(F.body("width").minus(0.9).times(0.8))
                .plus(F.when(F.pref("reckless"), F.const(0.5), F.const(0)))
                .clamp(1.8, 3.6).round(2),
            "横扫拳程", {
                unit: "格",
                description: "扇形能扫到多远的活体；身体越宽够得越远，拼命式多探半格。它也是本招的实际射程来源。"
            }),
        /** 混乱时长：基础 200 刻，物攻每比 60 多 1 加 0.4 刻，等级每比 30 高 1 加 1 刻；拼命 ×1.15；夹在 120..380。 */
        dazeTicks: seconds(
            F.base(200).plus(F.stat("attack").minus(60).times(0.4).clamp(-20, 60))
                .plus(F.level().minus(30).times(1).clamp(0, 40))
                .times(F.when(F.pref("reckless"), F.const(1.15), F.const(1)))
                .clamp(120, 380).round(0),
            "混乱时长", "被这一抡震懵后陷入混乱的时长；物攻越高、等级越高晕得越久，拼命式更久。"),
        /** 失手概率：基础 0.34，物攻每比 60 多 1 加 0.0012；拼命 +0.05；夹在 0.20..0.55。 */
        fumbleChance: percent(
            F.base(0.34).plus(F.stat("attack").minus(60).times(0.0012).clamp(-0.06, 0.1))
                .plus(F.when(F.pref("reckless"), F.const(0.05), F.const(0)))
                .clamp(0.20, 0.55).round(3),
            "失手概率", "混乱期间目标每次想出手被打散的概率；物攻越高震得越狠，拼命式更乱。"),
        /** 挥空失衡：基础 12 刻，速度每比 60 快 1 减 0.05 刻，拼命 +6；夹在 6..24。 */
        overextend: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 5))
                .plus(F.when(F.pref("reckless"), F.const(6), F.const(0)))
                .clamp(6, 24).round(0),
            "挥空失衡", "这一抡扫空后，收不住势、多花的收招时间；速度越快回得越快，拼命式失衡更久。"),
        /** 挥出延迟：基础 6 刻，速度每比 60 快 1 减 0.02 刻；夹在 3..10。 */
        release: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(3, 10).round(0),
            "挥出延迟", "提交到真正扫出这一拳之间的后摆时间；速度越快抡得越快。"),
        /** 起手：基础 12 刻，速度每比 60 快 1 减 0.04 刻，拼命 +4；夹在 6..22。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 5))
                .plus(F.when(F.pref("reckless"), F.const(4), F.const(0)))
                .clamp(6, 22).round(0),
            "起手", "大幅后摆、蓄力到能提交的时间；速度越快越短，拼命式要多蓄一会儿。"),
        /** 收招：基础 10 刻，速度每比 60 快 1 减 0.02 刻，拼命 +3；夹在 5..18。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("reckless"), F.const(3), F.const(0)))
                .clamp(5, 18).round(0),
            "收招", "扫完这一拳后的收势；速度越快越短，拼命式更慢。"),
        /** 冷却：基础 44 刻，速度每比 60 快 1 减 0.06 刻，拼命 +10；夹在 26..72。 */
        recharge: seconds(
            F.base(44).minus(F.stat("speed").minus(60).times(0.06).clamp(-6, 10))
                .plus(F.when(F.pref("reckless"), F.const(10), F.const(0)))
                .clamp(26, 72).round(0),
            "冷却", "两次抡拳之间的等待；速度越快回得越快，拼命式要缓更久。")
    });

    stages("dynamicpunch", [
        { level: 32, values: { haymaker: 110 } },
        { level: 52, values: { haymaker: 122, dazeTicks: 240 } }
    ]);

    defineDamage("dynamicpunch", "haymaker", {}, { contact: true, punch: true });

    describe("dynamicpunch", [
        { key: "description.0", values: ["haymaker","swingArc","swingReach"] },
        { key: "description.1", values: ["dazeTicks","fumbleChance"] },
        { key: "description.2", values: ["overextend"] },
        { key: "reckless.on", values: [], when: function (context) { return read(context.detail.values, ["reckless"]) === true; } },
        { key: "reckless.off", values: [], when: function (context) { return read(context.detail.values, ["reckless"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.haymaker"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.haymaker", "tier.1.dazeTicks"] }
    ]);
}
