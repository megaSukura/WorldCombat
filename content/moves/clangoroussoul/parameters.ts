/**
 * 魂舞烈音爆 / clangoroussoul 的参数与描述。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Status、Dragon、PP 5、sound＋dance；生命不足 33% 不能使用；
 * 消耗 33% 最大生命，把攻击、防御、特攻、特防、速度各提高 1 级。
 *
 * 翻译：把「一次付 33%、五项各 +1」摊成一支可以被打断的战舞——一拍一拍地烧生命、抬五项、向外荡出
 * 声波；被打断时已抬起的等级留下，但后面的拍数不再发生。每一拍的生命代价由配置决定（连唱每拍更便宜、
 * 总价更高）。拍与拍之间的间隔由**速度**决定（快个体舞得更急，暴露时间更短）；声波半径由**碰撞箱高度**
 * 决定（身板越大传得越远）。生命保底由 `ai.reserveHealth` 提供，付不起下一拍就提前收势。
 * 无伤害段：这是增益的 Status 招，走能力等级载体。
 */
namespace PokemonSkills {
    actionParameters.define("clangoroussoul", {
        /** 拍数：连唱配置下两拍。 */
        beats: formula(
            F.when(F.pref("extended"), F.const(2), F.const(1)),
            "拍数", {
                base: 1, unit: "拍",
                description: "这支舞分几拍；每一拍各支付一次生命、各抬一次五项。"
            }),
        /** 每拍生命代价：最大生命的比例。 */
        costPerBeat: formula(
            F.base(0.3).times(F.when(F.pref("extended"), F.const(0.68), F.const(1))).clamp(0.12, 0.34).round(3),
            "每拍生命", {
                base: 0.3, presentation: "percent", format: function (value: number) { return String(Math.round(value * 10000) / 100) + "%"; },
                description: "每一拍从最大生命里扣除的比例；连唱时每拍更便宜，但总价更高。"
            }),
        /** 每拍提升：各能力提高的等级数。 */
        rise: n(1, "每拍提升", "级", "每一拍把攻击、防御、特攻、特防、速度各提高这么多级。"),
        /** 拍间隔：速度越快舞得越急。 */
        interval: seconds(
            F.base(14).minus(F.stat("speed").minus(60).max(0).times(0.03)).clamp(7, 16).round(0),
            "拍间隔",
            "两拍之间相隔多久；速度越高越快，暴露时间越短。"),
        /** 声波半径：身板越大传得越远。 */
        pulseRadius: formula(
            F.base(3).plus(F.body("height").times(0.8)).clamp(2.5, 6).round(2),
            "声波半径", {
                base: 4.1, unit: "格",
                description: "每一拍向外荡开的声波半径；碰撞箱越高，声音传得越远。"
            })
    });

    stages("clangoroussoul", [
        { level: 30, values: { prepare: 12, recover: 10, cooldown: 84 } },
        { level: 50, values: { prepare: 10, recover: 8, cooldown: 72 } }
    ]);

    describe("clangoroussoul", [
        { key: "description.0", values: ["costPerBeat","beats","rise"] },
        { key: "description.1", values: ["interval"] },
        { key: "timing", values: ["prepare","recover","cooldown"] }
    ]);
}
