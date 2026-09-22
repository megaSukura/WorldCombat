/**
 * 隐形岩 / stealthrock 的参数与伤害段。
 *
 * 原生事实：Rock／变化／威力 0／命中 必中／PP 20／target foeSide。出场即触发，伤害 = maxhp × 2^typeMod / 8，
 *   其中 typeMod 是**岩属性对该生物的相性**（夹 −6..6）：四倍弱岩吃 1/2 最大生命，抗岩只吃 1/16。
 *   与撒菱不同，隐形岩**不检查是否落地**——只要走进来，浮在半空的岩石一样砸；且伤害几乎不看目标防御。
 *
 * 世界化：把「在对手周围悬浮无数岩石」翻成**一片悬浮在空中的石阵**——施法者抬手把碎石抬到选定的地点，
 *   碎石悬在那里缓缓浮沉（`WorldEffects.field`，规则 `world_combat:hazard/stealthrock`）；谁进入这片空域
 *   就被砸一次，留在里面过一会儿再被砸。它不要求目标落地，所以飞行的、跳起来的都躲不掉；砸伤走岩属性，
 *   相性由共享结算按目标的属性算出——越怕岩吃到的越重，这正是隐形岩的身份。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数上）：
 *   fall           每次砸伤威力：特攻偏移 + 等级偏移；沉岩 ×1.3 / 浮岩 ×0.8；夹 18..74。
 *   fieldRadius    石阵半径：身高（抬得高、罩得宽）＋特攻；沉岩 ×0.85 / 浮岩 ×1.2；夹 1.8..4.6。
 *   stoneTicks     石阵存在时长：等级 ＋ HP；沉岩 ×1.3 / 浮岩 ×0.9；夹 120..420。
 *   stoneInterval  留在石阵里的再砸间隔：速度（越快越密）；夹 18..44。
 *   reach          抬石距离：特攻与等级；夹 7..13，也是实际射程。
 *   raiseSpeed     抬石速度：速度。
 *   stones         悬浮石数：特攻；它同时是画面里石块与碎屑的数量。
 *   tempo          起手：速度；沉岩 +3 刻、浮岩 −2 刻。
 *   recharge       冷却：特攻；沉岩 ×1.08 / 浮岩 ×0.95。
 *
 * 配置 `heavy`（沉岩）双向取舍：开启＝每次砸伤 ×1.3、存在更久，但石阵收窄、起手 +3 刻、冷却更长，且碎石
 *   沉到地面只砸落地目标；关闭＝浮岩式，石阵铺宽 1.2 倍、起手更快，且**连飞行目标一起砸**，代价是每次 ×0.8、
 *   存在更短。要让空中的敌人也躲不掉就开浮岩，要砸出一记重的就开沉岩。
 *
 * 伤害段 `fall` 是 Rock／特殊，`defenceCoefficient` 调低到 0.0015，让岩属性相性（而不是目标防御）主导结果，
 * 贴近原生「按相性吃最大生命比例」的身份。公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const stealthrockId = "stealthrock";
    export const stealthrockRule = "world_combat:hazard/stealthrock";
    export const stealthrockScene = "world_combat:move_stealthrock";
    export const stealthrockRaiseText = "world_combat.move.stealthrock.text.raise";
    export const stealthrockHitText = "world_combat.move.stealthrock.text.hit";

    actionParameters.define(stealthrockId, {
        fall: formula(
            F.base(26)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-8, 28))
                .plus(F.level().minus(25).times(0.24).clamp(0, 10))
                .times(F.when(F.pref("heavy"), F.const(1.3), F.const(0.8)))
                .clamp(18, 74).round(1),
            "每次砸伤威力", {
                unit: "威力",
                description: "一块悬浮岩石砸下来的威力；特攻与等级越高越重，沉岩式再抬三成。岩属性相性在命中时由共享结算按目标的属性算出。"
            }),
        fieldRadius: formula(
            F.base(2.6)
                .plus(F.body("height").minus(1.4).times(0.9).clamp(-0.3, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.005).clamp(-0.3, 0.7))
                .times(F.when(F.pref("heavy"), F.const(0.85), F.const(1.2)))
                .clamp(1.8, 4.6).round(2),
            "石阵半径", {
                unit: "格",
                description: "碎石悬浮覆盖的半径；身高与特攻越高罩得越宽，浮岩式铺得更开。它也是指示圈与实际判定半径。"
            }),
        stoneTicks: seconds(
            F.base(200).plus(F.level().minus(25).times(2.2).clamp(0, 80)).plus(F.stat("hp").minus(60).times(0.25).clamp(-16, 34))
                .times(F.when(F.pref("heavy"), F.const(1.3), F.const(0.9)))
                .clamp(120, 420).round(0),
            "石阵存在时长", "一片悬浮石阵在世界上留多久；等级与 HP 越高留得越久，沉岩式更耐放。"),
        stoneInterval: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6)).clamp(18, 44).round(0),
            "再砸间隔", "还留在石阵里的人每隔多久被再砸一次；速度越快砸得越密。"),
        reach: formula(
            F.base(9)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.level().minus(25).times(0.05).clamp(0, 2))
                .clamp(7, 13).round(2),
            "抬石距离", {
                unit: "格",
                description: "能把石阵抬到多远的地点；特攻与等级越高够得越远。它也是本招的实际射程。"
            }),
        raiseSpeed: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.15, 0.4)).clamp(0.75, 1.5).round(2),
            "抬石速度", {
                unit: "格/刻",
                description: "碎石飞向落点的速度；速度快的个体抬得更急，目标更难在石阵成形前走开。"
            }),
        stones: formula(
            F.base(18).plus(F.stat("specialAttack").times(0.16)).clamp(14, 44).round(0),
            "悬浮石数", {
                unit: "块",
                description: "石阵里有多少块碎石悬浮着；特攻越高越多，也是画面里石块与碎屑的数量。"
            }),
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("heavy"), F.const(3), F.const(-2)))
                .clamp(6, 16).round(0),
            "起手", "把碎石抬起来需要多久；速度越快越短，沉岩 +3 刻、浮岩 −2 刻。"),
        recharge: seconds(
            F.base(110).minus(F.stat("specialAttack").minus(60).times(0.2).clamp(-10, 20))
                .times(F.when(F.pref("heavy"), F.const(1.08), F.const(0.95)))
                .clamp(60, 180).round(0),
            "冷却", "两次抬石之间的等待；特攻越高回得越快，沉岩 ×1.08、浮岩 ×0.95。")
    });

    defineCategory(stealthrockId, "special");
    defineDamage(stealthrockId, "fall", { defenceCoefficient: 0.0015 });

    stages(stealthrockId, [
        { level: 45, values: { fall: 40, fieldRadius: 3.0 } }
    ]);

    describe(stealthrockId, [
        { key: "description.0", values: ["fall"] },
        { key: "description.1", values: ["fieldRadius", "stoneTicks", "stoneInterval"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fall", "tier.0.fieldRadius"] }
    ]);
}
