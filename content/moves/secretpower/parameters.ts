/**
 * 秘密之力 / secretpower —— 参数与伤害段。
 *
 * 核心念头：一记贴身的借力短击，命中时把「脚下的场所」抽出来当武器——火边引燃、草木催眠、
 * 水与雨导电麻痹，其余靠一记直击。原生「根据使用场所不同，追加效果也会有所变化」在这里
 * 落成读取命中点的方块/流体/天气；原生基础 30% 麻痹保留为无条件直击的追加。
 *
 * 数值来源：原生 Normal/物理 70/命中 100/PP 20/接触；追加效果按场所变化，默认麻痹 30%。
 * 场所分支不产生额外倍率，只改变「抽到什么」；概率仍由特攻与配置决定。
 */
namespace PokemonSkills {
    actionParameters.define("secretpower", {
        // 借力短击：速度给步幅与出手，场所只改变追加效果。切到直击换取更高基础威力。
        power: formula(
            F.when(F.pref("plain", "直击形态"), F.const(74), F.const(62)).plus(F.stat("speed").minus(40).max(0).times(0.10)).clamp(40, 110).round(1),
            "威力", { unit: "威力", description: "借力基础较低；直击无视场所换取更高基础值。" }),
        // 追加概率：特攻越高越容易抽中场所材料；借力形态额外 +0.08，水/雨命中时再放大到接近必定。
        chance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(60).max(0).times(0.0008))
                .plus(F.when(F.pref("plain", "直击形态"), F.const(0), F.const(0.08))).clamp(0.15, 0.9),
            "追加概率", "水与雨中翻倍（上限 95%）。"),
        // 突进距离：速度决定这一步够得到多远。
        distance: formula(
            F.base(4.2).plus(F.stat("speed").minus(40).max(0).times(0.008)).clamp(3.4, 6.0).round(2),
            "突进距离", { unit: " 格", description: "越快借力步幅越大。" }),
        // 突进速度：手感由速度轻微带动。
        speed: formula(
            F.base(0.5).plus(F.stat("speed").minus(40).max(0).times(0.002)).clamp(0.35, 0.75).round(2),
            "突进速度", { unit: " 格/刻", description: "快个体贴得更急。" }),
        // 判定面：实时碰撞箱宽度决定借力面。
        collisionRadius: formula(
            F.base(0.30).plus(F.body("width").times(0.26)).clamp(0.28, 0.62).round(2),
            "判定半径", { unit: " 格", description: "身体越宽，借力面越大。" }),
        // 命中顶开：体重决定推距。
        push: formula(
            F.base(0.18).plus(F.body("weight").div(10).times(0.02)).clamp(0.12, 0.58).round(2),
            "命中顶开", { unit: " 格", description: "越重的个体推得越远。" }),
        traceAhead: hidden(2),
        minimumMove: hidden(0.05)
    });
    defineDamage("secretpower", "power", { defenceCoefficient: 0.004, rationale: "借力一击基础低、穿透略强，让场所与速度的差别更可见。" }, { contact: true });
    describe("secretpower", [
        { key: "description.0", values: ["power"] },
        { key: "description.1", values: ["chance"] },
        { key: "timing", values: ["prepare", "recover", "cooldown"] }
    ]);
}
