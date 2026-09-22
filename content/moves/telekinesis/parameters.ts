/**
 * 意念移物 / telekinesis —— 参数与数值来源。
 *
 * 核心念头：用念力把对手整个人抬离地面，悬在半空；它脚下没有地、身体不能自主，悬着的这几秒里任人摆布。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic／变化／威力 0／命中必中／PP 15／目标 normal／持续 3 回合；
 *   期间目标浮空，除必杀技外所有招式对它必中，且免疫地面（Ground）属性；地鼠／三地鼠／沙丘娃／噬沙堡爷／
 *   超级耿鬼无法被抬起，已被击落（smackdown）或扎根（ingrain）时也失败；重力场下无法施展。
 *
 * 翻译：即时战斗里没有回合与命中骰，于是「浮起来」落成两件可观察的事——身体被压住、挪不动（悬空期间移动
 *   速度大幅下降，跑不掉也躲不开），以及地面招式够不到它（Ground 伤害与地形危害清零，与电磁飘浮同一套
 *   入场规则）。取原生的「浮空、免疫地面、悬着好打」；放弃「3 回合命中检定」，因为即时战斗的命中由轨迹与
 *   位置决定，把「好打」落成「它挪不动」这一步。队友的普通攻击因此更容易接上，等于把必中的收益给了所有人。
 *   扎根／击落中的目标提不起来，直接在 ready 拒绝；地鼠一族等无法离地的物种同样拒绝，不浪费 PP。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   reach     施术距离：特攻给出念力够多远，身高决定起手位置，夹 4..13，并作为本招实际射程。
 *   tempo     起手：速度决定抬得多快。
 *   aftercast 收招：速度决定放下后的收势。
 *   window    悬浮时长：等级与特攻支撑念力，体重越大越难久持，夹 160..600；配置「压住」×0.7、「托起」×1.15。
 *   hold      压制程度：特防与体重决定悬空期间移动被压掉多少，夹 30%..90%；配置「压住」至少 92%。
 *   rings     画面对数：特攻决定围绕目标升起的念力环数，画面按它发射。
 *   recharge  冷却：速度决定多久能再抬一次。
 * 配置 pin（压住／托起）双向取舍：压住＝移动几乎被钉死（≥92%）、但存续 ×0.7、冷却 ×1.25、起手 +3；
 *   托起＝存续更长（×1.15）、出手更省（冷却 ×0.9），但目标还能挪一小步。控死与拖时间各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("telekinesis", {
        reach: formula(
            F.base(5, "基础")
                .plus(F.stat("specialAttack").times(0.035).as("特攻"))
                .plus(F.body("height").times(1.1).as("体型"))
                .clamp(4, 13).round(1),
            "施术距离", { unit: " 格", description: "念力能抬起多远之外的对手；特攻越高、身板越大够得越远。它也是本招实际射程的来源。" }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").times(0.03).as("速度"))
                .plus(F.when(F.pref("pin", text("worldcombat.skill.telekinesis.preference.pin")), F.const(3), F.const(0)).as("压制方式"))
                .clamp(4, 15).round(0),
            "起手", "把对手抬离地面需要多久；速度越快越短，压住多花 3 刻。"),
        aftercast: seconds(
            F.base(6, "基础").minus(F.stat("speed").times(0.01).as("速度")).clamp(3, 10).round(0),
            "收招", "抬稳之后的收势；速度快的个体收得利落。"),
        window: seconds(
            F.base(240, "基础").plus(F.level().times(3).as("等级")).plus(F.stat("specialAttack").times(0.5).as("特攻"))
                .minus(F.body("weight").times(0.02).as("体重"))
                .times(F.when(F.pref("pin", text("worldcombat.skill.telekinesis.preference.pin")), F.const(0.7), F.const(1.15)).as("压制方式"))
                .clamp(160, 600).round(0),
            "悬浮时长", "念力托住对手多久；等级与特攻越高越久，体重越大越难久持，压住 ×0.7、托起 ×1.15。"),
        hold: percent(
            F.base(0.4).plus(F.body("weight").times(0.0015).as("体重")).plus(F.stat("specialDefence").times(0.008).as("特防"))
                .times(F.when(F.pref("pin", text("worldcombat.skill.telekinesis.preference.pin")), F.const(2.4), F.const(1)).as("压制方式"))
                .clamp(0.3, 0.95),
            "压制程度", "悬空期间目标被压掉多少移动；特防越高、越重压得越死，压住至少 92%。"),
        rings: formula(
            F.base(8, "基础").plus(F.stat("specialAttack").div(45).as("特攻")).clamp(8, 24).round(0),
            "画面对数", { unit: " 条", description: "围绕目标升起的念力环数量；特攻越高越密，画面按它发射。" }),
        recharge: seconds(
            F.base(120, "基础").minus(F.stat("speed").times(0.15).as("速度"))
                .times(F.when(F.pref("pin", text("worldcombat.skill.telekinesis.preference.pin")), F.const(1.25), F.const(0.9)).as("压制方式"))
                .clamp(60, 200).round(0),
            "冷却", "两次起浮之间的等待；速度快的个体恢复快，压住 ×1.25、托起 ×0.9。")
    });

    stages("telekinesis", [{ level: 40, values: { reach: 9, window: 360 } }, { level: 55, values: { reach: 10, window: 420 } }]);

    describe("telekinesis", [
        { key: "description.0", values: ["reach", "window", "hold"] },
        { key: "description.1", values: ["rings"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "pin.on", values: [], when: function (context) { return read(context.detail.values, ["pin"]) === true; } },
        { key: "pin.off", values: [], when: function (context) { return read(context.detail.values, ["pin"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.window"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.window"] }
    ]);
}
