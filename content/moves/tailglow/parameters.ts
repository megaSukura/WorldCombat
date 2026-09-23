/**
 * 萤火 / tailglow 的参数与数值来源。
 *
 * 原生事实：Bug、变化、威力 —、命中必中、PP 20、目标 self、boosts { spa: +3 }。
 *
 * 翻译：把「凝视闪烁的光芒，集中自己的精神」翻成一次**凝神入定**——萤火似的光点从身上一颗颗亮起、
 * 缓缓明灭，使用者盯着那团光出神，越亮越静，最后光点一齐灭掉、精神落定，特攻猛涨。
 * 它是这一族里唯一只抬一项、却是唯一 +3 的招，也是唯一把自己的心神押在一层**会被打散的光**上的一招：
 * 窗口里挨到一记结实的攻击，光就散了，抬起来的特攻提前收回。
 * 取原生「特攻 +3、PP 20、纯自我强化」；放弃回合制里永久保留的等级——这里凝神是一段可见窗口。
 *
 * 数值来源（每一项读不同的精灵数据或现场事实，分散到不同参数）：
 *   gift    固定 3 级：原生「巨幅提高特攻」的对位，是这招的身份而不是成长点。
 *   beats   基础 2 + 特攻偏移，夹 2..4：心神越盛的个体凝神多走几拍。
 *   motes   基础 18 + 特攻 ×0.3 + 速度 ×0.1，夹 16..80：特攻与速度越高，光点越密。
 *   glow    基础 0.6 格 + 碰撞箱高度 ×0.35 + 碰撞箱宽度 ×0.5，夹 0.5..1.6：身板越大光环张得越开。
 *   drift   基础 0.04 + 速度 /2000，夹 0.03..0.1：越快的光点漂得越急。
 *   beat    基础 7 刻 − 速度偏移，夹 4..9：速度决定凝神节拍多急。
 *   span    基础 180 刻 + 等级 ×3 + 特攻 ×0.5；静心 ×1.25；夹 150..420：特攻越高撑得越久。
 *   poise   基础 4% 最大生命 + 特防偏移；静心 ×1.6；夹 2%..12%：特防越高，心神越经得起一记擦碰。
 *   tempo   基础 9 刻 − 速度偏移；静心 +3；夹 5..15。
 *   aftercast 基础 5 刻 + 碰撞箱高度 ×1.2，夹 5..9。
 *   wait    基础 96 刻 − 等级 ×0.5；静心 +14；夹 64..120。PP 20 的代价。
 * 配置 steady（静心）：开启＝窗口更长、走神阈值更高（挨一下不容易散），代价是起式 +3 刻、冷却 +14；
 *   关闭＝起手快、窗口短、光更容易被打散。两向各有局面（抢时间 vs 保收益）。
 */
namespace PokemonSkills {
    actionParameters.define("tailglow", {
        /** 凝神增益：原生特攻 +3。 */
        gift: formula(F.const(3), "凝神增益", {
            unit: " 级",
            description: "一次凝神把特攻抬高多少级；原生「巨幅提高特攻」的对位。"
        }),
        /** 凝神拍数：特攻越高走得越久。 */
        beats: formula(
            F.base(2).plus(F.stat("specialAttack").minus(60).div(70)).clamp(2, 4).round(0),
            "凝神拍数", {
                unit: " 拍",
                description: "一遍凝神走几拍；特攻越高，光点亮的拍子越多，画面里的层数也越多。"
            }),
        /** 光点数量：特攻与速度共同派生。 */
        motes: formula(
            F.base(18).plus(F.stat("specialAttack").times(0.3)).plus(F.stat("speed").times(0.1)).clamp(16, 80).round(0),
            "光点数量", {
                unit: " 点",
                description: "一遍凝神亮起的光点粒子总数；特攻与速度越高越密，画面里的数量与机制一致。"
            }),
        /** 光环半径：身板越大张得越开。 */
        glow: formula(
            F.base(0.6).plus(F.body("height").times(0.35)).plus(F.body("width").times(0.5)).clamp(0.5, 1.6).round(2),
            "光环半径", {
                unit: " 格",
                description: "光点悬停成环的半径；身板越大张得越开。判定与表现读同一个半径。"
            }),
        /** 光点漂浮：速度决定漂得多急。 */
        drift: formula(
            F.base(0.04).plus(F.stat("speed").div(2000)).clamp(0.03, 0.1).round(3),
            "光点漂浮", {
                unit: " 格/刻",
                description: "光点悬停时向外漂浮的速度；速度越高漂得越急。"
            }),
        /** 凝神节拍：速度决定多急。 */
        beat: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02)).clamp(4, 9).round(0),
            "凝神节拍", "两拍之间隔多久；速度越高走得越急。"),
        /** 凝神窗口：特攻留在身上的时长。 */
        span: seconds(
            F.base(180).plus(F.level().times(3)).plus(F.stat("specialAttack").times(0.5))
                .times(F.when(F.pref("steady", text("worldcombat.skill.tailglow.preference.steady")), F.const(1.25), F.const(1)))
                .clamp(150, 420).round(0),
            "凝神窗口", "这段凝神在身上的时长；等级与特攻越高撑得越久，静心再 ×1.25。窗口走完或被攻击打散时，特攻收回。"),
        /** 走神阈值：特防决定心神多稳。 */
        poise: percent(F.base(0.04).plus(F.stat("specialDefence").minus(60).times(0.0005).clamp(-0.02, 0.05))
            .times(F.when(F.pref("steady", text("worldcombat.skill.tailglow.preference.steady")), F.const(1.6), F.const(1)))
            .clamp(0.02, 0.12),
            "走神阈值", "窗口里单次挨到超过目标最大生命这个比例的攻击，光就散、特攻提前收回；特防越高越稳，静心翻倍。"),
        /** 起式：速度决定入定多快。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("steady", text("worldcombat.skill.tailglow.preference.steady")), F.const(3), F.const(0)))
                .clamp(5, 15).round(0),
            "起式", "收心、点起光芒需要多久；速度越高越快，静心多花 3 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 9).round(0),
            "收招", "光点落定后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(96).minus(F.level().times(0.5))
                .plus(F.when(F.pref("steady", text("worldcombat.skill.tailglow.preference.steady")), F.const(14), F.const(0)))
                .clamp(64, 120).round(0),
            "冷却", "两次凝神之间的等待；等级越高越短，静心更长。PP 20 的代价。")
    });

    stages("tailglow", [
        { level: 35, values: { wait: 88, span: 250 } },
        { level: 55, values: { wait: 74, span: 320 } }
    ]);

    describe("tailglow", [
        { key: "description.0", values: ["gift"] },
        { key: "description.1", values: ["span"] },
        { key: "description.2", values: ["poise"] },
        { key: "steady.on", values: [], when: function (context) { return read(context.detail.values, ["steady"]) === true; } },
        { key: "steady.off", values: [], when: function (context) { return read(context.detail.values, ["steady"]) !== true; } },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.span"] }
    ]);
}
