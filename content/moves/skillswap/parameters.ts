/**
 * 特性互换 / skillswap —— 参数与数值来源。
 *
 * 核心念头：用念力把两个人的特性在中间对调——你把手里的身份递过去，换回对方的那一个，之后各自按对方的身份打这一段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic／变化／威力 0／命中必中／PP 10／目标 normal；
 *   `onTryHit` 在任一方特性带 failskillswap、或目标处于 dynamax 时失败；`onHit` 把双方特性对调，
 *   并对两个旧特性各跑一次 End、对新特性各跑一次 Start（离场前一直保持）。可作用于对手，也可作用于同伴。
 *
 * 翻译：原生把「特性 id」永久对调。即时战斗里没有「换人」这个边界，于是把它落成**一段有寿命的对调**：
 *   两人的有效特性（含临时覆盖层）真正互换，换来的身份走共享的 NativeModifiers ability 层，双方各挂一枚
 *   共享身份 world_combat:status/skillswap 的窗口；窗口走完或被清除时，按记号把两侧的层一起撤掉，各自回到
 *   原本的特性。取原生「互换、可保持、可被压制规则挡住」；放弃「换人前不还原」的回合制边界，改成一段可见窗口。
 *   同伴目标：共享的目标契约一次只能声明一侧（enemy／friend 二选一），本招取「对手」这一侧作为身份。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   reach     识别距离：特攻给出能对上多远，身高决定臂展，夹 3..12，并作为本招实际射程。
 *   tempo     起手：速度决定描出两份特性多快。
 *   aftercast 收招：特防决定披上新身份后站得多稳。
 *   window    对调存续：等级与特防决定这段交换维持多久，配置「久换」再延长。
 *   recharge  冷却：速度决定多久才能再对调一次；久换更贵、速换更便宜。
 *   glyphs    画面对数：特攻决定围绕两人升起的特性符数量，画面按它发射。
 * 配置 hold（久换／速换）双向取舍：久换把这段身份用满（存续 ×1.9）但冷却 ×1.3；速换出手便宜（冷却 ×0.9）、
 *   存续 ×0.7，适合先试一下对方的特性再换回来。存续与出手频率互相取舍。
 */
namespace PokemonSkills {
    actionParameters.define("skillswap", {
        reach: formula(
            F.base(5, "基础")
                .plus(F.stat("specialAttack").times(0.03).as("特攻"))
                .plus(F.body("height").times(1.2).as("体型"))
                .clamp(3, 12).round(1),
            "识别距离", { unit: " 格", description: "能对上多远之外那人的特性；特攻越高、身板越大够得越远。它也是本招实际射程的来源。" }),
        tempo: seconds(
            F.base(8, "基础").minus(F.stat("speed").times(0.03).as("速度")).clamp(4, 12).round(0),
            "起手", "描出两份特性并对调需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(6, "基础").plus(F.stat("specialDefence").times(0.01).as("特防")).clamp(4, 10).round(0),
            "收招", "换上新身份后的收势；特防越高压得越稳。"),
        window: seconds(
            F.base(600, "基础").plus(F.level().times(6).as("等级")).plus(F.stat("specialDefence").times(1.2).as("特防"))
                .times(F.when(F.pref("hold", text("worldcombat.skill.skillswap.preference.hold")), F.const(1.9), F.const(0.7)).as("对调深浅"))
                .clamp(300, 6000).round(0),
            "对调存续", "这段身份对调维持多久；等级与特防越高越久，久换再 ×1.9、速换 ×0.7。窗口走完自动换回原本的特性。"),
        recharge: seconds(
            F.base(80, "基础").minus(F.stat("speed").times(0.28).as("速度"))
                .times(F.when(F.pref("hold", text("worldcombat.skill.skillswap.preference.hold")), F.const(1.3), F.const(0.9)).as("对调深浅"))
                .clamp(40, 130).round(0),
            "冷却", "两次对调之间的等待；速度快的个体恢复快，久换 ×1.3、速换 ×0.9。PP 10 的代价。"),
        glyphs: formula(
            F.base(6, "基础").plus(F.stat("specialAttack").div(50).as("特攻")).clamp(6, 18).round(0),
            "画面对数", { visible: false, unit: " 条", description: "围绕两人升起的特性符数量；特攻越高越密，画面按它发射。" })
    });

    stages("skillswap", [{ level: 40, values: { window: 800, recharge: 70 } }, { level: 55, values: { window: 1000, recharge: 60 } }]);

    describe("skillswap", [
        { key: "world", values: ["window"] },
        { key: "description.0", values: ["reach", "window"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "hold.on", values: [], when: function (context) { return read(context.detail.values, ["hold"]) === true; } },
        { key: "hold.off", values: [], when: function (context) { return read(context.detail.values, ["hold"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.recharge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.recharge"] }
    ]);
}
