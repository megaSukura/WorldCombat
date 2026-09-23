/**
 * 精神转移 / psychoshift —— 参数与数值来源。
 *
 * 核心念头：把自己身上正在受的那份折磨，用念力原样推走、种进对手身上——你轻了，它重了。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic／变化／威力 0／命中 100／PP 10／目标 normal；
 *   `onTryHit` 在自己没有异常状态时失败，否则把 `move.status` 设成自己的状态；命中后用 `self.onHit` 治愈自己。
 *   目标是宝可梦时只能带一种主异常，因此对方已有异常或免疫该异常时转移不成立。
 *
 * 翻译：原生把「主异常」从自己身上搬到对手身上、自己随之痊愈。即时战斗里异常就是真实的 MobEffect，于是本招
 *   按共享身份读自己最重的主异常（`CombatStatus.major`），先把同一身份按原强度种到对手身上，成功之后再解除
 *   自己身上的它——**转移成功才痊愈**，与原生一致；种不上（对方免疫、已有异常）就作废并保留自己的异常。
 *   取原生的「同一异常原样转手、治愈自己」；放弃「命中检定」，因为这是必中的变化招。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   reach     施术距离：特攻给出暗示能递多远，身高决定起手位置，夹 4..12，并作为本招实际射程。
 *   tempo     起手：速度决定把异常抽出来多快；深种多花 3 刻。
 *   aftercast 收招：特防决定推完后的收势。
 *   potency   转移强度：特攻与等级决定这份异常在对手身上维持多久（相对剩余时长的倍率），夹 0.8..2.0。
 *   motes     画面对数：特攻与等级决定飞出并种下的病核数量，画面按它发射。
 *   recharge  冷却：速度决定多久能再推一次；深种 ×1.35、浅推 ×0.9。
 * 配置 deep（深种／浅推）双向取舍：深种让同一异常在对手身上更久（×1.5），若推的是「中毒」还会加深为「剧毒」，
 *   代价是起手 +3、冷却 ×1.35；浅推便宜、能更频繁地清理自己的异常，但种得不深。
 */
namespace PokemonSkills {
    actionParameters.define("psychoshift", {
        reach: formula(
            F.base(6, "基础")
                .plus(F.stat("specialAttack").times(0.03).as("特攻"))
                .plus(F.body("height").times(1.0).as("体型"))
                .clamp(4, 12).round(1),
            "施术距离", { unit: " 格", description: "暗示能递到多远之外的对手；特攻越高、身板越大够得越远。它也是本招实际射程的来源。" }),
        tempo: seconds(
            F.base(7, "基础").minus(F.stat("speed").times(0.03).as("速度"))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.psychoshift.preference.deep")), F.const(3), F.const(0)).as("转移深浅"))
                .clamp(3, 13).round(0),
            "起手", "把自己的异常抽出来、递向对手需要多久；速度越快越短，深种多花 3 刻。"),
        aftercast: seconds(
            F.base(6, "基础").plus(F.stat("specialDefence").times(0.008).as("特防")).clamp(3, 10).round(0),
            "收招", "推出之后的收势；特防越高压得越稳。"),
        potency: formula(
            F.base(1.0).plus(F.stat("specialAttack").times(0.006).as("特攻")).plus(F.level().times(0.012).as("等级"))
                .times(F.when(F.pref("deep", text("worldcombat.skill.psychoshift.preference.deep")), F.const(1.5), F.const(1)).as("转移深浅"))
                .clamp(0.8, 3.0),
            "转移强度", { unit: "×", description: "这份异常在对手身上维持多久（相对自己剩余时长的倍率）；特攻与等级越高递得越深，深种再 ×1.5。" }),
        motes: formula(
            F.base(8, "基础").plus(F.stat("specialAttack").div(50).as("特攻")).plus(F.level().times(0.15).as("等级")).clamp(8, 26).round(0),
            "画面对数", { unit: "点", description: "抽出的病核数量；特攻与等级越高越密，画面按它发射。" }),
        recharge: seconds(
            F.base(70, "基础").minus(F.stat("speed").times(0.25).as("速度"))
                .times(F.when(F.pref("deep", text("worldcombat.skill.psychoshift.preference.deep")), F.const(1.35), F.const(0.9)).as("转移深浅"))
                .clamp(35, 120).round(0),
            "冷却", "两次转移之间的等待；速度快的个体恢复快，深种 ×1.35、浅推 ×0.9。")
    });

    stages("psychoshift", [{ level: 40, values: { potency: 1.4, recharge: 55 } }, { level: 55, values: { potency: 1.6, recharge: 48 } }]);

    describe("psychoshift", [
        { key: "description.0", values: ["reach"] },
        { key: "description.1", values: ["potency"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.potency", "tier.0.recharge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.potency", "tier.1.recharge"] }
    ]);
}
