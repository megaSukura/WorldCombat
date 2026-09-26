/**
 * 扎根 / ingrain —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Grass、变化、威力 —、命中必中、PP 20、优先度 0、目标 self；
 *   命中挂 volatile `ingrain`，onResidual 回复 baseMaxhp/16；onTrapPokemon 钉住自己、`isGrounded` 为真、无法被换走。
 *
 * 核心念头：从脚底把根须插进土里，就地钉住自己；此后每一拍沿着这些根从地里抽上一点生机，回一口血。
 * 翻译：取原生「每回合回 1/16、Grass、目标自己、PP 20」；把「不能替换宝可梦」翻成即时世界里真正的**钉在原地**
 *   （共享 rooted：移速归零、被推也不走）。地块不替换：根须是插进脚下地面的表现与判定，回血不依赖改方块。
 *   与水流环的分别：水流环是一条可以边走边挂的续航线；扎根是把自己钉死在一块地上换来的更耐久的小口回血。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   pulse     每拍回血：基础 1/16（0.0625）+ 特防×0.0004；深扎 ×1.1；夹 0.045..0.10。
 *   interval  回血间隔：基础 60 刻 − 速度×0.06；深扎 ×1.2；夹 40..80。速度快的个体抽得更勤。
 *   rootTicks 扎根时长：基础 320 刻 + 等级×4 + 特防×0.8；深扎 ×1.3；夹 200..800。
 *   roots     根须数：基础 12 + 体重/30 + 等级×0.15；夹 10..36。身体越沉，扎出的根越多。
 *   radius    根域半径：基础 0.8 格 + 碰撞箱宽度×0.6；夹 0.7..1.8。身板越宽，脚下盘住的土越多。
 *   tempo     起手：基础 8 刻 − 速度×0.02；夹 5..12。
 *   aftercast 收招：基础 8 刻 + 碰撞箱高度×1.0；夹 8..12。
 *   wait      冷却：基础 140 刻 − 等级×0.6；深扎 +20；夹 90..180。PP 20 的代价。
 * 配置 deep（深扎）双向取舍：开＝回得更多（每拍 ×1.1）、扎得更久（窗口 ×1.3），代价是间隔 ×1.2 且冷却 +20；
 *   关＝标准扎根，回得稍少但更勤、更快能再扎。两向各有局面：长线阵地战选深扎，快打快收选标准。
 */
namespace PokemonSkills {
    actionParameters.define("ingrain", {
        /** 每拍回血：特防决定根须抽得多足。 */
        pulse: percent(
            F.base(0.0625).plus(F.stat("specialDefence").times(0.0004))
                .times(F.when(F.pref("deep", text("worldcombat.skill.ingrain.preference.deep")), F.const(1.1), F.const(1)))
                .clamp(0.045, 0.10),
            "每拍回血", "每隔一拍沿根须回复的最大生命比例；特防越高抽得越足，深扎再 ×1.1。"),
        /** 回血间隔：速度决定抽得多勤。 */
        interval: seconds(
            F.base(60).minus(F.stat("speed").times(0.06))
                .times(F.when(F.pref("deep", text("worldcombat.skill.ingrain.preference.deep")), F.const(1.2), F.const(1)))
                .clamp(40, 80).round(0),
            "回血间隔", "根须每隔多久抽上来一口；速度越快越密，深扎更慢。"),
        /** 扎根时长：等级与特防撑住根。 */
        rootTicks: seconds(
            F.base(320).plus(F.level().times(4)).plus(F.stat("specialDefence").times(0.8))
                .times(F.when(F.pref("deep", text("worldcombat.skill.ingrain.preference.deep")), F.const(1.3), F.const(1)))
                .clamp(200, 800).round(0),
            "扎根时长", "根须在土里扎多久；等级与特防越高越久，深扎再 ×1.3。走完或被清除即拔根。"),
        /** 根须数：体重与等级决定一次扎出多少。 */
        roots: formula(
            F.base(12).plus(F.body("weight").div(30)).plus(F.level().times(0.15)).clamp(10, 36).round(0),
            "根须数", {
                unit: " 条",
                description: "从脚底扎进土里的根须数量；身体越沉、等级越高越多，粒子按它发射。"
            }),
        /** 根域半径：身板越宽盘得越开。 */
        radius: formula(
            F.base(0.8).plus(F.body("width").times(0.6)).clamp(0.7, 1.8).round(2),
            "根域半径", {
                unit: " 格",
                description: "脚下被根须盘住的地面半径；碰撞箱越宽盘得越开，也是根环表现与治疗判定参考的范围。"
            }),
        /** 起手：速度决定扎根多快。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").times(0.02)).clamp(5, 12).round(0),
            "起手", "把根须扎进土里需要多久；速度越快越短。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(8).plus(F.body("height").times(1.0)).clamp(8, 12).round(0),
            "收招", "扎定之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(140).minus(F.level().times(0.6))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.ingrain.preference.deep")), F.const(20), F.const(0)))
                .clamp(90, 180).round(0),
            "冷却", "两次扎根之间的等待；等级越高越短，深扎更长。PP 20 的代价。")
    });

    stages("ingrain", [
        { level: 45, values: { rootTicks: 460 } },
        { level: 60, values: { rootTicks: 560 } }
    ]);

    describe("ingrain", [
        { key: "description.0", values: ["pulse","interval"] },
        { key: "description.1", values: ["rootTicks"] },
        { key: "description.2", values: ["tempo","aftercast","wait"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rootTicks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.rootTicks"] }
    ]);
}
