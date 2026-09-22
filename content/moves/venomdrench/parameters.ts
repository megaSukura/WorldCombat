/**
 * 毒液陷阱 / venomdrench 的参数与数值来源。
 *
 * 原生事实：Poison、变化、威力 0、命中 100、PP 20、目标 allAdjacentFoes（相邻全体）、
 *   onHit：若目标处于 psn／tox，则 boosts { atk: -1, spa: -1, spe: -1 }；否则不产生任何效果。
 *
 * 翻译：把「将特殊的毒液泼向对手」翻成以自身为圆心**泼出一整圈黏稠毒液**。只有已经被毒浸透的人才会被这层
 *   毒液黏住手脚与喉咙，攻击、特攻、速度一起变钝；没中毒的人只是被淋湿一层、毫发无伤（画面里会读出来）。
 * 取原生「相邻全体、只对中毒者生效、三项各 −1、PP 20」；放弃回合制里的单体／相邻判定——即时世界里以自身
 *   为中心的圈更符合「泼向身边所有人」的读法。它是这一族里唯一**只对对手生效**、且唯一以对方中毒状态为门槛的招。
 *
 * 数值来源（每一项读不同的精灵数据或现场事实，分散到不同参数）：
 *   drop   基础 1 级；配置「深泼」2 级；夹 1..2：毒液越浓，削得越狠。
 *   spread 基础 3.0 格 + 碰撞箱宽度 ×1.2；深泼 ×0.8／浅泼 ×1.25；夹 2.0..7.5：深泼更近更狠，浅泼更宽更省。
 *   drops  基础 20 + 特攻 ×0.3，夹 16..64：特攻越高，泼出的毒滴越密。
 *   spray  基础 0.14 格/刻 + 速度 /1500，夹 0.1..0.3：速度决定毒液泼得多急。
 *   linger 基础 100 刻 + 等级 ×2，夹 80..220：中毒者身上「被淋透」的印记留多久。
 *   tempo  基础 7 刻 − 速度偏移；深泼 +2；夹 4..13。
 *   aftercast 基础 5 刻 + 碰撞箱高度 ×1.2，夹 5..9。
 *   wait   基础 70 刻 − 等级 ×0.4；深泼 +12；夹 50..110。PP 20 的代价。
 * 配置 deep（深泼）：开启＝三项各 −2、但圈更小、起手与冷却更长；关闭（浅泼）＝各 −1、圈更大更省。
 *   两向各有局面：贴着少数硬目标深泼 vs 在人群里广泼。
 */
namespace PokemonSkills {
    actionParameters.define("venomdrench", {
        /** 削弱级数：深泼 2 级／浅泼 1 级。 */
        drop: formula(
            F.when(F.pref("deep", text("worldcombat.skill.venomdrench.preference.deep")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "削弱级数", {
                unit: " 级",
                description: "中毒者被毒液黏住后，攻击、特攻、速度各下降多少级；原生「都会降低」的对位。"
            }),
        /** 泼洒半径：身板越大铺得越开，深泼更近。 */
        spread: formula(
            F.base(3.0).plus(F.body("width").times(1.2))
                .times(F.when(F.pref("deep", text("worldcombat.skill.venomdrench.preference.deep")), F.const(0.8), F.const(1.25)))
                .clamp(2.0, 7.5).round(2),
            "泼洒半径", {
                unit: " 格",
                description: "以自身为圆心、毒液能泼到多远；身板越大铺得越开，深泼更近、浅泼更宽。画面里的毒环就是判定范围。"
            }),
        /** 毒滴数量：特攻派生。 */
        drops: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.3)).clamp(16, 64).round(0),
            "毒滴数量", {
                unit: " 滴",
                description: "一圈泼出的毒滴粒子总数；特攻越高越密，画面里的数量与机制一致。"
            }),
        /** 泼洒速度：速度决定。 */
        spray: formula(
            F.base(0.14).plus(F.stat("speed").div(1500)).clamp(0.1, 0.3).round(3),
            "泼洒速度", {
                unit: " 格/刻",
                description: "毒液离体后向外泼开的速度；速度越高泼得越急。"
            }),
        /** 印记时长：等级决定。 */
        linger: seconds(F.base(100).plus(F.level().times(2)).clamp(80, 220).round(0),
            "印记时长", "中毒者身上「被淋透」的印记留多久；等级越高留得越久。"),
        /** 起式：速度决定抬手多快，深泼更慢。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.venomdrench.preference.deep")), F.const(2), F.const(0)))
                .clamp(4, 13).round(0),
            "起式", "抬手、把毒液泼出去需要多久；速度越高越快，深泼多花 2 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 9).round(0),
            "收招", "泼完的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练，深泼更长。 */
        wait: seconds(
            F.base(70).minus(F.level().times(0.4))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.venomdrench.preference.deep")), F.const(12), F.const(0)))
                .clamp(50, 110).round(0),
            "冷却", "两次泼毒之间的等待；等级越高越短，深泼更长。PP 20 的代价。")
    });

    stages("venomdrench", [
        { level: 30, values: { wait: 62 } },
        { level: 50, values: { wait: 54 } }
    ]);

    describe("venomdrench", [
        { key: "description.0", values: ["drop", "spread"] },
        { key: "description.1", values: ["drops", "spray"] },
        { key: "deep.on", values: ["drop"], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wait"] }
    ]);
}
