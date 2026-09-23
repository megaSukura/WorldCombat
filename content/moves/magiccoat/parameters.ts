/**
 * 魔法反射 / magiccoat —— 参数与数值来源。
 *
 * 原生事实（Showdown / Cobblemon 1.8）：Psychic／变化／威力 —／命中必中／PP 15／优先度 +4／目标 self；
 *   进入 volatile `magiccoat`，`onTryHit` 把朝着自己来的、带原生 `reflectable` 旗标的招式（异常状态招、
 *   寄生种子等）挡下并原样打回使用者（`useMove(newMove, target, source)`）。
 *
 * 核心念头：在身前铺一层会弯光的膜，把朝着自己递过来的状态招原路弹回去。它不改自己的数值，只改变归属。
 * 世界化：一扇预提交窗口。起手后膜撑开 `window` 刻；期间任何朝着施法者提交的、带 reflectable 旗标的招式
 *   会被顶回去，同一刻由本单元经 `NativeLoadout.call` 把那一手对着原施放者放出去。窗口没接到东西就收膜、不结账。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   coatReach 反射距离：特攻给出能读到的范围，身高决定膜的跨度，夹 4..15，并作为本招注册射程。
 *   tempo     起手：速度决定膜升起多快。
 *   window    膜持续：等级与特防决定膜能撑多久。
 *   recharge  冷却：速度决定多久能再撑一次。
 *   facets    膜面数：特攻决定画面里铺开的膜面与折返光点数量。
 * 配置 sweep（广膜／窄膜）双向取舍：广膜把反射距离 ×1.3，但膜更薄（持续 ×0.8）、起手 +2 刻、冷却 ×1.1；
 *   窄膜距离 ×0.8、起手 −1 刻、冷却 ×0.9，但膜更持久（×1.2）。挡得远与等得久各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("magiccoat", {
        coatReach: formula(
            F.base(7, "基础")
                .plus(F.stat("specialAttack").times(0.025).as("特攻"))
                .plus(F.body("height").times(1.2).as("体型"))
                .times(F.when(F.pref("sweep"), F.const(1.3), F.const(0.8)).as("膜幅"))
                .clamp(4, 15).round(1),
            "反射距离", {
                unit: " 格",
                description: "膜能读到并弹回多远之外递来的状态招；特攻越高、身板越大读得越远，广膜再 ×1.3。"
            }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").times(0.035).as("速度"))
                .plus(F.when(F.pref("sweep"), F.const(2), F.const(-1)).as("膜幅"))
                .clamp(3, 14).round(0),
            "起手", "把膜撑起来需要多久；速度越快越短，广膜多花 3 刻。"),
        window: seconds(
            F.base(110, "基础").plus(F.level().times(1.1).as("等级")).plus(F.stat("specialDefence").times(0.5).as("特防"))
                .times(F.when(F.pref("sweep"), F.const(0.8), F.const(1.2)).as("膜幅"))
                .clamp(60, 340).round(0),
            "膜持续", "这层膜能撑多久；这段时间里朝你来的可反射招式会被弹回。等级与特防越高越久，窄膜再 ×1.2。"),
        recharge: seconds(
            F.base(80, "基础").minus(F.stat("speed").times(0.25).as("速度"))
                .times(F.when(F.pref("sweep"), F.const(1.1), F.const(0.9)).as("膜幅"))
                .clamp(30, 130).round(0),
            "冷却", "两次撑膜之间的等待；速度快的个体恢复快，广膜略贵。"),
        facets: formula(
            F.base(8, "基础").plus(F.stat("specialAttack").div(50).as("特攻")).clamp(8, 20).round(0),
            "膜面数量", {
                unit: " 面",
                description: "身前铺开的膜面与折返光点数量；特攻越高越密，画面按它发射。"
            })
    });

    stages("magiccoat", [{ level: 40, values: { coatReach: 9.6, window: 220 } }, { level: 55, values: { coatReach: 10.8, window: 270 } }]);

    describe("magiccoat", [
        { key: "description.0", values: ["window", "tempo"] },
        { key: "description.1", values: ["coatReach", "range"] },
        { key: "description.2", values: ["recharge"] },
        { key: "sweep.on", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) === true; } },
        { key: "sweep.off", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.coatReach", "tier.0.window"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.coatReach", "tier.1.window"] }
    ]);
}
