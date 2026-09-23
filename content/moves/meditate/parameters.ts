/**
 * 瑜伽姿势 / meditate —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic、变化、威力 —、命中必中、PP 40、优先度 0、目标 self、
 *   boosts { atk: +1 }；isNonstandard Past。
 *
 * 核心念头：站定、闭息，把一圈圈气沉到身体深处，把那里睡着的力一层层叫醒。
 * 翻译：把「唤醒身体深处沉睡的力量」落成一段**越静越深的唤醒**——最近没有被打扰时，能一路叫到更深处
 *   （物攻 +2），正被追打时只叫醒表层（物攻 +1）。取原生「物攻 +1、Psychic、目标自己、PP 40」；
 *   放弃回合制里永久保留又立刻结算的回合，改成即时世界里一段真实花时间的静心：起手长、站在原地，
 *   换来的是唤醒本身的深度。唤醒的力不会自己褪去（与棱角化相反，那个会收）。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实，分散到不同参数上）：
 *   gift       唤醒级数：基线 1 级；最近 `hurtAgo ≥ 门槛` 时再多叫 1 级；夹 1..2。
 *   stillness  入静窗口：基础 260 刻 + 等级×4 + 特防×0.4；深长呼吸 ×1.4；夹 200..640。也是身上「入静」标记的时长。
 *   motes      灵光点数：基础 14 + 特攻×0.08；夹 12..44。特攻越高，唤醒时浮起的灵光越多。
 *   spread     灵环半径：基础 0.9 格 + 碰撞箱高度×0.4；夹 0.8..1.8。身板越高，脚下的灵环铺得越开。
 *   tempo      静心：基础 14 刻 − 速度×0.03；深长呼吸 +2；夹 8..20。这招是要真正站住的慢功。
 *   aftercast  收息：基础 8 刻 + 碰撞箱高度×1.2；夹 8..13。
 *   wait       冷却：基础 110 刻 − 等级×0.6；深长呼吸 +10；夹 70..130。PP 40 的代价。
 * 配置 deepBreath（深长呼吸）双向取舍：开＝多花力气慢慢呼吸，入静窗口 ×1.4、静 3 秒（60 刻）就能多唤醒一级，
 *   代价是起手 +2 刻、冷却 +10；关＝坐得更快、冷却更短，但要连着静 7 秒（140 刻）才多叫得动一级。
 *   两向各有适用局面：开适合开战前留出的安静窗口，关适合被打断后快速起身。
 */
namespace PokemonSkills {
    /** 深长呼吸与普通呼吸各自的「最近未受伤」门槛（刻），公式与说明读同一个常量。 */
    export const meditateCalmDeep = 60;
    export const meditateCalmBase = 140;

    actionParameters.define("meditate", {
        /** 唤醒级数：安静时多叫一级。 */
        gift: formula(
            F.base(1).plus(F.when(F.actor("hurtAgo", text("worldcombat.skill.meditate.value.sinceHurt"))
                .gte(F.when(F.pref("deepBreath", text("worldcombat.skill.meditate.preference.deepBreath")),
                    F.const(meditateCalmDeep), F.const(meditateCalmBase))), F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "唤醒级数", {
                unit: " 级",
                description: "瑜伽姿势把物攻叫醒多少级；最近没有被打扰时能叫到 2 级，正被追打只叫醒 1 级。"
            }),
        /** 入静窗口：唤醒的力在身上的可见时长。 */
        stillness: seconds(
            F.base(260).plus(F.level().times(4)).plus(F.stat("specialDefence").times(0.4))
                .times(F.when(F.pref("deepBreath", text("worldcombat.skill.meditate.preference.deepBreath")), F.const(1.4), F.const(1)))
                .clamp(200, 640).round(0),
            "入静窗口", "唤醒之后「入静」标记在身上的时长；等级与特防越高越久，深长呼吸再 ×1.4。物攻等级不随它褪去。"),
        /** 灵光点数：特攻越高，唤醒时浮起的灵光越多。 */
        motes: formula(
            F.base(14).plus(F.stat("specialAttack").times(0.08)).clamp(12, 44).round(0),
            "灵光点数", {
                unit: " 点",
                description: "唤醒时从体内浮起的灵光数量；特攻越高越多，粒子按它发射。"
            }),
        /** 灵环半径：身板越高铺得越开。 */
        spread: formula(
            F.base(0.9).plus(F.body("height").times(0.4)).clamp(0.8, 1.8).round(2),
            "灵环半径", {
                unit: " 格",
                description: "脚下灵环的半径；碰撞箱越高大铺得越开，地上的环与判定同径。"
            }),
        /** 静心：这招真正花时间的部分。 */
        tempo: seconds(
            F.base(14).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("deepBreath", text("worldcombat.skill.meditate.preference.deepBreath")), F.const(2), F.const(0)))
                .clamp(8, 20).round(0),
            "静心", "站定下来、把气沉到底需要多久；速度越快越短，深长呼吸要更久。"),
        /** 收息：身板越高大越慢。 */
        aftercast: seconds(
            F.base(8).plus(F.body("height").times(1.2)).clamp(8, 13).round(0),
            "收息", "唤醒之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(110).minus(F.level().times(0.6))
                .plus(F.when(F.pref("deepBreath", text("worldcombat.skill.meditate.preference.deepBreath")), F.const(10), F.const(0)))
                .clamp(70, 130).round(0),
            "冷却", "两次静心之间的等待；等级越高越短，深长呼吸更长。PP 40 的代价。")
    });

    stages("meditate", [
        { level: 30, values: { stillness: 340, wait: 96 } },
        { level: 50, values: { stillness: 420, wait: 82 } }
    ]);

    describe("meditate", [
        { key: "description.0", values: ["gift"] },
        { key: "description.1", values: ["stillness"] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deepBreath"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deepBreath"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.stillness", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.stillness", "tier.1.wait"] }
    ]);
}
